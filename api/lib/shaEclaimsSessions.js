/**
 * Persist national eClaims consent + visit ids (not SHR sessions).
 */
const pool = require('../config/db');
const { getShrConfig } = require('./shrConsent');

async function getActiveSessionForPatient(patientId) {
  const [rows] = await pool.execute(
    `     SELECT sessionId, patientId, crId, facilityFrCode, serviceType, subBenefitCode, interventionCode,
            contactId, otpRecord, consentToken, authGuid, nationalVisitId, preauthReference, claimReference,
            sessionStatus, medicalRecordId, lastError, rawResponseJson, createdAt, updatedAt
     FROM sha_eclaims_sessions
     WHERE patientId = ? AND sessionStatus IN ('draft', 'otp_sent', 'ready_for_visit', 'visit_active')
     ORDER BY
       CASE sessionStatus
         WHEN 'visit_active' THEN 0
         WHEN 'otp_sent' THEN 1
         WHEN 'ready_for_visit' THEN 2
         ELSE 3
       END,
       sessionId DESC
     LIMIT 1`,
    [Number(patientId)]
  );
  return rows[0] || null;
}

async function createOrUpdateDraft({
  patientId,
  crId,
  serviceType,
  subBenefitCode,
  interventionCode,
  medicalRecordId,
  createdBy,
}) {
  const cfg = getShrConfig();
  const facilityFrCode = cfg.facilityFrCode;
  if (!facilityFrCode) {
    throw new Error('SHR_FACILITY_FR_CODE not configured');
  }
  const existing = await getActiveSessionForPatient(patientId);
  if (existing && existing.sessionStatus !== 'visit_active') {
    await pool.execute(
      `UPDATE sha_eclaims_sessions
       SET serviceType = ?, subBenefitCode = ?, interventionCode = ?,
           medicalRecordId = COALESCE(?, medicalRecordId), updatedAt = NOW()
       WHERE sessionId = ?`,
      [
        String(serviceType || existing.serviceType),
        subBenefitCode || existing.subBenefitCode,
        interventionCode || existing.interventionCode,
        medicalRecordId != null ? Number(medicalRecordId) : null,
        existing.sessionId,
      ]
    );
    return getSessionById(existing.sessionId);
  }
  const [ins] = await pool.execute(
    `INSERT INTO sha_eclaims_sessions
     (patientId, crId, facilityFrCode, serviceType, subBenefitCode, interventionCode,
      sessionStatus, medicalRecordId, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [
      Number(patientId),
      String(crId),
      facilityFrCode,
      String(serviceType || 'OUTPATIENT'),
      subBenefitCode || null,
      interventionCode || null,
      medicalRecordId != null ? Number(medicalRecordId) : null,
      createdBy,
    ]
  );
  return getSessionById(ins.insertId);
}

async function getSessionById(sessionId) {
  const [rows] = await pool.execute(
    `     SELECT sessionId, patientId, crId, facilityFrCode, serviceType, subBenefitCode, interventionCode,
            contactId, otpRecord, consentToken, authGuid, nationalVisitId, preauthReference, claimReference,
            sessionStatus, medicalRecordId, lastError, rawResponseJson, createdAt, updatedAt
     FROM sha_eclaims_sessions WHERE sessionId = ? LIMIT 1`,
    [Number(sessionId)]
  );
  return rows[0] || null;
}

async function markBiometricsPending(sessionId, { authGuid, authorizationToken, iframeUrl, rawResponse }) {
  await pool.execute(
    `UPDATE sha_eclaims_sessions
     SET authGuid = COALESCE(?, authGuid),
         consentToken = COALESCE(?, consentToken),
         sessionStatus = 'ready_for_visit',
         lastError = NULL,
         rawResponseJson = COALESCE(?, rawResponseJson),
         updatedAt = NOW()
     WHERE sessionId = ?`,
    [
      authGuid ? String(authGuid) : null,
      authorizationToken ? String(authorizationToken) : null,
      rawResponse
        ? JSON.stringify({
            biometrics: true,
            iframeUrl: iframeUrl || null,
            ...(typeof rawResponse === 'object' ? rawResponse : { raw: rawResponse }),
          })
        : null,
      Number(sessionId),
    ]
  );
  return getSessionById(sessionId);
}

async function markOtpSent(sessionId, { contactId, otpRecord, rawOtpResponse }) {
  await pool.execute(
    `UPDATE sha_eclaims_sessions
     SET contactId = ?, otpRecord = ?, sessionStatus = 'otp_sent', lastError = NULL,
         rawResponseJson = COALESCE(?, rawResponseJson), updatedAt = NOW()
     WHERE sessionId = ?`,
    [
      String(contactId),
      otpRecord ? String(otpRecord) : null,
      rawOtpResponse ? JSON.stringify(rawOtpResponse) : null,
      Number(sessionId),
    ]
  );
  return getSessionById(sessionId);
}

async function markVisitStarted(sessionId, { nationalVisitId, consentToken, authGuid, rawResponse }) {
  await pool.execute(
    `UPDATE sha_eclaims_sessions
     SET nationalVisitId = ?, consentToken = COALESCE(?, consentToken),
         authGuid = COALESCE(?, authGuid),
         sessionStatus = 'visit_active', lastError = NULL,
         rawResponseJson = ?, updatedAt = NOW()
     WHERE sessionId = ?`,
    [
      nationalVisitId ? String(nationalVisitId) : null,
      consentToken ? String(consentToken) : null,
      authGuid ? String(authGuid) : null,
      rawResponse ? JSON.stringify(rawResponse) : null,
      Number(sessionId),
    ]
  );
  return getSessionById(sessionId);
}

async function backfillConsentToken(session) {
  if (!session?.sessionId) return session;
  const token = consentTokenFromSession(session);
  if (token && !session.consentToken) {
    await pool.execute(
      `UPDATE sha_eclaims_sessions SET consentToken = ?, updatedAt = NOW() WHERE sessionId = ?`,
      [String(token), Number(session.sessionId)]
    );
    return getSessionById(session.sessionId);
  }
  return session;
}

function consentTokenFromSession(session) {
  if (!session) return null;
  if (session.consentToken) return String(session.consentToken);
  try {
    const raw =
      typeof session.rawResponseJson === 'string'
        ? JSON.parse(session.rawResponseJson)
        : session.rawResponseJson;
    if (!raw || typeof raw !== 'object') return null;
    return (
      raw.authorization_code ||
      raw.consent_token ||
      raw.consentToken ||
      null
    );
  } catch {
    return null;
  }
}

async function markPreauth(sessionId, preauthReference, rawResponse) {
  await pool.execute(
    `UPDATE sha_eclaims_sessions
     SET preauthReference = ?, lastError = NULL,
         rawResponseJson = COALESCE(?, rawResponseJson), updatedAt = NOW()
     WHERE sessionId = ?`,
    [
      preauthReference ? String(preauthReference) : null,
      rawResponse ? JSON.stringify(rawResponse) : null,
      Number(sessionId),
    ]
  );
  return getSessionById(sessionId);
}

async function markClaimSubmitted(sessionId, claimReference, rawResponse) {
  await pool.execute(
    `UPDATE sha_eclaims_sessions
     SET claimReference = ?, sessionStatus = 'closed', lastError = NULL,
         rawResponseJson = ?, updatedAt = NOW()
     WHERE sessionId = ?`,
    [
      claimReference ? String(claimReference) : null,
      rawResponse ? JSON.stringify(rawResponse) : null,
      Number(sessionId),
    ]
  );
  return getSessionById(sessionId);
}

async function markVisitClosed(sessionId, rawResponse) {
  await pool.execute(
    `UPDATE sha_eclaims_sessions
     SET sessionStatus = 'closed', lastError = NULL,
         rawResponseJson = COALESCE(?, rawResponseJson), updatedAt = NOW()
     WHERE sessionId = ?`,
    [rawResponse ? JSON.stringify(rawResponse) : null, Number(sessionId)]
  );
  return getSessionById(sessionId);
}

async function markFailed(sessionId, message) {
  await pool.execute(
    `UPDATE sha_eclaims_sessions SET sessionStatus = 'failed', lastError = ?, updatedAt = NOW()
     WHERE sessionId = ?`,
    [String(message || 'failed').slice(0, 500), Number(sessionId)]
  );
  return getSessionById(sessionId);
}

/** Record a step error without closing an active national visit (e.g. preauth 404). */
async function markStepError(sessionId, message) {
  await pool.execute(
    `UPDATE sha_eclaims_sessions SET lastError = ?, updatedAt = NOW()
     WHERE sessionId = ?`,
    [String(message || 'error').slice(0, 500), Number(sessionId)]
  );
  return getSessionById(sessionId);
}

/**
 * Closed / failed national eClaims sessions for patient chart history (not active drafts).
 */
async function listClaimHistoryForPatient(patientId, { limit = 15 } = {}) {
  const cap = Math.min(Math.max(Number(limit) || 15, 1), 50);
  const [rows] = await pool.execute(
    `SELECT s.sessionId, s.patientId, s.serviceType, s.nationalVisitId, s.preauthReference,
            s.claimReference, s.sessionStatus, s.lastError, s.createdAt, s.updatedAt, s.createdBy,
            u.username AS createdByUsername
     FROM sha_eclaims_sessions s
     LEFT JOIN users u ON u.userId = s.createdBy AND u.voided = 0
     WHERE s.patientId = ?
       AND s.sessionStatus IN ('closed', 'failed')
     ORDER BY s.updatedAt DESC, s.sessionId DESC
     LIMIT ?`,
    [Number(patientId), cap]
  );
  return rows.map((row) => ({
    sessionId: row.sessionId,
    serviceType: row.serviceType,
    nationalVisitId: row.nationalVisitId,
    preauthReference: row.preauthReference,
    claimReference: row.claimReference,
    sessionStatus: row.sessionStatus,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    createdByUsername: row.createdByUsername,
  }));
}

async function updateSessionIntervention(sessionId, interventionCode) {
  await pool.execute(
    `UPDATE sha_eclaims_sessions SET interventionCode = ?, updatedAt = NOW() WHERE sessionId = ?`,
    [String(interventionCode), Number(sessionId)]
  );
  return getSessionById(sessionId);
}

module.exports = {
  getActiveSessionForPatient,
  listClaimHistoryForPatient,
  createOrUpdateDraft,
  getSessionById,
  markBiometricsPending,
  markOtpSent,
  markVisitStarted,
  consentTokenFromSession,
  backfillConsentToken,
  markPreauth,
  markClaimSubmitted,
  markVisitClosed,
  markFailed,
  markStepError,
  updateSessionIntervention,
};
