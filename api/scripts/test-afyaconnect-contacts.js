#!/usr/bin/env node
/**
 * Ops CLI: patient contacts for claims OTP.
 *   docker compose -f docker-compose.kakamega-shared-mysql.yml exec api node scripts/test-afyaconnect-contacts.js
 */
const { testAfyaConnectAuth } = require('../lib/afyaConnectAuth');
const { listPatientContacts } = require('../lib/afyaConnectClaimsConsent');
const { resolvePreflightMemberCrId } = require('../lib/afyaConnectEclaimsPreflight');

async function main() {
  const auth = await testAfyaConnectAuth();
  if (!auth.ok) {
    console.error('OAuth failed:', auth);
    process.exit(1);
  }
  const cr = await resolvePreflightMemberCrId();
  if (cr.error) {
    console.error(cr);
    process.exit(1);
  }
  const result = await listPatientContacts({ patientCrId: cr.memberCrNumber });
  console.log(JSON.stringify({ auth: { ok: true }, memberCr: cr.memberCrNumber, ...result }, null, 2));
  process.exit(result.error && result.mode === 'live' ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
