#!/usr/bin/env node
/**
 * Add recordedPickupBy column to nurse_pickups (pharmacist who recorded the pickup).
 * Run from project root: node api/scripts/run-nurse-pickup-recorded-pickup-by.js
 */
const pool = require('../config/db');

async function run() {
  try {
    await pool.execute(
      `ALTER TABLE nurse_pickups ADD COLUMN recordedPickupBy INT NULL AFTER pickedUpBy`
    );
    console.log('Added column recordedPickupBy.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column recordedPickupBy already exists.');
    } else {
      console.error(err.message);
      process.exit(1);
    }
  }

  try {
    await pool.execute(
      `ALTER TABLE nurse_pickups ADD CONSTRAINT fk_nurse_pickups_recorded_pickup_by
       FOREIGN KEY (recordedPickupBy) REFERENCES users(userId) ON DELETE SET NULL`
    );
    console.log('Added foreign key fk_nurse_pickups_recorded_pickup_by.');
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_FK_DUP_NAME') {
      console.log('Foreign key already exists.');
    } else {
      console.error(err.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

run();
