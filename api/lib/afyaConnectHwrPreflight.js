/**
 * Lightweight HWR + claim-doctor checks for admin preflight.
 */
const { trimEnv } = require('./afyaConnectEclaimsHttp');
const { searchHealthWorker } = require('./afyaConnectHealthWorkerRegistry');
const { resolveClaimPractitionerForRequest } = require('./afyaConnectClaimPractitioner');

async function runPreflightHwrSmoke() {
  const reg =
    trimEnv('AFYACONNECT_PREFLIGHT_HWR_REGISTRATION') ||
    trimEnv('AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER') ||
    'A7000';
  const result = await searchHealthWorker({
    identificationNumber: reg,
    identificationType: 'registration_number',
    regulator: trimEnv('AFYACONNECT_CLAIM_DOCTOR_REGULATION_BODY') || 'KMPDC',
  });
  return {
    ok: Boolean(result.ok),
    error: result.error || null,
    sampleRegistration: reg,
    practitionerName: result.summary?.fullName || null,
    hwrPuid: result.summary?.hwrPuid || null,
    kmpdcRegistration: result.summary?.kmpdcRegistration || null,
    httpStatus: result.httpStatus || null,
  };
}

async function runPreflightClaimDoctorSmoke(pool) {
  const resolved = await resolveClaimPractitionerForRequest(pool, null, {});
  const practitioner = resolved.practitioner;
  return {
    ok: Boolean(practitioner),
    error: resolved.hwrError || null,
    source: resolved.source || null,
    identificationNumber: practitioner?.identificationNumber || null,
    regulationBody: practitioner?.regulationBody || null,
  };
}

module.exports = {
  runPreflightHwrSmoke,
  runPreflightClaimDoctorSmoke,
};
