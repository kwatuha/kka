/**
 * Outpatient / capitation claim submit on active national visit.
 * @see docs/DHA_ECLAIMS_BUILD_REFERENCE.md Phase H
 */
const { trimEnv, resolveEclaimsMode, eclaimsRequest } = require('./afyaConnectEclaimsHttp');

function pickClaimRef(data) {
  if (!data || typeof data !== 'object') return null;
  return (
    data.claim_id ||
    data.claimId ||
    data.reference ||
    data.externalReference ||
    data.id ||
    data.data?.claim_id ||
    null
  );
}

/**
 * @param {{ nationalVisitId: string, patientCrId?: string }} params
 */
async function submitShaClaim(params = {}) {
  const mode = resolveEclaimsMode();
  const visitId = params.nationalVisitId || params.visit_id || params.visitId;
  if (!visitId) return { mode, error: 'nationalVisitId required' };

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      nationalVisitId: String(visitId),
      claimReference: `SBX-CLAIM-${Date.now()}`,
      message: 'Sandbox claim submit — not the Reporting panel SHA-SBX adapter',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_SUBMIT_PATH') || '/claims/submit';
  const body = { visit_id: String(visitId) };
  if (params.patientCrId) body.patient_id = String(params.patientCrId);

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    nationalVisitId: String(visitId),
    claimReference: pickClaimRef(data) ? String(pickClaimRef(data)) : null,
    message: data?.message || 'Claim submitted',
    raw: data,
  };
}

module.exports = {
  submitShaClaim,
};
