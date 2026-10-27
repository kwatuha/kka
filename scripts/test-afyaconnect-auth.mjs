#!/usr/bin/env node
/**
 * Ops CLI: test AfyaConnect OAuth (local dev from repo root).
 * On VPS / API container use: node scripts/test-afyaconnect-auth.js
 * CR smoke: node scripts/test-afyaconnect-cr.js (see docs/DHA_UAT_CR_TEST_IDS.md)
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { testAfyaConnectAuth, getAfyaConnectPublicStatus } = require('../api/lib/afyaConnectAuth.js');

const status = getAfyaConnectPublicStatus();
console.log('AfyaConnect status:', JSON.stringify(status, null, 2));

const result = await testAfyaConnectAuth();
console.log('OAuth test:', JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
