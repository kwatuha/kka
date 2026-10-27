#!/usr/bin/env node
/**
 * Ops CLI: eClaims read (parent benefits + sub-benefits) for UAT member.
 * Usage:
 *   docker compose -f docker-compose.kakamega-shared-mysql.yml exec api node scripts/test-afyaconnect-eclaims-read.js
 * Local:
 *   set -a && source deploy/.env.kakamega && set +a && node api/scripts/test-afyaconnect-eclaims-read.js
 *
 * Optional env:
 *   AFYACONNECT_PREFLIGHT_ECLAIMS_CR_ID=   # member CR / NUPI (else from eligibility on 12345678)
 */
const { testAfyaConnectAuth } = require('../lib/afyaConnectAuth');
const {
  runPreflightEclaimsReadSmoke,
  resolvePreflightMemberCrId,
} = require('../lib/afyaConnectEclaimsPreflight');
const { listShaParentBenefits, listShaSubBenefits } = require('../lib/afyaConnectEclaims');

async function main() {
  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    console.error('OAuth failed:', auth);
    process.exit(1);
  }

  const crResolve = await resolvePreflightMemberCrId();
  if (crResolve.error) {
    console.error('Member CR resolve failed:', crResolve);
    process.exit(1);
  }
  const patientCrId = crResolve.memberCrNumber;

  const parent = await listShaParentBenefits({ patientCrId });
  const parentCode = parent.parentBenefits?.[0]?.parentBenefitCode || null;
  const sub = await listShaSubBenefits({
    patientCrId,
    serviceType: 'OUTPATIENT',
    parentBenefitCode: parentCode || undefined,
  });

  const smoke = await runPreflightEclaimsReadSmoke();
  console.log(
    JSON.stringify(
      {
        auth: { ok: true, tokenUrlHost: auth.tokenUrlHost },
        patientCrId,
        parent,
        subBenefits: {
          mode: sub.mode,
          count: sub.subBenefits?.length ?? 0,
          parentFilter: parentCode,
          error: sub.error || null,
        },
        preflightAggregate: smoke,
      },
      null,
      2
    )
  );
  process.exit(smoke.ok !== false ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
