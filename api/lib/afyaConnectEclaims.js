/**
 * SHA eClaims read APIs (steps 4–5 before visit/claim) — sub-benefits & interventions.
 * @see https://hie-docs.dha.go.ke/docs/scenarios/overview
 * @see docs/DHA_AFYACONNECT_INTEGRATION_COVERAGE.md
 */
const { afyaConnectFetch, isAfyaConnectConfigured } = require('./afyaConnectAuth');
const { getShrConfig } = require('./shrConsent');
const { resolveEligibilityMode } = require('./afyaConnectEligibility');

function trimEnv(key) {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function getApiRoot(settings = null) {
  return (
    trimEnv('SHA_BASE_URL') ||
    trimEnv('FHIR_BASE_URL') ||
    trimEnv('CLIENT_REGISTRY_BASE_URL') ||
    (settings?.fhirBaseUrl ? String(settings.fhirBaseUrl).trim() : '')
  );
}

function resolveEclaimsReadMode() {
  const mode = resolveEligibilityMode();
  if (mode === 'disabled') return 'disabled';
  return mode;
}

function facilityHeaders(facilityFrCode) {
  const headers = { Accept: 'application/json' };
  if (facilityFrCode) {
    headers['X-Facility-Id'] = String(facilityFrCode);
    headers['X-Facility-Id-Type'] = trimEnv('AFYACONNECT_FACILITY_ID_TYPE') || 'fr-code';
  }
  return headers;
}

function unwrapList(data, keys = ['results', 'data', 'subBenefits', 'sub_benefits', 'interventions']) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  for (const k of keys) {
    if (Array.isArray(data[k])) return data[k];
    if (data.message && Array.isArray(data.message[k])) return data.message[k];
  }
  return [];
}

function normalizeParentBenefit(row) {
  if (!row || typeof row !== 'object') return null;
  const code =
    row.parentBenefitCode ||
    row.parent_benefit_code ||
    row.benefitCode ||
    row.benefit_code ||
    row.code ||
    null;
  const name =
    row.name ||
    row.parentBenefit ||
    row.parent_benefit ||
    row.description ||
    row.benefitName ||
    row.benefit_name ||
    row.displayName ||
    (code ? String(code) : null);
  if (!code && !name) return null;
  return {
    parentBenefitCode: String(code || name),
    name: name || String(code),
    fund: row.fund || row.schemeName || row.scheme_name || null,
    schemeName: row.schemeName || row.scheme_name || null,
  };
}

function sandboxParentBenefits() {
  return [
    { parentBenefitCode: 'SHIF', name: 'Sandbox SHIF (social health insurance)', fund: 'SHIF' },
    { parentBenefitCode: 'UHC', name: 'Sandbox UHC / PHC capitation', fund: 'UHC' },
    { parentBenefitCode: 'ECCIF', name: 'Sandbox emergency fund', fund: 'ECCIF' },
  ];
}

function normalizeSubBenefit(row) {
  if (!row || typeof row !== 'object') return null;
  const code =
    row.subBenefitCode ||
    row.sub_benefit_code ||
    row.code ||
    row.benefitCode ||
    row.subBenefitId ||
    null;
  const name =
    row.name ||
    row.description ||
    row.subBenefitName ||
    row.displayName ||
    (code ? String(code) : null);
  if (!code && !name) return null;
  return {
    subBenefitCode: String(code || name),
    name: name || String(code),
    fund: row.fund || row.schemeName || row.parentBenefitCode || null,
    accessPoint: row.accessPoint || row.access_point || null,
    parentBenefitCode: row.parentBenefitCode || row.parent_benefit_code || null,
  };
}

/** DHA: filter sub-benefits by OP vs IP access point vs intended visit (not sent to national API). */
function filterSubBenefitsByServiceType(subBenefits, serviceType) {
  const st = String(serviceType || 'OUTPATIENT').toUpperCase();
  const wantInpatient = st === 'INPATIENT';
  return subBenefits.filter((sub) => {
    const ap = String(sub.accessPoint || '')
      .trim()
      .toLowerCase();
    if (!ap) return true;
    const both =
      ap.includes(' and ') ||
      (ap.includes('op') && ap.includes('ip')) ||
      ap.includes('op and ip');
    if (both) return true;
    const opOnly =
      ap === 'op' ||
      (ap.includes('outpatient') && !ap.includes('inpatient'));
    const ipOnly =
      ap === 'ip' ||
      (ap.includes('inpatient') && !ap.includes('outpatient'));
    if (wantInpatient) return !opOnly || both;
    return !ipOnly || both;
  });
}

function normalizeIntervention(row) {
  if (!row || typeof row !== 'object') return null;
  const code =
    row.interventionCode ||
    row.intervention_code ||
    row.code ||
    row.procedureCode ||
    null;
  const applicableRaw =
    row.applicableDocumentTypes ||
    row.applicable_document_types ||
    row.documentTypes ||
    row.document_types;
  const applicableDocumentTypes = Array.isArray(applicableRaw)
    ? applicableRaw.map((t) => String(t))
    : [];
  return {
    interventionCode: code ? String(code) : row.name ? String(row.name) : 'unknown',
    name: row.name || row.description || row.interventionName || code || 'Intervention',
    paymentMechanism: row.paymentMechanism || row.payment_mechanism || null,
    needsPreauth: Boolean(row.needsPreauth ?? row.needs_preauth),
    needsManualPreauthApproval: Boolean(
      row.needsManualPreauthApproval ?? row.needs_manual_preauth_approval
    ),
    accessPoint: row.accessPoint || row.access_point || null,
    fund: row.fund || null,
    applicableDocumentTypes,
  };
}

function sandboxSubBenefits(serviceType) {
  const st = String(serviceType || 'OUTPATIENT').toUpperCase();
  const byType = {
    CAPITATION: [
      {
        subBenefitCode: 'PHC-CAP',
        name: 'Sandbox PHC capitation package',
        fund: 'UHC',
        accessPoint: 'OP',
      },
      {
        subBenefitCode: 'PHC-IMMN',
        name: 'Sandbox immunization (PHC)',
        fund: 'UHC',
        accessPoint: 'OP',
      },
    ],
    INPATIENT: [
      {
        subBenefitCode: 'IP-WARD',
        name: 'Sandbox inpatient ward services',
        fund: 'SHIF',
        accessPoint: 'IP',
      },
      {
        subBenefitCode: 'IP-THEATER',
        name: 'Sandbox surgical (preauth likely)',
        fund: 'SHIF',
        accessPoint: 'IP',
      },
    ],
    EMERGENCY: [
      {
        subBenefitCode: 'ECCIF-ACUTE',
        name: 'Sandbox emergency acute care',
        fund: 'ECCIF',
        accessPoint: 'OP and IP',
      },
    ],
    OUTPATIENT: [
      {
        subBenefitCode: 'OP-GP',
        name: 'Sandbox outpatient consultation',
        fund: 'SHIF',
        accessPoint: 'OP',
      },
      {
        subBenefitCode: 'OP-LAB',
        name: 'Sandbox outpatient laboratory',
        fund: 'SHIF',
        accessPoint: 'OP',
      },
    ],
  };
  return byType[st] || byType.OUTPATIENT;
}

function sandboxInterventions(subBenefitCode) {
  const code = String(subBenefitCode || '').toUpperCase();
  const preauth = code.includes('THEATER') || code.includes('SURG');
  return [
    {
      interventionCode: `${code}-001`,
      name: `Sandbox intervention for ${subBenefitCode}`,
      paymentMechanism: preauth ? 'FEE_FOR_SERVICE' : 'FEE_FOR_SERVICE',
      needsPreauth: preauth,
      needsManualPreauthApproval: false,
      accessPoint: code.startsWith('IP') ? 'IP' : 'OP',
      fund: code.startsWith('PHC') ? 'UHC' : code.startsWith('ECCIF') ? 'ECCIF' : 'SHIF',
    },
    {
      interventionCode: `${code}-002`,
      name: 'Sandbox follow-up review',
      paymentMechanism: 'FEE_FOR_SERVICE',
      needsPreauth: false,
      needsManualPreauthApproval: false,
      accessPoint: 'OP',
      fund: 'SHIF',
    },
  ];
}

async function eclaimsGet(relativePath, query, settings = null) {
  const mode = resolveEclaimsReadMode();
  if (mode === 'disabled') {
    return { mode, skipped: true, reason: 'EClaims reads disabled (ELIGIBILITY_MODE=disabled)' };
  }
  if (!isAfyaConnectConfigured()) {
    return { mode, error: 'AfyaConnect OAuth not configured' };
  }
  const apiRoot = getApiRoot(settings);
  if (!apiRoot) {
    return { mode, error: 'SHA_BASE_URL or FHIR_BASE_URL required for live eClaims reads' };
  }
  const shrCfg = getShrConfig(settings);
  const root = apiRoot.endsWith('/') ? apiRoot.slice(0, -1) : apiRoot;
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const q = new URLSearchParams(query);
  const url = `${root}${path}?${q.toString()}`;
  const res = await afyaConnectFetch(url, {
    method: 'GET',
    headers: facilityHeaders(shrCfg.facilityFrCode),
  });
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    const traceId = data?.trace_id || data?.traceId || null;
    const upstream = data?.error && data.error !== data?.message ? String(data.error) : null;
    let errorMsg = data?.message || data?.error || text.slice(0, 200) || `HTTP ${res.status}`;
    if (upstream && !errorMsg.includes(upstream)) {
      errorMsg = `${errorMsg} (${upstream})`;
    }
    return {
      mode: 'live',
      error: errorMsg,
      httpStatus: res.status,
      traceId,
      upstreamError: upstream,
      body: data,
    };
  }
  return { mode: 'live', httpStatus: res.status, data };
}

/**
 * Phase I: parent benefits before sub-benefits (optional filter via parent_benefit_code).
 * @param {{ patientCrId?: string, memberCrNumber?: string }} params
 */
async function listShaParentBenefits(params = {}, settings = null) {
  const mode = resolveEclaimsReadMode();
  const patientCrId =
    params.patientCrId || params.memberCrNumber || params.crId || params.nupi || null;
  if (!patientCrId) {
    return { mode, error: 'patientCrId (member CR / NUPI) required' };
  }

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      patientCrId,
      parentBenefits: sandboxParentBenefits(),
      message:
        'Sandbox parent benefits — live uses GET /patients/benefits?patient_id= when ELIGIBILITY_MODE=live',
    };
  }

  const path = trimEnv('AFYACONNECT_PARENT_BENEFITS_PATH') || '/patients/benefits';
  const live = await eclaimsGet(path, { patient_id: String(patientCrId) }, settings);
  if (live.error) return { ...live, patientCrId };
  const raw = unwrapList(live.data, [
    'results',
    'parentBenefits',
    'parent_benefits',
    'benefits',
    'data',
  ]);
  const parentBenefits = raw.map(normalizeParentBenefit).filter(Boolean);
  return {
    mode: 'live',
    patientCrId,
    httpStatus: live.httpStatus,
    parentBenefits,
    raw: live.data,
  };
}

/**
 * @param {{ patientCrId?: string, memberCrNumber?: string, serviceType?: string }} params
 */
async function listShaSubBenefits(params = {}, settings = null) {
  const mode = resolveEclaimsReadMode();
  const patientCrId =
    params.patientCrId || params.memberCrNumber || params.crId || params.nupi || null;
  if (!patientCrId) {
    return { mode, error: 'patientCrId (member CR / NUPI) required' };
  }
  const serviceType = String(params.serviceType || 'OUTPATIENT').toUpperCase();

  const packResult = (allSubBenefits, extra = {}) => {
    const filtered = filterSubBenefitsByServiceType(allSubBenefits, serviceType);
    return {
      patientCrId,
      serviceType,
      subBenefits: filtered.length ? filtered : allSubBenefits,
      subBenefitsTotalFromApi: allSubBenefits.length,
      subBenefitsFilteredCount: filtered.length,
      visitTypeFilterApplied: filtered.length !== allSubBenefits.length,
      note:
        'Sub-benefits come from SHA for this member + facility (X-Facility-Id). The list is not the same as the eligibility service-type dropdown — use the dropdown for eligibility only; re-load sub-benefits after changing visit intent (OP vs IP).',
      ...extra,
    };
  };

  if (mode === 'sandbox') {
    const all = sandboxSubBenefits(serviceType);
    return {
      mode: 'sandbox',
      ...packResult(all),
      message:
        'Sandbox sub-benefits — live uses GET /patients/sub-benefits?patient_id= when ELIGIBILITY_MODE=live',
      doc: 'docs/DHA_AFYACONNECT_INTEGRATION_COVERAGE.md',
    };
  }

  const path = trimEnv('AFYACONNECT_SUB_BENEFITS_PATH') || '/patients/sub-benefits';
  const query = { patient_id: String(patientCrId) };
  const parentCode = params.parentBenefitCode || params.parent_benefit_code;
  if (parentCode) query.parent_benefit_code = String(parentCode);
  const live = await eclaimsGet(path, query, settings);
  if (live.error) return { ...live, patientCrId, serviceType };
  const raw = unwrapList(live.data, ['results', 'subBenefits', 'sub_benefits', 'data']);
  const allSubBenefits = raw.map(normalizeSubBenefit).filter(Boolean);
  return {
    mode: 'live',
    httpStatus: live.httpStatus,
    ...packResult(allSubBenefits),
    raw: live.data,
  };
}

/**
 * @param {{ patientCrId?: string, subBenefitCode: string }} params
 */
async function listShaInterventions(params = {}, settings = null) {
  const mode = resolveEclaimsReadMode();
  const patientCrId =
    params.patientCrId || params.memberCrNumber || params.crId || params.nupi || null;
  const subBenefitCode = params.subBenefitCode || params.sub_benefit_code;
  if (!patientCrId) return { mode, error: 'patientCrId required' };
  if (!subBenefitCode) return { mode, error: 'subBenefitCode required' };

  if (mode === 'sandbox') {
    return {
      mode: 'sandbox',
      patientCrId,
      subBenefitCode,
      interventions: sandboxInterventions(subBenefitCode),
      message:
        'Sandbox interventions — live uses GET /patients/benefits/interventions when ELIGIBILITY_MODE=live',
    };
  }

  const path =
    trimEnv('AFYACONNECT_INTERVENTIONS_PATH') || '/patients/benefits/interventions';
  const live = await eclaimsGet(
    path,
    { patient_id: String(patientCrId), sub_benefit_code: String(subBenefitCode) },
    settings
  );
  if (live.error) return { ...live, patientCrId, subBenefitCode };
  const raw = unwrapList(live.data, ['results', 'interventions', 'data']);
  const interventions = raw.map(normalizeIntervention).filter(Boolean);
  return {
    mode: 'live',
    patientCrId,
    subBenefitCode,
    httpStatus: live.httpStatus,
    interventions,
    raw: live.data,
  };
}

module.exports = {
  listShaParentBenefits,
  listShaSubBenefits,
  listShaInterventions,
  resolveEclaimsReadMode,
  filterSubBenefitsByServiceType,
};
