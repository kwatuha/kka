#!/usr/bin/env node
/**
 * List UAT interventions with needsPreauth across known CR test IDs.
 * @see docs/DHA_UAT_CR_TEST_IDS.md
 *
 *   docker compose -f docker-compose.kakamega-shared-mysql.yml exec api node scripts/test-afyaconnect-preauth-discovery.js
 */
const { testAfyaConnectAuth } = require('../lib/afyaConnectAuth');
const { UAT_CR_TEST_CASES } = require('../lib/afyaConnectUatTestIds');
const { listShaParentBenefits, listShaSubBenefits, listShaInterventions } = require('../lib/afyaConnectEclaims');

const SERVICE_TYPES = ['OUTPATIENT', 'INPATIENT', 'EMERGENCY'];

async function scanCr(patientCrId) {
  const row = { patientCrId, parentBenefitCodes: [], preauthInterventions: [], errors: [] };
  const parent = await listShaParentBenefits({ patientCrId });
  if (parent.error) {
    row.errors.push({ step: 'parent', error: parent.error });
    return row;
  }
  row.parentBenefitCodes = (parent.parentBenefits || []).map((p) => p.parentBenefitCode).filter(Boolean);

  const seen = new Set();
  for (const serviceType of SERVICE_TYPES) {
    const sub = await listShaSubBenefits({ patientCrId, serviceType });
    if (sub.error) {
      row.errors.push({ step: 'subBenefits', serviceType, error: sub.error });
      continue;
    }
    for (const sb of sub.subBenefits || []) {
      const subBenefitCode = sb.subBenefitCode || sb.code;
      if (!subBenefitCode) continue;
      const iv = await listShaInterventions({ patientCrId, subBenefitCode });
      if (iv.error) {
        row.errors.push({ step: 'interventions', subBenefitCode, error: iv.error });
        continue;
      }
      for (const i of iv.interventions || []) {
        if (!i.needsPreauth && !i.needsManualPreauthApproval) continue;
        const key = `${subBenefitCode}:${i.interventionCode}`;
        if (seen.has(key)) continue;
        seen.add(key);
        row.preauthInterventions.push({
          subBenefitCode,
          serviceType,
          interventionCode: i.interventionCode,
          name: i.name,
          needsPreauth: i.needsPreauth,
          needsManualPreauthApproval: i.needsManualPreauthApproval,
          accessPoint: i.accessPoint,
          fund: i.fund,
        });
      }
    }
  }
  return row;
}

async function main() {
  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    console.error('OAuth failed:', auth);
    process.exit(1);
  }

  const crIds = [
    ...new Set(
      UAT_CR_TEST_CASES.map((c) => c.expectedCrId).filter(Boolean)
    ),
  ];

  const results = [];
  for (const patientCrId of crIds) {
    results.push(await scanCr(patientCrId));
  }

  const withPreauth = results.filter((r) => r.preauthInterventions.length > 0);
  console.log(
    JSON.stringify(
      {
        scannedAt: new Date().toISOString(),
        crsScanned: crIds.length,
        crsWithPreauthInterventions: withPreauth.length,
        results,
        recommendation:
          withPreauth[0]?.preauthInterventions[0]
            ? {
                patientCrId: withPreauth[0].patientCrId,
                useIntervention: withPreauth[0].preauthInterventions[0],
              }
            : 'No needsPreauth interventions on known UAT CRs — email afyaconnect.dha@gmail.com',
      },
      null,
      2
    )
  );
  process.exit(withPreauth.length > 0 ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
