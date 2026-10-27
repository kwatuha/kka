#!/usr/bin/env node
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { runUatFrSmokeTests } = require('../api/lib/afyaConnectFrSmokeTest.js');
const { listUatFrTestCases } = require('../api/lib/afyaConnectUatTestFacilities.js');

console.log('UAT FR test cases:', JSON.stringify(listUatFrTestCases(), null, 2));

const report = await runUatFrSmokeTests();
console.log('FR smoke report:', JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
