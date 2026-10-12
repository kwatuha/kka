#!/usr/bin/env node
/**
 * Generate IDSR weekly aggregate package (DHA Phase 10).
 * Usage: node api/scripts/run-idsr-weekly-export.js [YYYY-MM-DD reference date]
 */
const pool = require('../config/db');
const { exportWeeklyIdsrPackage } = require('../lib/idsrWeeklyExporter');

async function main() {
  const ref = process.argv[2] || null;
  const result = await exportWeeklyIdsrPackage(pool, { referenceDate: ref });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
