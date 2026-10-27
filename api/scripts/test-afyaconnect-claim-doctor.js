#!/usr/bin/env node
/**
 * Ops CLI: HWR claim-doctor resolution (env, SHR PUID, DB users with hwrPuid).
 * Usage:
 *   docker compose -f docker-compose.kakamega-shared-mysql.yml exec api node scripts/test-afyaconnect-claim-doctor.js
 * Local:
 *   set -a && source deploy/.env.kakamega && set +a && node api/scripts/test-afyaconnect-claim-doctor.js
 *
 * Optional: AFYACONNECT_CLAIM_DOCTOR_SMOKE_CONSENT_TOKEN=<consent_token> to POST /claims/doctors
 */
const pool = require('../config/db');
const { runUatClaimDoctorSmokeTest } = require('../lib/afyaConnectClaimDoctorSmokeTest');

runUatClaimDoctorSmokeTest({ pool })
  .then((report) => {
    console.log('Claim doctor smoke report:', JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
