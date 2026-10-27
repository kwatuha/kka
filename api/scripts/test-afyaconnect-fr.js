#!/usr/bin/env node
/**
 * Ops CLI: OAuth + documented UAT Facility Registry smoke cases.
 * Usage: docker compose … exec api node scripts/test-afyaconnect-fr.js
 */
const { runUatFrSmokeTests } = require('../lib/afyaConnectFrSmokeTest');
const { listUatFrTestCases } = require('../lib/afyaConnectUatTestFacilities');

console.log('UAT FR test cases:', JSON.stringify(listUatFrTestCases(), null, 2));

runUatFrSmokeTests()
  .then((report) => {
    console.log('FR smoke report:', JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
