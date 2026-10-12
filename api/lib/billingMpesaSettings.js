/**
 * Hospital-configurable M-Pesa Paybill / account reference (no code deploy when values change).
 * STK credentials remain in env (CLOUD_SASA_*); paybill + account prefix live in DB.
 */
const pool = require('../config/db');

let tableReady = false;

const DEFAULT_PAYBILL = String(process.env.MPESA_PAYBILL || '1269093').trim();
const DEFAULT_PREFIX = String(process.env.MPESA_ACCOUNT_PREFIX || 'AZ').trim();
const MAX_ACCOUNT_REF_LEN = 20;

async function ensureSettingsTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_mpesa_settings (
      settingId TINYINT NOT NULL PRIMARY KEY,
      paybillNumber VARCHAR(16) NOT NULL DEFAULT '1269093',
      accountPrefix VARCHAR(32) NOT NULL DEFAULT 'AZ',
      accountReferenceMode VARCHAR(32) NOT NULL DEFAULT 'prefix_invoice',
      stkEnabled TINYINT(1) NOT NULL DEFAULT 1,
      showPaybillInstructions TINYINT(1) NOT NULL DEFAULT 1,
      notes VARCHAR(512) NULL,
      updatedBy INT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(
    `INSERT IGNORE INTO billing_mpesa_settings
      (settingId, paybillNumber, accountPrefix, accountReferenceMode, stkEnabled, showPaybillInstructions)
     VALUES (1, ?, ?, 'prefix_invoice', 1, 1)`,
    [DEFAULT_PAYBILL || '1269093', DEFAULT_PREFIX || 'AZ']
  );
  tableReady = true;
}

function rowToSettings(row) {
  if (!row) {
    return {
      settingId: 1,
      paybillNumber: DEFAULT_PAYBILL || '1269093',
      accountPrefix: DEFAULT_PREFIX || 'AZ',
      accountReferenceMode: 'prefix_invoice',
      stkEnabled: true,
      showPaybillInstructions: true,
      notes: null,
    };
  }
  return {
    settingId: row.settingId,
    paybillNumber: String(row.paybillNumber || DEFAULT_PAYBILL || '1269093').trim(),
    accountPrefix: String(row.accountPrefix || DEFAULT_PREFIX || 'AZ').trim(),
    accountReferenceMode: row.accountReferenceMode || 'prefix_invoice',
    stkEnabled: row.stkEnabled !== 0,
    showPaybillInstructions: row.showPaybillInstructions !== 0,
    notes: row.notes || null,
    updatedAt: row.updatedAt,
  };
}

async function loadSettings() {
  await ensureSettingsTable();
  const [rows] = await pool.execute(
    `SELECT * FROM billing_mpesa_settings WHERE settingId = 1 LIMIT 1`
  );
  return rowToSettings(rows[0]);
}

function sanitizeAccountReference(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9\-_/]/g, '')
    .slice(0, MAX_ACCOUNT_REF_LEN);
}

/**
 * Build Lipa na M-Pesa Paybill account number shown to patients / sent to provider when supported.
 * @param {object} settings - from loadSettings()
 * @param {{ invoiceNumber?: string, invoiceId?: number, patientNumber?: string, patientId?: number }} ctx
 */
function buildAccountReference(settings, ctx = {}) {
  const prefix = (settings?.accountPrefix || DEFAULT_PREFIX || 'AZ').trim();
  const mode = settings?.accountReferenceMode || 'prefix_invoice';

  switch (mode) {
    case 'prefix_only':
      return sanitizeAccountReference(prefix);
    case 'prefix_patient': {
      const id = ctx.patientNumber || (ctx.patientId != null ? String(ctx.patientId) : '');
      return sanitizeAccountReference(id ? `${prefix}-${id}` : prefix);
    }
    case 'prefix_invoice_short': {
      const tail = String(ctx.invoiceNumber || '').split('-').pop() || ctx.invoiceId;
      return sanitizeAccountReference(`${prefix}${tail || ''}`);
    }
    case 'prefix_invoice':
    default: {
      const inv = ctx.invoiceNumber || (ctx.invoiceId != null ? `INV${ctx.invoiceId}` : '');
      return sanitizeAccountReference(inv ? `${prefix}-${inv}` : prefix);
    }
  }
}

async function updateSettings(payload, updatedBy = null) {
  await ensureSettingsTable();
  const allowedModes = ['prefix_only', 'prefix_invoice', 'prefix_invoice_short', 'prefix_patient'];
  const updates = [];
  const values = [];

  if (payload.paybillNumber !== undefined) {
    const pb = String(payload.paybillNumber || '').replace(/\D/g, '');
    if (!pb || pb.length < 5) {
      const err = new Error('Paybill number must be at least 5 digits.');
      err.code = 'invalid_paybill';
      throw err;
    }
    updates.push('paybillNumber = ?');
    values.push(pb.slice(0, 16));
  }
  if (payload.accountPrefix !== undefined) {
    const ap = String(payload.accountPrefix || '').trim();
    if (!ap) {
      const err = new Error('Account prefix is required.');
      err.code = 'invalid_prefix';
      throw err;
    }
    updates.push('accountPrefix = ?');
    values.push(ap.slice(0, 32));
  }
  if (payload.accountReferenceMode !== undefined) {
    const mode = String(payload.accountReferenceMode);
    if (!allowedModes.includes(mode)) {
      const err = new Error(`accountReferenceMode must be one of: ${allowedModes.join(', ')}`);
      err.code = 'invalid_mode';
      throw err;
    }
    updates.push('accountReferenceMode = ?');
    values.push(mode);
  }
  if (payload.stkEnabled !== undefined) {
    updates.push('stkEnabled = ?');
    values.push(payload.stkEnabled ? 1 : 0);
  }
  if (payload.showPaybillInstructions !== undefined) {
    updates.push('showPaybillInstructions = ?');
    values.push(payload.showPaybillInstructions ? 1 : 0);
  }
  if (payload.notes !== undefined) {
    updates.push('notes = ?');
    values.push(payload.notes ? String(payload.notes).slice(0, 512) : null);
  }

  if (!updates.length) {
    const err = new Error('No settings to update');
    err.code = 'empty_update';
    throw err;
  }

  updates.push('updatedBy = ?');
  values.push(updatedBy);

  await pool.execute(
    `UPDATE billing_mpesa_settings SET ${updates.join(', ')} WHERE settingId = 1`,
    values
  );
  return loadSettings();
}

function isAdminUser(req) {
  const role =
    req.user?.roleName ||
    req.user?.role ||
    req.user?.role?.roleName ||
    '';
  const rn = String(role).toLowerCase();
  return rn === 'admin' || rn.includes('admin') || rn === 'system administrator';
}

module.exports = {
  ensureSettingsTable,
  loadSettings,
  updateSettings,
  buildAccountReference,
  sanitizeAccountReference,
  isAdminUser,
  MAX_ACCOUNT_REF_LEN,
};
