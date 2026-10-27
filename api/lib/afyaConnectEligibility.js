/**
 * SHA / fund eligibility probe (AfyaConnect middleware).
 * Live path is configurable — confirm exact URL with DHA Postman for your tenant.
 * @see docs/DHA_AFYACONNECT_INTEGRATION_COVERAGE.md
 * @see https://hie-docs.dha.go.ke/docs/goLive
 */
const { afyaConnectFetch, isAfyaConnectConfigured } = require('./afyaConnectAuth');
const { getShrConfig } = require('./shrConsent');
const { resolveDhaPatientIdentification } = require('./dhaIdentification');
const { mapEligibilityResponse } = require('./afyaConnectEligibilityMapper');

function trimEnv(key) {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function resolveEligibilityMode() {
  const fromEnv = trimEnv('ELIGIBILITY_MODE') || trimEnv('SHA_ELIGIBILITY_MODE');
  if (fromEnv === 'sandbox' || fromEnv === 'live' || fromEnv === 'disabled') return fromEnv;
  const sha = trimEnv('SHA_MODE').toLowerCase();
  if (sha === 'live') return 'live';
  if (sha === 'disabled') return 'disabled';
  return 'sandbox';
}

function getApiRoot(settings = null) {
  return (
    trimEnv('FHIR_BASE_URL') ||
    trimEnv('CLIENT_REGISTRY_BASE_URL') ||
    trimEnv('SHA_BASE_URL') ||
    (settings?.fhirBaseUrl ? String(settings.fhirBaseUrl).trim() : '')
  );
}

/**
 * @param {object} params
 * @param {string} [params.crId] — Client Registry ID (NUPI)
 * @param {string} [params.nationalId]
 * @param {string} [params.facilityFrCode]
 * @param {string} [params.serviceType] — e.g. OUTPATIENT, CAPITATION, EMERGENCY
 */
async function checkShaEligibility(params = {}, settings = null) {
  const mode = resolveEligibilityMode();
  if (mode === 'disabled') {
    return { mode, skipped: true, reason: 'Eligibility checks disabled (ELIGIBILITY_MODE=disabled)' };
  }

  const crId = params.crId || params.nupi || null;
  const nationalId = params.nationalId || null;
  if (!crId && !nationalId) {
    return { mode, error: 'NUPI (CR ID) or national ID required for eligibility' };
  }

  const shrCfg = getShrConfig(settings);
  const facilityFrCode = params.facilityFrCode || shrCfg.facilityFrCode || null;

  if (mode === 'sandbox') {
    const serviceType = String(params.serviceType || 'OUTPATIENT').toUpperCase();
    const sandboxByService = {
      OUTPATIENT: {
        eligible: true,
        coverageStatus: 'active_shif',
        message:
          'Sandbox: outpatient (SHIF) — member active for facility outpatient services. Not a national SHA response.',
        scheme: 'SHIF',
      },
      CAPITATION: {
        eligible: true,
        coverageStatus: 'phc_capitation',
        message:
          'Sandbox: PHC capitation — primary care package applies at this FR code. Confirm benefit period on go-live.',
        scheme: 'PHC capitation',
      },
      INPATIENT: {
        eligible: true,
        coverageStatus: 'inpatient_review',
        message:
          'Sandbox: inpatient — eligibility may require pre-authorization and bed category. Live API returns ward limits.',
        scheme: 'SHIF inpatient',
        requiresPreauth: true,
      },
      EMERGENCY: {
        eligible: true,
        coverageStatus: 'eccif_emergency',
        message:
          'Sandbox: emergency (ECCIF) — stabilization visit path; document triage and emergency justification for claims.',
        scheme: 'ECCIF',
      },
    };
    const demo = sandboxByService[serviceType] || {
      eligible: false,
      coverageStatus: 'unknown_service_type',
      message: `Sandbox: unrecognized serviceType "${serviceType}". Use OUTPATIENT, CAPITATION, INPATIENT, or EMERGENCY.`,
      scheme: null,
    };
    return {
      mode: 'sandbox',
      serviceType,
      eligible: demo.eligible,
      coverageStatus: demo.coverageStatus,
      message: demo.message,
      scheme: demo.scheme,
      requiresPreauth: demo.requiresPreauth ?? false,
      patient: { crId, nationalId: nationalId || undefined },
      facilityFrCode,
      liveHint:
        'Set ELIGIBILITY_MODE=live and subscribe to SHA/eligibility on AfyaConnect for national checks.',
      doc: 'docs/DHA_AFYACONNECT_INTEGRATION_COVERAGE.md',
    };
  }

  if (!isAfyaConnectConfigured()) {
    return { mode, error: 'AfyaConnect OAuth not configured' };
  }
  const apiRoot = getApiRoot(settings);
  if (!apiRoot) {
    return { mode, error: 'FHIR_BASE_URL or CLIENT_REGISTRY_BASE_URL required for live eligibility' };
  }

  const path = trimEnv('AFYACONNECT_ELIGIBILITY_PATH') || '/patients/eligibility';
  const idResolved = resolveDhaPatientIdentification(
    {
      nupi: crId,
      crId,
      idNumber: nationalId,
      idType: params.idType,
      identificationType: params.identificationType,
    },
    { preferClientRegistryIdWhenPresent: true }
  );
  if (!idResolved.identification_number || !idResolved.identification_type) {
    return {
      mode,
      error: 'NUPI (ClientRegistry ID) or national ID with ID type required for live eligibility',
    };
  }

  const q = new URLSearchParams();
  q.set('identification_number', idResolved.identification_number);
  q.set('identification_type', idResolved.identification_type);
  if (facilityFrCode) q.set('facility_id', String(facilityFrCode));
  if (params.serviceType) q.set('service_type', String(params.serviceType));

  const root = apiRoot.endsWith('/') ? apiRoot.slice(0, -1) : apiRoot;
  const url = `${root}${path.startsWith('/') ? path : `/${path}`}?${q.toString()}`;

  const fetchHeaders = { Accept: 'application/json' };
  if (facilityFrCode) {
    fetchHeaders['X-Facility-Id'] = String(facilityFrCode);
    fetchHeaders['X-Facility-Id-Type'] = trimEnv('AFYACONNECT_FACILITY_ID_TYPE') || 'fr-code';
  }

  const res = await afyaConnectFetch(url, { method: 'GET', headers: fetchHeaders });
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }

  if (!res.ok) {
    return {
      mode,
      error: data?.message || data?.error || text.slice(0, 200) || `HTTP ${res.status}`,
      httpStatus: res.status,
      body: data,
    };
  }

  const serviceType = String(params.serviceType || 'OUTPATIENT').toUpperCase();
  const mapped = mapEligibilityResponse(data, { serviceType });

  return {
    mode: 'live',
    serviceType,
    httpStatus: res.status,
    identification: {
      type: idResolved.identification_type,
      number: idResolved.identification_number,
    },
    ...mapped,
    scheme:
      mapped.schemesForServiceType?.[0]?.schemeName ||
      mapped.schemesSummary?.[0]?.schemeName ||
      null,
    requiresPreauth: serviceType === 'INPATIENT' && mapped.eligible === true,
    patient: {
      crId: mapped.memberCrNumber || crId,
      nationalId: nationalId || undefined,
    },
    facilityFrCode,
    raw: data,
  };
}

/**
 * Admin preflight: UAT national ID by default (override with env).
 */
async function runPreflightEligibilitySmoke() {
  const mode = resolveEligibilityMode();
  if (mode === 'disabled') {
    return { ok: true, mode, skipped: true, reason: 'ELIGIBILITY_MODE=disabled' };
  }
  const sampleId = trimEnv('AFYACONNECT_PREFLIGHT_ELIGIBILITY_ID') || '12345678';
  const idType = trimEnv('AFYACONNECT_PREFLIGHT_ELIGIBILITY_TYPE') || 'National ID';
  const result = await checkShaEligibility({
    nationalId: sampleId,
    idType,
    serviceType: 'OUTPATIENT',
  });
  if (result.error) {
    return { ok: false, mode, sampleId, idType, error: result.error };
  }
  if (mode === 'sandbox') {
    return {
      ok: true,
      mode,
      sampleId,
      idType,
      note: 'Sandbox demonstration — switch ELIGIBILITY_MODE=live for national check',
      eligible: result.eligible,
    };
  }
  const ok = Boolean(
    result.memberFound !== false &&
      (result.memberCrNumber || result.statusDesc || (result.schemesSummary && result.schemesSummary.length))
  );
  return {
    ok: ok && result.eligible !== false,
    mode,
    sampleId,
    idType,
    memberCrNumber: result.memberCrNumber || null,
    eligible: result.eligible,
    statusDesc: result.statusDesc || null,
    activeSchemeCount: result.activeSchemeCount ?? null,
    error: ok ? null : 'Live eligibility returned no member/scheme signal — confirm UAT ID and FR code',
  };
}

module.exports = {
  resolveEligibilityMode,
  checkShaEligibility,
  runPreflightEligibilitySmoke,
};
