/**
 * Persist SHR consent / visit state (national visit_id + consent_token).
 */
const crypto = require('crypto');
const pool = require('../config/db');
const { getShrConfig } = require('./shrConsent');
const {
  listOpenVisits,
  requestShrConsent,
  verifyShrConsent,
  fetchShrPatientRecords,
  closeShrVisit,
  refreshShrVisit,
  resendShrConsentOtp,
} = require('./shrConsent');

const TOKEN_TTL_HOURS = Number(process.env.SHR_CONSENT_TOKEN_TTL_HOURS || 12);

function tokenExpiryDate() {
  const d = new Date();
  d.setHours(d.getHours() + TOKEN_TTL_HOURS);
  return d;
}

async function getActiveSessionForPatient(patientId) {
  const [rows] = await pool.execute(
    `SELECT sessionId, patientId, crId, facilityFrCode, visitType, visitId, consentId,
            consentStatus, medicalRecordId, consentTokenExpiresAt, createdAt, updatedAt
     FROM shr_visit_sessions
     WHERE patientId = ? AND consentStatus IN ('pending', 'approved', 'emergency')
     ORDER BY sessionId DESC LIMIT 1`,
    [Number(patientId)]
  );
  return rows[0] || null;
}

async function loadPatientShrContext(patientId) {
  const [rows] = await pool.execute(
    `SELECT patientId, nupi, idNumber, idType, linkedParentCrId
     FROM patients WHERE patientId = ? AND voided = 0 LIMIT 1`,
    [Number(patientId)]
  );
  const row = rows[0];
  if (!row?.nupi) {
    throw new Error('Patient has no NUPI (CR ID). Resolve Client Registry before SHR consent.');
  }
  let linkedParentCrId = row.linkedParentCrId ? String(row.linkedParentCrId).trim() : null;
  if (!linkedParentCrId) {
    try {
      const { resolveShaMemberCrForPatient } = require('./shaPatientMemberCr');
      const member = await resolveShaMemberCrForPatient(pool, row);
      linkedParentCrId = member.linkedParentCrId ? String(member.linkedParentCrId).trim() : null;
    } catch {
      /* optional CR refresh */
    }
  }
  const isDependantLike =
    Boolean(linkedParentCrId) || /birth certificate/i.test(String(row.idType || ''));
  return {
    crId: String(row.nupi),
    linkedParentCrId,
    isDependantLike,
  };
}

/**
 * Start or reuse SHR visit: open-visits → else POST /shr/consents.
 */
async function startShrVisit({
  patientId,
  visitType = 'OP',
  medicalRecordId = null,
  createdBy = null,
  practitionerPuid = null,
  emergency = false,
  incapacityReason = null,
  representativeCrId = null,
  representativeRelationship = null,
}) {
  const practitioner_id = practitionerPuid || undefined;
  const cfg = getShrConfig();
  const shrPatient = await loadPatientShrContext(patientId);
  const crId = shrPatient.crId;
  const autoRepresentative =
    !emergency &&
    !representativeCrId &&
    shrPatient.linkedParentCrId &&
    shrPatient.linkedParentCrId.toUpperCase() !== crId.toUpperCase()
      ? shrPatient.linkedParentCrId
      : null;
  const effectiveRepresentative =
    representativeCrId != null && String(representativeCrId).trim() !== ''
      ? String(representativeCrId).trim()
      : autoRepresentative;
  const repRelationship =
    representativeRelationship ||
    (effectiveRepresentative ? 'Principal' : null);

  const open = await listOpenVisits({ crId });
  const visits = open?.data?.visits || open?.data?.visit || [];
  if (Array.isArray(visits) && visits.length > 0) {
    const visitId = visits[0].visit_id || visits[0].visitId || visits[0].id;
    const [ins] = await pool.execute(
      `INSERT INTO shr_visit_sessions
       (patientId, crId, facilityFrCode, visitType, visitId, consentStatus, medicalRecordId, createdBy, consentTokenExpiresAt)
       VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?)`,
      [
        Number(patientId),
        crId,
        cfg.facilityFrCode,
        visitType,
        visitId ? String(visitId) : null,
        medicalRecordId ? Number(medicalRecordId) : null,
        createdBy,
        tokenExpiryDate(),
      ]
    );
    return {
      sessionId: ins.insertId,
      reusedOpenVisit: true,
      visitId,
      consentStatus: 'approved',
      message: 'Existing open SHR visit at facility',
    };
  }

  if (emergency) {
    const req = await requestShrConsent({
      crId,
      visit_type: visitType,
      emergency: 1,
      incapacity_reason: incapacityReason || 'Emergency presentation',
      practitioner_id,
    });
    const data = req.data || {};
    const [ins] = await pool.execute(
      `INSERT INTO shr_visit_sessions
       (patientId, crId, facilityFrCode, visitType, visitId, consentId, consentStatus,
        medicalRecordId, consentToken, consentTokenExpiresAt, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, 'emergency', ?, ?, ?, ?)`,
      [
        Number(patientId),
        crId,
        cfg.facilityFrCode,
        visitType,
        data.visit_id ? String(data.visit_id) : null,
        data.consent_id ? String(data.consent_id) : null,
        medicalRecordId ? Number(medicalRecordId) : null,
        data.consent_token || null,
        tokenExpiryDate(),
        createdBy,
      ]
    );
    return {
      sessionId: ins.insertId,
      emergency: true,
      visitId: data.visit_id,
      consentTokenIssued: Boolean(data.consent_token),
      message: data.message || 'Emergency consent recorded',
    };
  }

  const consentBody = { crId, visit_type: visitType, practitioner_id };
  if (effectiveRepresentative) {
    consentBody.representative_cr_id = effectiveRepresentative;
    consentBody.representative_relationship = repRelationship || 'Principal';
  }
  const req = await requestShrConsent(consentBody);
  const data = req.data || {};
  const [ins] = await pool.execute(
    `INSERT INTO shr_visit_sessions
     (patientId, crId, facilityFrCode, visitType, consentId, consentStatus, otpRecord, medicalRecordId, createdBy)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      Number(patientId),
      crId,
      cfg.facilityFrCode,
      visitType,
      data.consent_id ? String(data.consent_id) : null,
      data.otp_record ? String(data.otp_record) : null,
      medicalRecordId ? Number(medicalRecordId) : null,
      createdBy,
    ]
  );
  return {
    sessionId: ins.insertId,
    consentId: data.consent_id,
    otpRecord: data.otp_record,
    consentStatus: 'pending',
    representativeCrId: effectiveRepresentative || null,
    dependantConsent: Boolean(effectiveRepresentative),
    message:
      data.message ||
      (effectiveRepresentative
        ? 'OTP sent to household representative (parent/guardian)'
        : 'OTP sent to patient'),
  };
}

async function verifyShrVisitOtp({ sessionId, otp, consentDecision, rejectionReason }) {
  const [rows] = await pool.execute(
    `SELECT sessionId, consentId, otpRecord, patientId FROM shr_visit_sessions WHERE sessionId = ? LIMIT 1`,
    [Number(sessionId)]
  );
  const session = rows[0];
  if (!session?.consentId) throw new Error('Session missing consentId');

  const body = {
    otp: String(otp),
    otp_record: session.otpRecord,
    consent_decision: consentDecision,
    rejection_reason: rejectionReason,
  };
  if (consentDecision === 'Reject') {
    body.consent_decision = 'Reject';
  }

  const verified = await verifyShrConsent(session.consentId, body);
  const data = verified.data || {};

  if (consentDecision === 'Reject' || (!data.consent_token && data.status === 'Rejected')) {
    await pool.execute(
      `UPDATE shr_visit_sessions SET consentStatus = 'rejected', rejectionReason = ?, updatedAt = NOW() WHERE sessionId = ?`,
      [rejectionReason || data.message || 'Rejected', session.sessionId]
    );
    return { sessionId: session.sessionId, consentStatus: 'rejected', data };
  }

  await pool.execute(
    `UPDATE shr_visit_sessions SET consentStatus = 'approved', visitId = ?, consentToken = ?,
     consentTokenExpiresAt = ?, updatedAt = NOW() WHERE sessionId = ?`,
    [
      data.visit_id ? String(data.visit_id) : null,
      data.consent_token || null,
      tokenExpiryDate(),
      session.sessionId,
    ]
  );
  return {
    sessionId: session.sessionId,
    consentStatus: 'approved',
    visitId: data.visit_id,
    hasConsentToken: Boolean(data.consent_token),
    message: data.message,
  };
}

async function readShrRecordsForSession(sessionId, { resources } = {}) {
  const [rows] = await pool.execute(
    `SELECT sessionId, crId, consentToken, consentTokenExpiresAt, consentStatus
     FROM shr_visit_sessions WHERE sessionId = ? LIMIT 1`,
    [Number(sessionId)]
  );
  const session = rows[0];
  if (
    !session ||
    (session.consentStatus !== 'approved' && session.consentStatus !== 'emergency')
  ) {
    throw new Error('SHR session not approved');
  }
  if (!session.consentToken) {
    throw new Error('No consent token on session — verify OTP or use open visit refresh');
  }
  if (session.consentTokenExpiresAt && new Date(session.consentTokenExpiresAt) < new Date()) {
    throw new Error('Consent token expired — request new SHR consent');
  }

  return fetchShrPatientRecords({
    crId: session.crId,
    consentToken: session.consentToken,
    resources,
  });
}

async function attachMedicalRecord(sessionId, medicalRecordId) {
  await pool.execute(
    `UPDATE shr_visit_sessions SET medicalRecordId = ?, updatedAt = NOW() WHERE sessionId = ?`,
    [Number(medicalRecordId), Number(sessionId)]
  );
}

/** Link new HMIS visit to an approved national SHR session when present. */
async function attachMedicalRecordToActiveSession(patientId, medicalRecordId) {
  const session = await getActiveSessionForPatient(Number(patientId));
  if (!session) return null;
  if (session.consentStatus !== 'approved' && session.consentStatus !== 'emergency') {
    return null;
  }
  await attachMedicalRecord(session.sessionId, medicalRecordId);
  return session.sessionId;
}

async function loadSessionById(sessionId) {
  const [rows] = await pool.execute(
    `SELECT sessionId, patientId, crId, visitId, consentId, consentStatus, consentToken
     FROM shr_visit_sessions WHERE sessionId = ? LIMIT 1`,
    [Number(sessionId)]
  );
  return rows[0] || null;
}

async function markSessionClosed(sessionId) {
  await pool.execute(
    `UPDATE shr_visit_sessions SET consentStatus = 'closed', consentToken = NULL,
     consentTokenExpiresAt = NULL, updatedAt = NOW() WHERE sessionId = ?`,
    [Number(sessionId)]
  );
}

/**
 * POST /shr/visits/{visit_id}/close — immediate or OTP-gated.
 */
async function startCloseShrVisitSession(sessionId, { patientIncapable = false, incapacityReason } = {}) {
  const session = await loadSessionById(sessionId);
  if (!session?.visitId) {
    throw new Error('Session has no national visit_id — approve consent before closing');
  }
  if (session.consentStatus !== 'approved' && session.consentStatus !== 'emergency') {
    throw new Error('Only approved SHR visits can be closed');
  }

  const result = await closeShrVisit(session.visitId, {
    patientIncapable,
    incapacityReason,
  });
  const data = result.data || {};
  const endDate = data.end_date || data.visit_end_date || data.endDate;
  if (endDate) {
    await markSessionClosed(sessionId);
    return {
      sessionId,
      closed: true,
      endDate,
      message: data.message || 'Visit closed',
    };
  }

  return {
    sessionId,
    closed: false,
    needsCloseOtp: Boolean(data.otp_record),
    otpRecord: data.otp_record || null,
    consentId: session.consentId,
    message: data.message || 'Close OTP sent — verify to finish visit closure',
  };
}

async function verifyCloseShrVisitSession(sessionId, { otp, otpRecord }) {
  const session = await loadSessionById(sessionId);
  if (!session?.consentId) throw new Error('Session missing consentId');
  if (!otp || !otpRecord) throw new Error('otp and otpRecord (from close response) are required');

  const verified = await verifyShrConsent(session.consentId, {
    otp: String(otp),
    otp_record: String(otpRecord),
  });
  const data = verified.data || {};
  const endDate = data.end_date || data.visit_end_date || data.endDate;
  await markSessionClosed(sessionId);
  return {
    sessionId,
    closed: true,
    endDate: endDate || null,
    message: data.message || 'Visit closed',
  };
}

async function refreshShrVisitSession(sessionId) {
  const session = await loadSessionById(sessionId);
  if (!session?.visitId) throw new Error('Session has no visit_id');
  const refreshed = await refreshShrVisit(session.visitId);
  const data = refreshed.data || {};
  const token = data.consent_token || data.consentToken;
  if (token) {
    await pool.execute(
      `UPDATE shr_visit_sessions SET consentToken = ?, consentTokenExpiresAt = ?, updatedAt = NOW()
       WHERE sessionId = ?`,
      [token, tokenExpiryDate(), session.sessionId]
    );
  }
  return { sessionId, consentTokenRefreshed: Boolean(token), data };
}

async function resendShrVisitOtp(sessionId) {
  const session = await loadSessionById(sessionId);
  if (!session?.consentId) throw new Error('Session missing consentId');
  const resent = await resendShrConsentOtp(session.consentId);
  const data = resent.data || {};
  if (data.otp_record) {
    await pool.execute(
      `UPDATE shr_visit_sessions SET otpRecord = ?, consentStatus = 'pending', updatedAt = NOW()
       WHERE sessionId = ?`,
      [String(data.otp_record), session.sessionId]
    );
  }
  return { sessionId, otpRecord: data.otp_record || null, message: data.message || 'OTP resent' };
}

module.exports = {
  getActiveSessionForPatient,
  startShrVisit,
  verifyShrVisitOtp,
  readShrRecordsForSession,
  attachMedicalRecord,
  attachMedicalRecordToActiveSession,
  startCloseShrVisitSession,
  verifyCloseShrVisitSession,
  refreshShrVisitSession,
  resendShrVisitOtp,
};
