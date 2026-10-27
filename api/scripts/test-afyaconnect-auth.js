#!/usr/bin/env node
/**
 * Ops CLI: test AfyaConnect OAuth from the API container env.
 * Usage:
 *   docker compose -f docker-compose.kakamega-shared-mysql.yml exec api node scripts/test-afyaconnect-auth.js
 */
const {
  testAfyaConnectAuth,
  getAfyaConnectPublicStatus,
} = require('../lib/afyaConnectAuth');

const status = getAfyaConnectPublicStatus();
console.log('AfyaConnect status:', JSON.stringify(status, null, 2));

testAfyaConnectAuth()
  .then((result) => {
    console.log('OAuth test:', JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
