/**
 * Pre-authorization (normal / surgical / oncology / elective — paths per tenant Postman).
 * @see docs/DHA_ECLAIMS_BUILD_REFERENCE.md Phase F
 */
const {
  trimEnv,
  resolveEclaimsMode,
  eclaimsRequest,
  eclaimsFormRequest,
} = require('./afyaConnectEclaimsHttp');
const { resolveClaimPractitionerFromEnvOrBody } = require('./afyaConnectClaimPractitioner');

const PREAUTH_TYPES = ['normal', 'surgical', 'oncology', 'elective'];

/** DHA UAT: POST /preauths (multipart), not /claims/preauth — @see https://hie-docs.dha.go.ke/eclaims/preauths */
function defaultPreauthPath() {
  return trimEnv('AFYACONNECT_CLAIMS_PREAUTH_PATH') || '/preauths';
}

function resolvePreauthPath(preauthType) {
  const kind = String(preauthType || 'normal').toLowerCase();
  const fallback = defaultPreauthPath();
  const byType = {
    normal: fallback,
    surgical:
      trimEnv('AFYACONNECT_CLAIMS_PREAUTH_SURGICAL_PATH') ||
      trimEnv('AFYACONNECT_CLAIMS_PREAUTH_SURGICAL') ||
      fallback,
    oncology:
      trimEnv('AFYACONNECT_CLAIMS_PREAUTH_ONCOLOGY_PATH') ||
      trimEnv('AFYACONNECT_CLAIMS_PREAUTH_ONCOLOGY') ||
      fallback,
    elective:
      trimEnv('AFYACONNECT_CLAIMS_PREAUTH_ELECTIVE_PATH') ||
      trimEnv('AFYACONNECT_CLAIMS_PREAUTH_ELECTIVE') ||
      fallback,
  };
  return byType[kind] || fallback;
}

function defaultPreauthCancelPath() {
  return (
    trimEnv('AFYACONNECT_CLAIMS_PREAUTH_CANCEL_PATH') ||
    `${defaultPreauthPath().replace(/\/$/, '')}/cancel`
  );
}

/** ISO-8601 with +03:00 (Africa/Nairobi) for DHA preauth service_start / service_end. */
function eatIsoTimestamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(d)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+03:00`;
}

function preauthDoctorFormJson(interventionCode) {
  const p = resolveClaimPractitionerFromEnvOrBody(null, {});
  if (!p?.identificationNumber || !interventionCode) return null;
  return JSON.stringify([
    {
      identification_number: p.identificationNumber,
      identification_type: p.identificationType || 'registration_number',
      regulation_body: p.regulationBody || 'KMPDC',
      intervention_code: String(interventionCode),
      is_primary: true,
    },
  ]);
}

function preauthDiagnosesFormJson(consentToken, icdCode) {
  const icd = String(icdCode || trimEnv('AFYACONNECT_CLAIM_DEFAULT_ICD11') || 'ca07.0').trim();
  if (!consentToken || !icd) return null;
  return JSON.stringify([{ consent_token: String(consentToken), icd_code: icd }]);
}

function pickPreauthRef(data) {
  if (!data || typeof data !== 'object') return null;
  return (
    data.token ||
    data.preauth_id ||
    data.preauthId ||
    data.reference ||
    data.id ||
    data.data?.token ||
    data.data?.preauth_id ||
    null
  );
}

/**
 * @param {{
 *   nationalVisitId: string,
 *   consentToken?: string,
 *   interventionCode?: string,
 *   patientCrId?: string,
 *   notes?: string,
 *   preauthType?: string,
 * }} params
 */
async function requestShaPreauth(params = {}) {
  const mode = resolveEclaimsMode();
  const visitId = params.nationalVisitId || params.visit_id || params.visitId;
  const consentToken = params.consentToken || params.consent_token;
  if (!visitId && !consentToken) {
    return { mode, error: 'nationalVisitId or consentToken required' };
  }

  const preauthType = PREAUTH_TYPES.includes(String(params.preauthType || '').toLowerCase())
    ? String(params.preauthType).toLowerCase()
    : 'normal';

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      nationalVisitId: visitId ? String(visitId) : null,
      preauthType,
      preauthReference: `SBX-PREAUTH-${Date.now()}`,
      message: 'Sandbox preauth — not sent to AfyaConnect',
    };
  }

  const interventionCode = params.interventionCode
    ? String(params.interventionCode).trim()
    : '';
  if (!consentToken) {
    return { mode, error: 'consentToken required (from start visit authorization_code)' };
  }
  if (!interventionCode) {
    return { mode, error: 'interventionCode required — select an intervention on the SHA card' };
  }

  const path = resolvePreauthPath(preauthType);
  const serviceStart = params.serviceStart
    ? String(params.serviceStart)
    : eatIsoTimestamp(new Date());
  const endDate = params.serviceEnd
    ? new Date(params.serviceEnd)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const serviceEnd = params.serviceEnd ? String(params.serviceEnd) : eatIsoTimestamp(endDate);

  const fields = {
    consent_token: String(consentToken),
    intervention_code: interventionCode,
    service_start: serviceStart,
    service_end: serviceEnd,
  };
  const doctors = preauthDoctorFormJson(interventionCode);
  if (doctors) fields.doctors = doctors;
  const diagnoses = preauthDiagnosesFormJson(consentToken, params.icdCode);
  if (diagnoses) fields.diagnoses = diagnoses;
  if (params.notes) fields.notes = String(params.notes);
  if (params.preauthReason) fields.reason = String(params.preauthReason);
  if (preauthType === 'elective') fields.is_elective = 'true';

  const useJsonPreauth = trimEnv('AFYACONNECT_CLAIMS_PREAUTH_USE_JSON') === '1';
  let live;
  if (useJsonPreauth) {
    const body = { ...fields };
    if (visitId) body.visit_id = String(visitId);
    if (params.patientCrId) body.patient_id = String(params.patientCrId);
    live = await eclaimsRequest('POST', path, { body });
  } else {
    live = await eclaimsFormRequest(path, { fields });
  }
  if (live.error) return { ...live, preauthType, preauthPath: path };
  const data = live.data;
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    preauthType,
    preauthPath: path,
    nationalVisitId: visitId ? String(visitId) : null,
    preauthReference: pickPreauthRef(data) ? String(pickPreauthRef(data)) : null,
    message: data?.message || 'Preauth submitted',
    raw: data,
  };
}

/**
 * Cancel preauth when UAT requires it (path configurable).
 */
async function cancelShaPreauth(params = {}) {
  const mode = resolveEclaimsMode();
  const preauthRef =
    params.preauthReference || params.preauthId || params.preauth_id || params.reference;
  const consentToken = params.consentToken || params.consent_token;
  if (!preauthRef && !consentToken) {
    return { mode, error: 'preauthReference or consentToken required' };
  }

  if (mode === 'sandbox') {
    return { mode: 'sandbox', message: 'Sandbox preauth cancel — not sent to AfyaConnect' };
  }

  const path = defaultPreauthCancelPath();
  const interventionCode = params.interventionCode
    ? String(params.interventionCode).trim()
    : '';
  if (!consentToken) {
    return { mode, error: 'consentToken required to cancel preauth' };
  }
  if (!interventionCode) {
    return {
      mode,
      error: 'interventionCode required — DHA cancels by consent_token + intervention_code',
    };
  }
  const body = {
    consent_token: String(consentToken),
    intervention_code: interventionCode,
  };
  if (preauthRef) body.preauth_id = String(preauthRef);
  if (params.reason) body.reason = String(params.reason);

  const live = await eclaimsRequest('POST', path, { body });
  if (live.error) return { ...live, preauthCancelPath: path };
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    preauthCancelPath: path,
    message: live.data?.message || 'Preauth cancelled',
    raw: live.data,
  };
}

module.exports = {
  requestShaPreauth,
  cancelShaPreauth,
  resolvePreauthPath,
  PREAUTH_TYPES,
};
