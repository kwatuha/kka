/**
 * Claims consent authorizations — biometrics iframe + reject stuck PENDING.
 * @see https://hie-docs.dha.go.ke/docs/consent/process/biometricsConsent
 * @see https://hie-docs.dha.go.ke/consent/authorizations
 */
const { trimEnv, resolveEclaimsMode, eclaimsRequest } = require('./afyaConnectEclaimsHttp');

function pickIframeUrl(data) {
  if (!data || typeof data !== 'object') return null;
  const inner = data.data && typeof data.data === 'object' ? data.data : data;
  return (
    inner.iframe_url ||
    inner.iframeUrl ||
    inner.iframe_link ||
    inner.iframeLink ||
    inner.capture_url ||
    inner.url ||
    null
  );
}

function pickAuthGuid(data) {
  if (!data || typeof data !== 'object') return null;
  const inner = data.data && typeof data.data === 'object' ? data.data : data;
  return (
    inner.guid ||
    inner.auth_guid ||
    inner.authGuid ||
    inner.authorization_guid ||
    inner.id ||
    null
  );
}

function pickAuthorizationToken(data) {
  if (!data || typeof data !== 'object') return null;
  const inner = data.data && typeof data.data === 'object' ? data.data : data;
  return (
    inner.token ||
    inner.consent_token ||
    inner.consentToken ||
    inner.authorization_token ||
    null
  );
}

function normalizeInterventionCodes(params) {
  if (Array.isArray(params.interventionCodes) && params.interventionCodes.length) {
    return params.interventionCodes.map((c) => String(c).trim()).filter(Boolean);
  }
  const one = params.interventionCode || params.intervention_code;
  return one ? [String(one).trim()] : [];
}

/**
 * Fingerprint / eKYC authorization — facility hardware agent required on live UAT.
 */
async function createBiometricsAuthorization(params = {}) {
  const mode = resolveEclaimsMode();
  const patientCrId = params.patientCrId || params.patient_id;
  const serviceType = String(params.serviceType || params.service_type || 'OUTPATIENT').toUpperCase();
  const interventions = normalizeInterventionCodes(params);

  if (!patientCrId) return { mode, error: 'patientCrId required' };
  if (!interventions.length) {
    return { mode, error: 'interventionCode or interventionCodes required for authorization' };
  }

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      patientCrId,
      serviceType,
      status: 'PENDING',
      authGuid: `SBX-AUTH-${Date.now()}`,
      authorizationToken: `SBX-TOKEN-${Date.now()}`,
      iframeUrl: null,
      message:
        'Sandbox biometrics — configure AFYACONNECT_BIOMETRICS_* env and hardware server for live capture',
    };
  }

  const agentId = params.agentId || trimEnv('AFYACONNECT_BIOMETRICS_AGENT_ID');
  const workstationId =
    params.workstationId || trimEnv('AFYACONNECT_BIOMETRICS_WORKSTATION_ID');
  const ekycProviderId =
    params.ekycProviderId || trimEnv('AFYACONNECT_BIOMETRICS_EKYC_PROVIDER_ID');
  const deviceOs = params.authorizingDeviceOs || trimEnv('AFYACONNECT_BIOMETRICS_DEVICE_OS') || 'linux';

  if (!agentId || !workstationId) {
    return {
      mode,
      error:
        'Biometrics not configured — set AFYACONNECT_BIOMETRICS_AGENT_ID and AFYACONNECT_BIOMETRICS_WORKSTATION_ID (from hardware server /status)',
      doc: 'https://hie-docs.dha.go.ke/docs/consent/process/biometricsConsent',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_AUTHORIZE_PATH') || '/claims/authorize';
  const body = {
    patient_id: String(patientCrId),
    service_type: serviceType,
    interventions,
    agent_id: String(agentId),
    workstation_id: String(workstationId),
    authorizing_device_os: String(deviceOs),
  };
  if (ekycProviderId) body.ekyc_provider_id = String(ekycProviderId);
  if (params.isEmergency != null) body.is_emergency = Boolean(params.isEmergency);

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return live;
  const data = live.data;
  const iframeUrl = pickIframeUrl(data);
  const authGuid = pickAuthGuid(data);
  const authorizationToken = pickAuthorizationToken(data);
  const status =
    (data?.data && data.data.status) || data?.status || (iframeUrl ? 'PENDING' : 'UNKNOWN');

  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    patientCrId,
    serviceType,
    status: status ? String(status) : null,
    authGuid: authGuid ? String(authGuid) : null,
    authorizationToken: authorizationToken ? String(authorizationToken) : null,
    iframeUrl: iframeUrl ? String(iframeUrl) : null,
    message: data?.message || 'Biometrics authorization created — complete capture in iframe',
    raw: data,
  };
}

/**
 * OTP authorization via POST /claims/authorize (alternative to /claims/otp + visit otp field).
 */
async function createOtpAuthorization(params = {}) {
  const mode = resolveEclaimsMode();
  const patientCrId = params.patientCrId || params.patient_id;
  const serviceType = String(params.serviceType || 'OUTPATIENT').toUpperCase();
  const otp = params.otp != null ? String(params.otp).trim() : '';
  const interventions = normalizeInterventionCodes(params);

  if (!patientCrId || !otp) return { mode, error: 'patientCrId and otp required' };
  if (!interventions.length) {
    return { mode, error: 'interventionCode required for OTP authorization' };
  }

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      authGuid: `SBX-OTP-AUTH-${Date.now()}`,
      message: 'Sandbox OTP authorization',
    };
  }

  const path = trimEnv('AFYACONNECT_CLAIMS_AUTHORIZE_PATH') || '/claims/authorize';
  const live = await eclaimsRequest('POST', path, {
    body: {
      patient_id: String(patientCrId),
      service_type: serviceType,
      otp,
      interventions,
    },
  });
  if (live.error) return live;
  const data = live.data;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    authGuid: pickAuthGuid(data) ? String(pickAuthGuid(data)) : null,
    authorizationToken: pickAuthorizationToken(data)
      ? String(pickAuthorizationToken(data))
      : null,
    status: data?.status || data?.data?.status || null,
    message: data?.message || 'OTP authorization recorded',
    raw: data,
  };
}

async function rejectPendingAuthorization(authorizationToken) {
  const mode = resolveEclaimsMode();
  const token = authorizationToken ? String(authorizationToken).trim() : '';
  if (!token) return { mode, error: 'authorizationToken (consent_token) required' };

  if (mode === 'sandbox') {
    return { mode, message: 'Sandbox authorization rejected' };
  }

  const pathTemplate =
    trimEnv('AFYACONNECT_CLAIMS_AUTHORIZE_REJECT_PATH') ||
    '/claims/authorizations/{token}/reject';
  const path = pathTemplate.replace('{token}', encodeURIComponent(token));
  const live = await eclaimsRequest('POST', path, {});
  if (live.error) return live;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    message: live.data?.message || 'Authorization rejected',
    raw: live.data,
  };
}

module.exports = {
  createBiometricsAuthorization,
  createOtpAuthorization,
  rejectPendingAuthorization,
  pickAuthGuid,
  pickAuthorizationToken,
};
