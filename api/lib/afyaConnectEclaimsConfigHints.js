/**
 * Non-secret eClaims path hints for admin / UAT testers (compare to Postman).
 */
const { trimEnv, resolveEclaimsMode } = require('./afyaConnectEclaimsHttp');
const { resolvePreauthPath, PREAUTH_TYPES } = require('./afyaConnectClaimsPreauth');

function pathOrDefault(key, fallback) {
  return trimEnv(key) || fallback;
}

function getEclaimsConfigHints() {
  const mode = resolveEclaimsMode();
  const preauthPaths = {};
  for (const t of PREAUTH_TYPES) {
    preauthPaths[t] = resolvePreauthPath(t);
  }
  return {
    mode,
    paths: {
      contacts: pathOrDefault('AFYACONNECT_CONTACTS_PATH', '/patients/contacts'),
      claimsOtp: pathOrDefault('AFYACONNECT_CLAIMS_OTP_PATH', '/claims/otp'),
      visit: pathOrDefault('AFYACONNECT_CLAIMS_VISIT_PATH', '/claims/visit'),
      preview: pathOrDefault('AFYACONNECT_CLAIMS_PREVIEW_PATH', '/claims/preview'),
      preauth: preauthPaths,
      submit: pathOrDefault('AFYACONNECT_CLAIMS_SUBMIT_PATH', '/claims/submit'),
      discharge: pathOrDefault('AFYACONNECT_CLAIMS_DISCHARGE_PATH', '/claims/discharge'),
      dischargeOtp: pathOrDefault('AFYACONNECT_CLAIMS_DISCHARGE_OTP_PATH', '/claims/otp/discharge'),
      close: pathOrDefault('AFYACONNECT_CLAIMS_CLOSE_PATH', '/claims/close'),
      addLine: pathOrDefault('AFYACONNECT_CLAIMS_ADD_LINE_PATH', '/claims/interventions'),
      retireLine: pathOrDefault('AFYACONNECT_CLAIMS_RETIRE_LINE_PATH', '/claims/interventions/retire'),
      switchLine: pathOrDefault('AFYACONNECT_CLAIMS_SWITCH_LINE_PATH', '/claims/interventions/switch'),
      preauthCancel: pathOrDefault('AFYACONNECT_CLAIMS_PREAUTH_CANCEL_PATH', '/preauths/cancel'),
    },
    biometrics: {
      configured: Boolean(
        trimEnv('AFYACONNECT_BIOMETRICS_AGENT_ID') && trimEnv('AFYACONNECT_BIOMETRICS_WORKSTATION_ID')
      ),
      authorizePath: pathOrDefault('AFYACONNECT_CLAIMS_AUTHORIZE_PATH', '/claims/authorize'),
    },
    witnessFundTypes: ['OUTPATIENT', 'CAPITATION', 'INPATIENT', 'EMERGENCY'],
  };
}

module.exports = {
  getEclaimsConfigHints,
};
