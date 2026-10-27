#!/usr/bin/env node
/**
 * Ops CLI: UAT SHR open-visits smoke (run inside API container or from api/).
 */
const { runUatShrSmokeTest } = require('../lib/afyaConnectShrSmokeTest');

runUatShrSmokeTest()
  .then((report) => {
    console.log('SHR smoke report:', JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
