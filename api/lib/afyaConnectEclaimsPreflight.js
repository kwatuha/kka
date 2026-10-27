/**
 * Admin preflight: eClaims read APIs (parent benefits + sub-benefits) on UAT member CR.
 */
const { trimEnv } = require('./afyaConnectEclaimsHttp');
const { resolveEligibilityMode, checkShaEligibility } = require('./afyaConnectEligibility');
const { listShaParentBenefits, listShaSubBenefits } = require('./afyaConnectEclaims');
const { analyzeMemberCoverage } = require('./afyaConnectMemberCoverage');

async function resolvePreflightMemberCrId() {
  const explicit = trimEnv('AFYACONNECT_PREFLIGHT_ECLAIMS_CR_ID');
  if (explicit) return explicit;
  const sampleId = trimEnv('AFYACONNECT_PREFLIGHT_ELIGIBILITY_ID') || '12345678';
  const idType = trimEnv('AFYACONNECT_PREFLIGHT_ELIGIBILITY_TYPE') || 'National ID';
  const elig = await checkShaEligibility({
    nationalId: sampleId,
    idType,
    serviceType: 'OUTPATIENT',
  });
  if (elig.error) return { error: elig.error, sampleId, idType };
  const cr = elig.memberCrNumber || elig.patient?.crId || null;
  if (!cr) {
    return {
      error: 'Could not resolve member CR from eligibility preflight sample',
      sampleId,
      idType,
    };
  }
  return { memberCrNumber: cr, sampleId, idType };
}

async function runPreflightEclaimsReadSmoke() {
  const mode = resolveEligibilityMode();
  if (mode === 'disabled') {
    return { ok: true, mode, skipped: true, reason: 'ELIGIBILITY_MODE=disabled' };
  }

  const crResolve = await resolvePreflightMemberCrId();
  if (crResolve.error) {
    return { ok: false, mode, error: crResolve.error, sampleId: crResolve.sampleId || null };
  }
  const patientCrId = crResolve.memberCrNumber;

  const parent = await listShaParentBenefits({ patientCrId });
  if (parent.error && parent.mode === 'live') {
    return {
      ok: false,
      mode,
      patientCrId,
      error: `Parent benefits: ${parent.error}`,
      parentBenefitsCount: 0,
    };
  }

  const parentCode = parent.parentBenefits?.[0]?.parentBenefitCode || null;
  const sub = await listShaSubBenefits({
    patientCrId,
    serviceType: 'OUTPATIENT',
    parentBenefitCode: parentCode || undefined,
  });
  if (sub.error && sub.mode === 'live') {
    return {
      ok: false,
      mode,
      patientCrId,
      parentBenefitsCount: parent.parentBenefits?.length ?? 0,
      error: `Sub-benefits: ${sub.error}`,
    };
  }

  const subCount = sub.subBenefits?.length ?? 0;
  const coverage = await analyzeMemberCoverage({ patientCrId }).catch((e) => ({
    error: e.message,
  }));

  const ok = mode === 'sandbox' || subCount > 0 || (parent.parentBenefits?.length ?? 0) > 0;
  return {
    ok,
    mode,
    patientCrId,
    sampleNationalId: crResolve.sampleId || null,
    parentBenefitsCount: parent.parentBenefits?.length ?? 0,
    subBenefitsCount: subCount,
    parentFilterUsed: Boolean(parentCode),
    outpatientSubBenefitsCount: coverage.outpatientSubBenefitsCount ?? subCount,
    inpatientSubBenefitsCount: coverage.inpatientSubBenefitsCount ?? null,
    inpatientPackagesAvailable: coverage.inpatientPackagesAvailable ?? null,
    parentBenefitCodes: coverage.parentBenefitCodes ?? null,
    witnessTracks: coverage.witnessTracks ?? null,
    uatSmokeNote: coverage.uatSmokeNote ?? null,
    error: ok
      ? null
      : 'Live eClaims read returned no parent/sub benefits — confirm UAT member and FR code',
  };
}

module.exports = {
  runPreflightEclaimsReadSmoke,
  resolvePreflightMemberCrId,
};
