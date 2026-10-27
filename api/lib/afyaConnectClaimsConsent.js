/**
 * eClaims visit consent — contacts + OTP (not SHR /shr/*).
 * @see docs/DHA_ECLAIMS_BUILD_REFERENCE.md Phase D
 */
const { afyaConnectFetch, isAfyaConnectConfigured } = require('./afyaConnectAuth');
const { getShrConfig } = require('./shrConsent');
const { resolveEligibilityMode } = require('./afyaConnectEligibility');

function trimEnv(key) {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function getApiRoot() {
  return (
    trimEnv('SHA_BASE_URL') ||
    trimEnv('FHIR_BASE_URL') ||
    trimEnv('CLIENT_REGISTRY_BASE_URL') ||
    ''
  );
}

function resolveMode() {
  return resolveEligibilityMode();
}

function facilityHeaders() {
  const cfg = getShrConfig();
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (cfg.facilityFrCode) {
    headers['X-Facility-Id'] = String(cfg.facilityFrCode);
    headers['X-Facility-Id-Type'] = trimEnv('AFYACONNECT_FACILITY_ID_TYPE') || 'fr-code';
  }
  return headers;
}

function unwrapContacts(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function normalizeContact(row) {
  if (!row || typeof row !== 'object') return null;
  const id = row.id ?? row.contact_id ?? row.contactId;
  if (id == null) return null;
  return {
    contactId: String(id),
    contactValue: row.contactValue || row.contact_value || row.phone || null,
    contactType: row.contactType || row.contact_type || null,
    isConfirmed: row.isConfirmed ?? row.is_confirmed ?? null,
    active: row.active ?? true,
  };
}

async function listPatientContacts({ patientCrId }) {
  const mode = resolveMode();
  if (mode === 'disabled') {
    return { mode, skipped: true, reason: 'ELIGIBILITY_MODE=disabled' };
  }
  if (!patientCrId) return { mode, error: 'patientCrId required' };

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      patientCrId,
      contacts: [
        {
          contactId: 'sandbox-contact-1',
          contactValue: '+2547***0000',
          contactType: 'PHO',
          isConfirmed: true,
          active: true,
        },
      ],
      message: 'Sandbox contacts — live uses GET /patients/contacts',
    };
  }

  if (!isAfyaConnectConfigured()) return { mode, error: 'AfyaConnect OAuth not configured' };
  const root = getApiRoot();
  if (!root) return { mode, error: 'API base URL not configured' };

  const path = trimEnv('AFYACONNECT_CONTACTS_PATH') || '/patients/contacts';
  const base = root.endsWith('/') ? root.slice(0, -1) : root;
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}?${new URLSearchParams({
    patient_id: String(patientCrId),
  }).toString()}`;

  const res = await afyaConnectFetch(url, { method: 'GET', headers: facilityHeaders() });
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    return {
      mode: 'live',
      error: data?.message || data?.error || text.slice(0, 200) || `HTTP ${res.status}`,
      httpStatus: res.status,
      body: data,
    };
  }
  const contacts = unwrapContacts(data).map(normalizeContact).filter(Boolean);
  return { mode: 'live', patientCrId, httpStatus: res.status, contacts, raw: data };
}

function normalizeInterventionCodes(interventionCodes, interventionCode) {
  if (Array.isArray(interventionCodes) && interventionCodes.length) {
    return interventionCodes.map((c) => String(c).trim()).filter(Boolean);
  }
  if (interventionCode != null && String(interventionCode).trim()) {
    return [String(interventionCode).trim()];
  }
  return [];
}

async function sendClaimsOtp({
  patientCrId,
  contactId,
  serviceType,
  interventionCodes,
  interventionCode,
}) {
  const mode = resolveMode();
  if (mode === 'disabled') return { mode, skipped: true };
  if (!patientCrId || !contactId) {
    return { mode, error: 'patientCrId and contactId required' };
  }
  const codes = normalizeInterventionCodes(interventionCodes, interventionCode);

  if (mode === 'sandbox') {
    const otpRecord = `sandbox-otp-${Date.now()}`;
    return {
      mode: 'sandbox',
      patientCrId,
      contactId: String(contactId),
      otpRecord,
      message: 'Sandbox OTP sent — enter any 6 digits on Start visit in demo, or use DHA test OTP if documented',
    };
  }

  if (!codes.length) {
    return {
      mode,
      error:
        'intervention_codes required — load interventions on the chart and select a line before Send claims OTP (see hie-docs.dha.go.ke/consent/send-otp)',
    };
  }

  if (!isAfyaConnectConfigured()) return { mode, error: 'AfyaConnect OAuth not configured' };
  const root = getApiRoot();
  if (!root) return { mode, error: 'API base URL not configured' };

  const path = trimEnv('AFYACONNECT_CLAIMS_OTP_PATH') || '/claims/otp';
  const base = root.endsWith('/') ? root.slice(0, -1) : root;
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const body = {
    patient_id: String(patientCrId),
    intervention_codes: codes,
    contact_id: Number.isFinite(Number(contactId)) ? Number(contactId) : contactId,
  };
  if (serviceType) body.service_type = String(serviceType);

  const res = await afyaConnectFetch(url, {
    method: 'POST',
    headers: facilityHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    return {
      mode: 'live',
      error: data?.message || data?.error || text.slice(0, 200) || `HTTP ${res.status}`,
      httpStatus: res.status,
      body: data,
    };
  }
  const inner = data?.data && typeof data.data === 'object' ? data.data : data;
  const otpRecord =
    inner?.otp_record ||
    inner?.otpRecord ||
    inner?.consent_request_id ||
    inner?.consentRequestId ||
    data?.otp_record ||
    data?.otpRecord ||
    data?.record_id ||
    data?.recordId ||
    data?.id ||
    null;
  const messageText =
    (typeof data?.message === 'string' && data.message) ||
    (typeof inner?.message === 'string' && inner.message) ||
    'OTP sent to patient contact';
  const uatOtpInMessage = messageText.match(/\bOTP is\s+(\d{4,8})\b/i);
  return {
    mode: 'live',
    httpStatus: res.status,
    patientCrId,
    contactId: String(contactId),
    otpRecord: otpRecord != null ? String(otpRecord) : null,
    /** UAT middleware often returns OTP in message body (not SMS) — for clinician testing only */
    uatOtpHint: uatOtpInMessage ? uatOtpInMessage[1] : null,
    message: messageText,
    raw: data,
  };
}

module.exports = {
  listPatientContacts,
  sendClaimsOtp,
};
