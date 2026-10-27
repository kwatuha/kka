/**
 * Link HMIS medical_records to sha_eclaims_sessions and push diagnosis to national claim.
 */
const shaEclaimsSessions = require('./shaEclaimsSessions');
const { resolveClaimIcd11FromMedicalRecord } = require('./claimDiagnosisFromEncounter');
const { ensureClaimDiagnosesForSubmit, claimHasDiagnoses } = require('./afyaConnectClaimsDiagnosis');
const { previewProviderClaim } = require('./afyaConnectClaimsBilling');
const { resolveClaimPractitionerForRequest } = require('./afyaConnectClaimPractitioner');

async function setSessionMedicalRecordId(sessionId, medicalRecordId) {
  const pool = require('../config/db');
  await pool.execute(
    `UPDATE sha_eclaims_sessions SET medicalRecordId = ?, updatedAt = NOW() WHERE sessionId = ?`,
    [Number(medicalRecordId), Number(sessionId)]
  );
  return shaEclaimsSessions.getSessionById(sessionId);
}

/** Link new/updated encounter to active SHA claims session (draft → visit_active). */
async function attachMedicalRecordToActiveShaSession(patientId, medicalRecordId) {
  const session = await shaEclaimsSessions.getActiveSessionForPatient(Number(patientId));
  if (!session) return null;
  await setSessionMedicalRecordId(session.sessionId, medicalRecordId);
  return session.sessionId;
}

/**
 * When national visit is open, POST /claims/diagnoses from linked encounter (if claim has none).
 */
async function syncNationalClaimDiagnosisFromEncounter(pool, { patientId, medicalRecordId, req }) {
  let session = await shaEclaimsSessions.getActiveSessionForPatient(Number(patientId));
  if (!session?.nationalVisitId) {
    return { skipped: true, reason: 'no_active_national_visit' };
  }
  if (medicalRecordId != null) {
    session = await setSessionMedicalRecordId(session.sessionId, medicalRecordId);
  }
  session = await shaEclaimsSessions.backfillConsentToken(session);
  const consentToken = shaEclaimsSessions.consentTokenFromSession(session);
  if (!consentToken) {
    return { skipped: true, reason: 'missing_consent_token' };
  }

  const preview = await previewProviderClaim({ consentToken });
  if (preview.error) return { skipped: true, reason: 'preview_failed', error: preview.error };
  if (claimHasDiagnoses(preview)) {
    return { skipped: true, reason: 'claim_already_has_diagnosis' };
  }

  const doctorResolved = await resolveClaimPractitionerForRequest(pool, req || {}, {});
  const resolved = await resolveClaimIcd11FromMedicalRecord(pool, {
    medicalRecordId: session.medicalRecordId || medicalRecordId,
    patientId,
  });
  if (!resolved.icd11Code) {
    return { skipped: true, reason: 'no_icd11_resolved', ...resolved };
  }

  const ensure = await ensureClaimDiagnosesForSubmit({
    pool,
    patientId,
    medicalRecordId: session.medicalRecordId,
    consentToken,
    preview,
    practitioner: doctorResolved.practitioner,
    icdCode: resolved.icd11Code,
  });
  return {
    synced: ensure.ok,
    icd11Code: resolved.icd11Code,
    icd10Code: resolved.icd10Code,
    source: resolved.source,
    medicalRecordId: session.medicalRecordId,
    ensure,
    warnings: resolved.warnings,
  };
}

module.exports = {
  setSessionMedicalRecordId,
  attachMedicalRecordToActiveShaSession,
  syncNationalClaimDiagnosisFromEncounter,
};
