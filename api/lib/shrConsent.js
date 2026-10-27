/**
 * SHR consent + read client (HIE middleware /shr/*).
 * @see docs/DHA_WEEK4_SHR_CONSENT_READ.md
 * @see https://hie-docs.dha.go.ke/sharedhealthrecord/shr-consent
 */
const { afyaConnectFetch, isAfyaConnectConfigured } = require('./afyaConnectAuth');

function trimEnv(key) {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function getShrConfig(settings = null) {
  const apiRoot =
    trimEnv('FHIR_BASE_URL') ||
    trimEnv('CLIENT_REGISTRY_BASE_URL') ||
    (settings?.fhirBaseUrl ? String(settings.fhirBaseUrl).trim() : '');
  return {
    configured: isAfyaConnectConfigured() && Boolean(apiRoot),
    apiRoot: apiRoot || null,
    facilityFrCode: trimEnv('SHR_FACILITY_FR_CODE') || trimEnv('AFYACONNECT_FACILITY_FR_CODE'),
    defaultPractitionerPuid:
      trimEnv('SHR_DEFAULT_PRACTITIONER_PUID') || trimEnv('AFYACONNECT_PRACTITIONER_PUID'),
    defaultRequestedBy: trimEnv('SHR_DEFAULT_REQUESTED_BY') || 'HMIS Registration',
    doc: 'docs/DHA_WEEK4_SHR_CONSENT_READ.md',
  };
}

function assertShrReady(settings) {
  const cfg = getShrConfig(settings);
  if (!cfg.configured) {
    throw new Error('AfyaConnect OAuth and FHIR/CR base URL required for SHR APIs');
  }
  if (!cfg.facilityFrCode) {
    throw new Error('SHR_FACILITY_FR_CODE not configured (facility fr-code from FR search)');
  }
  return cfg;
}

async function shrJson(method, path, { settings, body, headers = {} } = {}) {
  const cfg = assertShrReady(settings);
  const root = cfg.apiRoot.endsWith('/') ? cfg.apiRoot.slice(0, -1) : cfg.apiRoot;
  const url = `${root}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await afyaConnectFetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text.slice(0, 300) || `HTTP ${res.status}`;
    const err = new Error(`SHR ${method} ${path}: ${msg}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return { status: res.status, data };
}

/**
 * GET /shr/open-visits?patient_id=&facility_id=
 * @param {object} params
 * @param {string} params.crId — Client Registry ID (NUPI)
 */
async function listOpenVisits(params = {}, settings = null) {
  const cfg = assertShrReady(settings);
  const crId = params.crId || params.patient_id || params.patientId;
  if (!crId) throw new Error('crId (Client Registry ID) is required');
  const q = new URLSearchParams({
    patient_id: String(crId),
    facility_id: cfg.facilityFrCode,
  });
  return shrJson('GET', `/shr/open-visits?${q.toString()}`, { settings });
}

/**
 * POST /shr/consents — request OTP (standard visit).
 */
async function requestShrConsent(body = {}, settings = null) {
  const cfg = assertShrReady(settings);
  const crId = body.crId || body.cr_id;
  if (!crId) throw new Error('crId is required');
  const payload = {
    cr_id: String(crId),
    facility_id: body.facility_id || cfg.facilityFrCode,
    requested_by: body.requested_by || cfg.defaultRequestedBy,
    visit_type: body.visit_type || body.visitType || 'OP',
    practitioner_id: body.practitioner_id || body.practitionerPuid || cfg.defaultPractitionerPuid,
  };
  if (!payload.practitioner_id) {
    throw new Error('practitioner_id (PUID) required — set SHR_DEFAULT_PRACTITIONER_PUID or pass in body');
  }
  if (body.emergency) {
    payload.emergency = 1;
    payload.incapacity_reason = body.incapacity_reason || body.incapacityReason;
  }
  if (body.representative_cr_id) {
    payload.representative_cr_id = body.representative_cr_id;
    payload.representative_relationship = body.representative_relationship;
  }
  return shrJson('POST', '/shr/consents', { settings, body: payload });
}

/**
 * POST /shr/consents/{consent_id}/verify
 */
async function verifyShrConsent(consentId, body = {}, settings = null) {
  if (!consentId) throw new Error('consentId is required');
  const payload = {
    otp: body.otp,
    otp_record: body.otp_record || body.otpRecord,
    consent_decision: body.consent_decision,
    rejection_reason: body.rejection_reason,
    agent: body.agent,
  };
  Object.keys(payload).forEach((k) => payload[k] == null && delete payload[k]);
  return shrJson('POST', `/shr/consents/${encodeURIComponent(consentId)}/verify`, {
    settings,
    body: payload,
  });
}

/**
 * GET /shr/patient-records — requires X-Consent-Token.
 */
async function fetchShrPatientRecords(params = {}, settings = null) {
  const cfg = assertShrReady(settings);
  const crId = params.crId || params.patient_id;
  const consentToken = params.consentToken || params.consent_token;
  const practitionerId = params.practitioner_id || params.practitionerPuid || cfg.defaultPractitionerPuid;
  if (!crId) throw new Error('crId is required');
  if (!consentToken) throw new Error('consentToken is required (from verify consent)');
  if (!practitionerId) throw new Error('practitioner_id (PUID) is required');

  const q = new URLSearchParams({
    patient_id: String(crId),
    practitioner_id: String(practitionerId),
  });
  if (params.resources) q.set('resources', String(params.resources));

  return shrJson('GET', `/shr/patient-records?${q.toString()}`, {
    settings,
    headers: { 'X-Consent-Token': String(consentToken) },
  });
}

/**
 * POST /shr/visits/{visit_id}/close — may return otp_record or immediate end_date.
 */
async function closeShrVisit(visitId, body = {}, settings = null) {
  if (!visitId) throw new Error('visitId is required');
  const payload = {};
  if (body.patient_incapable || body.patientIncapable) {
    payload.patient_incapable = 1;
    payload.incapacity_reason =
      body.incapacity_reason || body.incapacityReason || 'Patient unable to consent to visit closure';
  }
  return shrJson('POST', `/shr/visits/${encodeURIComponent(String(visitId))}/close`, {
    settings,
    body: Object.keys(payload).length ? payload : undefined,
  });
}

/**
 * POST /shr/visits/{visit_id}/refresh — new consent token for open visit.
 */
async function refreshShrVisit(visitId, settings = null) {
  if (!visitId) throw new Error('visitId is required');
  return shrJson('POST', `/shr/visits/${encodeURIComponent(String(visitId))}/refresh`, { settings });
}

async function getShrConsentStatus(consentId, settings = null) {
  if (!consentId) throw new Error('consentId is required');
  return shrJson('GET', `/shr/consents/${encodeURIComponent(String(consentId))}/status`, { settings });
}

async function resendShrConsentOtp(consentId, settings = null) {
  if (!consentId) throw new Error('consentId is required');
  return shrJson('POST', `/shr/consents/${encodeURIComponent(String(consentId))}/resend-otp`, { settings });
}

module.exports = {
  getShrConfig,
  listOpenVisits,
  requestShrConsent,
  verifyShrConsent,
  fetchShrPatientRecords,
  closeShrVisit,
  refreshShrVisit,
  getShrConsentStatus,
  resendShrConsentOtp,
};
