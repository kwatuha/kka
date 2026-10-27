/**
 * Map DHA GET /patients/eligibility payloads to HMIS summary fields.
 * @see https://hie-docs.dha.go.ke/eclaims/eligibility
 */

function pickStr(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function unwrapEligibilityBody(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.message && typeof data.message === 'object' && !Array.isArray(data.message)) {
    const inner = data.message;
    if (
      inner.schemes ||
      inner.memberCrNumber ||
      inner.statusCode != null ||
      inner.statusDesc ||
      inner.fullName ||
      inner.eligible != null
    ) {
      return inner;
    }
  }
  return data;
}

function normalizeSchemes(raw) {
  const body = unwrapEligibilityBody(raw) || raw;
  const list = body?.schemes;
  if (!Array.isArray(list)) return [];
  return list.map((s) => {
    const coverage = s?.coverage && typeof s.coverage === 'object' ? s.coverage : {};
    return {
      schemeName: pickStr(s, 'schemeName', 'scheme_name') || null,
      schemeId: s?.schemeId ?? s?.scheme_id ?? null,
      memberType: pickStr(s, 'memberType', 'member_type'),
      coverageStatus: pickStr(coverage, 'status', 'coverageStatus'),
      coverageReason: pickStr(coverage, 'reason'),
      coverageMessage: pickStr(coverage, 'message'),
      possibleSolution: pickStr(coverage, 'possibleSolution', 'possible_solution'),
      policyNumber: pickStr(s?.policy, 'number') || pickStr(s, 'policyNumber'),
      policyStart: pickStr(s?.policy, 'startDate', 'start_date'),
      policyEnd: pickStr(s?.policy, 'endDate', 'end_date'),
    };
  });
}

function isActiveCoverage(status) {
  const raw = status;
  const s = String(status ?? '').trim().toLowerCase();
  if (s === '1' || raw === 1) return true;
  if (s === '0' || raw === 0) return false;
  return s === 'active' || s.includes('active') || s === 'covered' || s === 'eligible';
}

/** DHA statusCode "10" = member found (UAT may use other codes). */
function isMemberFoundStatus(statusCode, statusDesc) {
  const code = String(statusCode ?? '').trim();
  if (code === '10') return true;
  const desc = String(statusDesc || '').toLowerCase();
  if (desc.includes('member found') || desc.includes('member active')) return true;
  return false;
}

function schemeMatchesServiceType(schemeName, serviceType) {
  const name = String(schemeName || '').toUpperCase();
  const st = String(serviceType || 'OUTPATIENT').toUpperCase();
  if (st === 'CAPITATION') {
    return name.startsWith('POMSF') || name.includes('PHC') || name.includes('CAPITATION');
  }
  if (st === 'EMERGENCY') {
    return name.includes('ECCIF') || name.includes('EMERGENCY');
  }
  if (st === 'INPATIENT' || st === 'OUTPATIENT') {
    return !name.startsWith('POMSF') || name.includes('SHIF') || name.includes('UHC');
  }
  return true;
}

/**
 * @param {unknown} raw — parsed JSON from eligibility API
 * @param {{ serviceType?: string }} [ctx]
 */
function mapEligibilityResponse(raw, ctx = {}) {
  const body = unwrapEligibilityBody(raw) || {};
  const serviceType = String(ctx.serviceType || 'OUTPATIENT').toUpperCase();
  const schemes = normalizeSchemes(raw);

  const statusCode = pickStr(body, 'statusCode', 'status_code', 'ep_code', 'status');
  const statusDesc =
    pickStr(body, 'statusDesc', 'status_desc', 'statusDescription') ||
    pickStr(body, 'message') ||
    null;
  const memberCrNumber =
    pickStr(body, 'memberCrNumber', 'member_cr_number', 'patient_id', 'id') || null;
  const fullName = pickStr(body, 'fullName', 'full_name') || null;

  const legacyEligible = body.eligible ?? body.isEligible ?? body.eligible_nhif;
  const memberFound =
    Boolean(memberCrNumber) ||
    isMemberFoundStatus(statusCode, statusDesc) ||
    schemes.length > 0 ||
    legacyEligible === 1 ||
    legacyEligible === true;

  const relevantSchemes = schemes.filter((s) => schemeMatchesServiceType(s.schemeName, serviceType));
  const pool = relevantSchemes.length ? relevantSchemes : schemes;
  const activeSchemes = pool.filter((s) => isActiveCoverage(s.coverageStatus));
  let eligible =
    memberFound && activeSchemes.length > 0
      ? true
      : memberFound && pool.length > 0
        ? false
        : memberFound
          ? null
          : false;
  if (eligible == null && (legacyEligible === 1 || legacyEligible === true)) eligible = true;
  if (eligible == null && (legacyEligible === 0 || legacyEligible === false)) eligible = false;

  let coverageStatus = statusDesc || statusCode || null;
  if (activeSchemes.length) {
    coverageStatus = activeSchemes.map((s) => `${s.schemeName || 'scheme'}:${s.coverageStatus}`).join('; ');
  } else if (pool.length) {
    coverageStatus =
      pool.map((s) => `${s.schemeName || 'scheme'}:${s.coverageStatus || 'unknown'}`).join('; ') ||
      coverageStatus;
  }

  const firstInactive = pool.find((s) => !isActiveCoverage(s.coverageStatus));
  const message =
    activeSchemes[0]?.coverageMessage ||
    firstInactive?.coverageMessage ||
    firstInactive?.coverageReason ||
    statusDesc ||
    (memberFound ? 'Member located; review scheme coverage below.' : 'Member not found or no schemes returned.');

  return {
    eligible,
    memberFound,
    coverageStatus,
    message,
    memberCrNumber,
    fullName,
    statusCode,
    statusDesc,
    isAlive: body.isAlive ?? body.is_alive ?? null,
    whitelistedForOTP: body.whitelistedForOTP ?? body.whitelisted_for_otp ?? null,
    facilityBiometricsEnforced:
      body.facilityBiometricsEnforced ?? body.facility_biometrics_enforced ?? null,
    schemesSummary: schemes,
    schemesForServiceType: pool,
    activeSchemeCount: activeSchemes.length,
    serviceType,
  };
}

module.exports = {
  mapEligibilityResponse,
  unwrapEligibilityBody,
  normalizeSchemes,
};
