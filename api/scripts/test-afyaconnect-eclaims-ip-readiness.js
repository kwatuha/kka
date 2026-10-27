#!/usr/bin/env node
/**
 * UAT: can this member + FR run SHIF inpatient witness (IP sub-benefits / SHA-07)?
 * Usage: docker compose … exec api node scripts/test-afyaconnect-eclaims-ip-readiness.js
 */
const { testAfyaConnectAuth } = require('../lib/afyaConnectAuth');
const { resolvePreflightMemberCrId } = require('../lib/afyaConnectEclaimsPreflight');
const { analyzeMemberCoverage } = require('../lib/afyaConnectMemberCoverage');

async function main() {
  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    console.error('OAuth failed:', auth);
    process.exit(1);
  }
  const crResolve = await resolvePreflightMemberCrId();
  if (crResolve.error) {
    console.error('CR resolve failed:', crResolve);
    process.exit(1);
  }
  const coverage = await analyzeMemberCoverage({ patientCrId: crResolve.memberCrNumber });
  const ipReady = coverage.inpatientPackagesAvailable === true;
  console.log(
    JSON.stringify(
      {
        ok: ipReady,
        patientCrId: coverage.patientCrId,
        parentBenefitCodes: coverage.parentBenefitCodes,
        outpatientSubBenefitsCount: coverage.outpatientSubBenefitsCount,
        inpatientSubBenefitsCount: coverage.inpatientSubBenefitsCount,
        inpatientPackagesAvailable: coverage.inpatientPackagesAvailable,
        witnessTracks: coverage.witnessTracks,
        uatSmokeNote: coverage.uatSmokeNote,
        dhaContact: coverage.dhaContact,
      },
      null,
      2
    )
  );
  process.exit(ipReady ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
