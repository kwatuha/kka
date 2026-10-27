#!/usr/bin/env node
/**
 * Ops CLI: UAT Client Registry smoke (local dev from repo root).
 * On VPS / API container: node scripts/test-afyaconnect-cr.js
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { runUatCrSmokeTests } = require('../api/lib/afyaConnectCrSmokeTest.js');
const { listUatCrTestCases } = require('../api/lib/afyaConnectUatTestIds.js');

console.log('UAT CR test cases:', JSON.stringify(listUatCrTestCases(), null, 2));

const report = await runUatCrSmokeTests();
console.log('CR smoke report:', JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
