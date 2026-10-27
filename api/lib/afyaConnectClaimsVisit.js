/**
 * POST /claims/visit — start national SHA visit.
 * @see docs/DHA_ECLAIMS_BUILD_REFERENCE.md Phase E
 */
const { resolveEligibilityMode } = require('./afyaConnectEligibility');
const { trimEnv, eclaimsRequest } = require('./afyaConnectEclaimsHttp');

function pickVisitId(data) {
  if (!data || typeof data !== 'object') return null;
  return (
    data.visit_id ||
    data.visitId ||
    data.claim_visit_id ||
    data.id ||
    data.data?.visit_id ||
    data.data?.visitId ||
    null
  );
}

/** DHA: authorization_code from start visit = consent_token for add line / preauth / etc. */
function pickConsentToken(data) {
  if (!data || typeof data !== 'object') return null;
  return (
    data.authorization_code ||
    data.consent_token ||
    data.consentToken ||
    data.token ||
    data.data?.authorization_code ||
    data.data?.consent_token ||
    null
  );
}

/**
 * @param {object} params
 * @param {string} params.patientCrId
 * @param {string} params.serviceType — OUTPATIENT | CAPITATION | INPATIENT | EMERGENCY
 * @param {string} [params.subBenefitCode]
 * @param {string} [params.interventionCode]
 * @param {string} [params.otp]
 * @param {string} [params.otpRecord]
 * @param {string} [params.authGuid]
 * @param {string} [params.consentToken]
 */
async function startShaClaimsVisit(params = {}) {
  const mode = resolveEligibilityMode();
  const patientCrId = params.patientCrId || params.crId;
  const serviceType = String(params.serviceType || 'OUTPATIENT').toUpperCase();

  if (mode === 'disabled') return { mode, skipped: true };
  if (!patientCrId) return { mode, error: 'patientCrId required' };

  if (mode === 'sandbox') {
    const visitId = `SBX-VISIT-${Date.now()}`;
    return {
      mode: 'sandbox',
      patientCrId,
      serviceType,
      nationalVisitId: visitId,
      message: 'Sandbox national visit — not sent to AfyaConnect',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_VISIT_PATH') || '/claims/visit';
  const body = {
    patient_id: String(patientCrId),
    service_type: serviceType,
  };
  if (params.subBenefitCode) body.sub_benefit_code = String(params.subBenefitCode);
  if (params.interventionCode) body.intervention_code = String(params.interventionCode);
  if (params.otp) body.otp = String(params.otp);
  if (params.otpRecord) body.otp_record = String(params.otpRecord);
  if (params.authGuid) body.auth_guid = String(params.authGuid);
  if (params.consentToken) body.consent_token = String(params.consentToken);

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data;
  const nationalVisitId = pickVisitId(data);
  const consentToken = pickConsentToken(data);
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    patientCrId,
    serviceType,
    nationalVisitId: nationalVisitId ? String(nationalVisitId) : null,
    consentToken: consentToken ? String(consentToken) : null,
    message: data?.message || 'Visit started',
    raw: data,
  };
}

module.exports = {
  startShaClaimsVisit,
  pickConsentToken,
};
