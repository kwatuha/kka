/**
 * Admin preflight: biometrics env (claims authorize iframe) — optional for UAT OTP path.
 */
const { trimEnv } = require('./afyaConnectEclaimsHttp');

function runPreflightBiometricsSmoke() {
  const agentId = trimEnv('AFYACONNECT_BIOMETRICS_AGENT_ID');
  const workstationId = trimEnv('AFYACONNECT_BIOMETRICS_WORKSTATION_ID');
  const ekycProviderId = trimEnv('AFYACONNECT_BIOMETRICS_EKYC_PROVIDER_ID');
  const configured = Boolean(agentId && workstationId);
  return {
    ok: true,
    skipped: !configured,
    configured,
    agentIdSet: Boolean(agentId),
    workstationIdSet: Boolean(workstationId),
    ekycProviderIdSet: Boolean(ekycProviderId),
    reason: configured
      ? null
      : 'Biometrics optional — set AFYACONNECT_BIOMETRICS_AGENT_ID and WORKSTATION_ID for iframe capture',
  };
}

module.exports = {
  runPreflightBiometricsSmoke,
};
