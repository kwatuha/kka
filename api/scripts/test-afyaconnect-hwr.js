#!/usr/bin/env node
/**
 * Ops CLI: Health Worker Registry search (KMPDC reg or National ID).
 * Usage:
 *   docker compose -f docker-compose.kakamega-shared-mysql.yml exec api node scripts/test-afyaconnect-hwr.js
 * Local:
 *   set -a && source deploy/.env.kakamega && set +a && node api/scripts/test-afyaconnect-hwr.js
 *
 * Optional env:
 *   AFYACONNECT_HWR_TEST_REGISTRATION=A7000
 *   AFYACONNECT_HWR_TEST_ID_TYPE=registration_number
 */
const { trimEnv } = require('../lib/afyaConnectEclaimsHttp');
const { testAfyaConnectAuth } = require('../lib/afyaConnectAuth');
const { searchHealthWorker } = require('../lib/afyaConnectHealthWorkerRegistry');

async function main() {
  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    console.error('OAuth failed:', auth);
    process.exit(1);
  }
  const num =
    trimEnv('AFYACONNECT_HWR_TEST_REGISTRATION') ||
    trimEnv('AFYACONNECT_CLAIM_DOCTOR_ID_NUMBER') ||
    'A7000';
  const idType = trimEnv('AFYACONNECT_HWR_TEST_ID_TYPE') || 'registration_number';
  const result = await searchHealthWorker({
    identificationNumber: num,
    identificationType: idType,
    regulator: trimEnv('AFYACONNECT_CLAIM_DOCTOR_REGULATION_BODY') || 'KMPDC',
  });
  console.log(JSON.stringify({ auth: { ok: true, tokenUrlHost: auth.tokenUrlHost }, ...result }, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
