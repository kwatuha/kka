#!/usr/bin/env node
/**
 * Ops CLI: UAT SHR open-visits + config smoke (from repo root with .env loaded).
 * On VPS: node scripts/test-afyaconnect-shr.mjs
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { runUatShrSmokeTest } = require('../api/lib/afyaConnectShrSmokeTest.js');

const report = await runUatShrSmokeTest();
console.log('SHR smoke report:', JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
