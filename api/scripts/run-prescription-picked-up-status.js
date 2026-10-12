#!/usr/bin/env node
/**
 * Add 'picked_up' to prescriptions.status ENUM.
 * Run from project root: node api/scripts/run-prescription-picked-up-status.js
 */
const pool = require('../config/db');

const SQL = `ALTER TABLE prescriptions
MODIFY COLUMN status ENUM('pending', 'dispensed', 'picked_up', 'cancelled', 'expired') DEFAULT 'pending'`;

async function run() {
  try {
    await pool.execute(SQL);
    console.log('Migration completed: prescriptions.status now includes picked_up.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
