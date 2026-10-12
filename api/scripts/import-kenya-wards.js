#!/usr/bin/env node
/**
 * Import IEBC ward catalog (runs inside API container or from api/ directory).
 *   node scripts/import-kenya-wards.js [--truncate]
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const pool = require('../config/db');

const CSV_PATH = path.join(__dirname, '../data/Kenya_wards.csv');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function mapRow(cols) {
  const [iebcWardName, wardCount, province, district, division, pcode, status] = cols;
  if (!iebcWardName || iebcWardName === 'IEBC_WARDS') return null;
  const county = district ? String(district).trim() : null;
  const subcounty = division ? String(division).trim() : null;
  return {
    iebcWardName: String(iebcWardName).trim(),
    wardCount: wardCount ? parseInt(wardCount, 10) || null : null,
    province: province ? String(province).trim() : null,
    district: county,
    division: subcounty,
    subcounty,
    county,
    constituency: null,
    pcode: pcode ? String(pcode).trim() : null,
    status: status ? String(status).trim() : null,
  };
}

async function ensureTable() {
  const sqlPath = path.join(__dirname, '../database/138_kenya_wards.sql');
  const ddl = fs.readFileSync(sqlPath, 'utf8');
  const create = ddl.replace(/^[\s\S]*?(CREATE TABLE)/i, '$1').trim();
  if (create) await pool.execute(create);
}

async function main() {
  const truncate = process.argv.includes('--truncate');
  if (!fs.existsSync(CSV_PATH)) {
    console.error('Missing CSV:', CSV_PATH);
    process.exit(1);
  }

  await ensureTable();
  if (truncate) await pool.execute('TRUNCATE TABLE kenya_wards');

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let inserted = 0;
  let skipped = 0;
  const batch = [];
  const BATCH = 200;
  let gen = 0;

  async function flushBatch() {
    if (!batch.length) return;
    const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',');
    const values = batch.flatMap((r) => [
      r.iebcWardName,
      r.wardCount,
      r.province,
      r.district,
      r.division,
      r.subcounty,
      r.county,
      r.constituency,
      r.pcode,
      r.status,
    ]);
    await pool.execute(
      `INSERT INTO kenya_wards (
        iebcWardName, wardCount, province, district, division,
        subcounty, county, constituency, pcode, status
      ) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        iebcWardName = VALUES(iebcWardName),
        wardCount = VALUES(wardCount),
        province = VALUES(province),
        district = VALUES(district),
        division = VALUES(division),
        subcounty = VALUES(subcounty),
        county = VALUES(county),
        updatedAt = CURRENT_TIMESTAMP`,
      values
    );
    inserted += batch.length;
    batch.length = 0;
  }

  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = mapRow(parseCsvLine(line));
    if (!row?.iebcWardName) {
      skipped += 1;
      continue;
    }
    if (!row.pcode) {
      gen += 1;
      row.pcode = `GEN-${gen}`;
    }
    batch.push(row);
    if (batch.length >= BATCH) await flushBatch();
  }
  await flushBatch();

  const [[{ c }]] = await pool.execute('SELECT COUNT(*) AS c FROM kenya_wards WHERE voided = 0');
  console.log(`Import done. Rows this run: ${inserted}, skipped: ${skipped}, table total: ${c}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
