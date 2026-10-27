/**
 * Close / discard a national visit without submit (Phase H helper).
 */
const { trimEnv, resolveEclaimsMode, eclaimsRequest } = require('./afyaConnectEclaimsHttp');

async function closeNationalVisit(params = {}) {
  const mode = resolveEclaimsMode();
  const visitId = params.nationalVisitId || params.visit_id || params.visitId;
  if (!visitId) return { mode, error: 'nationalVisitId required' };

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      nationalVisitId: String(visitId),
      message: 'Sandbox visit close — session may remain open in HMIS until cleared locally',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_CLOSE_PATH') || '/claims/close';
  const body = { visit_id: String(visitId) };
  const consentToken = params.consentToken || params.consent_token;
  if (consentToken) {
    body.consent_token = String(consentToken);
    body.ConsentToken = String(consentToken);
  }
  if (params.reason) body.reason = String(params.reason);

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    nationalVisitId: String(visitId),
    message: live.data?.message || 'Visit closed',
    raw: live.data,
  };
}

module.exports = { closeNationalVisit };
