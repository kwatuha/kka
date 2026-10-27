#!/usr/bin/env node
/**
 * Add hptCode to medications and prescription_items (national HPT / e-prescribing).
 * Run from project root: node api/scripts/run-prescription-hpt-code-migration.js
 */
const pool = require('../config/db');

async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`Skip: ${table}.${column} already exists`);
    return;
  }
  await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  console.log(`Added: ${table}.${column}`);
}

async function run() {
  try {
    await addColumnIfMissing(
      'medications',
      'hptCode',
      '`hptCode` VARCHAR(32) NULL COMMENT \'Kenya HPT catalog code\' AFTER `medicationCode`'
    );
    await addColumnIfMissing(
      'prescription_items',
      'hptCode',
      '`hptCode` VARCHAR(32) NULL COMMENT \'HPT code at time of prescribing\' AFTER `medicationName`'
    );
    console.log('Migration completed: prescription HPT columns ready.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
