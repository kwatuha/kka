#!/usr/bin/env node
/**
 * Add 'ready_for_pickup' to nurse_pickups.status ENUM.
 * Run from project root: node api/scripts/run-nurse-pickup-status-migration.js
 */
const pool = require('../config/db');

const SQL = `ALTER TABLE nurse_pickups
MODIFY COLUMN status ENUM('pending', 'ready_for_pickup', 'picked_up', 'cancelled') DEFAULT 'pending'`;

async function run() {
  try {
    await pool.execute(SQL);
    console.log('Migration completed: nurse_pickups.status now includes ready_for_pickup.');
  } catch (err) {
    if (err.code === 'ER_PARSE_ERROR' || err.message?.includes('Data truncated')) {
      console.error('Migration failed. If the column already has the new ENUM, this is safe to ignore.');
    }
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
