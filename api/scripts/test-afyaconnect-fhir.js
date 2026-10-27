#!/usr/bin/env node
/**
 * Ops CLI: UAT SHR bundle connectivity smoke (POST /shr/bundles).
 * Usage: docker compose … exec api node scripts/test-afyaconnect-fhir.js
 */
const { runUatFhirSmokeTest } = require('../lib/afyaConnectFhirSmokeTest');

runUatFhirSmokeTest()
  .then((report) => {
    console.log('FHIR smoke report:', JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
