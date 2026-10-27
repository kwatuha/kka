#!/usr/bin/env node
/**
 * Ops CLI: OAuth + documented UAT Client Registry smoke cases.
 * Usage:
 *   docker compose -f docker-compose.kakamega-shared-mysql.yml exec api node scripts/test-afyaconnect-cr.js
 * Local (repo root):
 *   set -a && source deploy/.env.kakamega && set +a && node api/scripts/test-afyaconnect-cr.js
 */
const { runUatCrSmokeTests } = require('../lib/afyaConnectCrSmokeTest');
const { listUatCrTestCases } = require('../lib/afyaConnectUatTestIds');

console.log('UAT CR test cases:', JSON.stringify(listUatCrTestCases(), null, 2));

runUatCrSmokeTests()
  .then((report) => {
    console.log('CR smoke report:', JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
