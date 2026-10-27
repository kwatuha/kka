/**
 * Admin-configurable KRA eTIMS (OSCU / VSCU) settings for HMIS billing.
 * @see https://www.kra.go.ke/business/etims-electronic-tax-invoice-management-system/learn-about-etims/etims-system-to-system-integration
 */
const pool = require('../config/db');

let tableReady = false;

const DEFAULT_SANDBOX_API = 'https://etims-api-sbx.kra.go.ke';
const DEFAULT_PRODUCTION_API = 'https://etims-api.kra.go.ke';
const DEFAULT_VSCU_LOCAL = 'http://127.0.0.1:8088';

async function ensureSettingsTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_etims_settings (
      settingId TINYINT NOT NULL PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      integrationMode ENUM('disabled', 'oscu', 'vscu') NOT NULL DEFAULT 'disabled',
      environment ENUM('sandbox', 'production') NOT NULL DEFAULT 'sandbox',
      kraPin VARCHAR(16) NULL,
      branchOfficeId VARCHAR(32) NULL,
      deviceSerialNumber VARCHAR(64) NULL,
      traderName VARCHAR(200) NULL,
      apiBaseUrl VARCHAR(512) NULL,
      vscuLocalBaseUrl VARCHAR(512) NULL,
      communicationKey VARCHAR(512) NULL,
      defaultTaxRateCode VARCHAR(16) NULL,
      autoSubmitOnInvoicePaid TINYINT(1) NOT NULL DEFAULT 0,
      notes VARCHAR(512) NULL,
      updatedBy INT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(
    `INSERT IGNORE INTO billing_etims_settings (settingId, integrationMode, environment)
     VALUES (1, 'disabled', 'sandbox')`
  );
  tableReady = true;
}

function trimOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function defaultApiBase(environment) {
  const env = String(environment || 'sandbox').toLowerCase();
  return env === 'production' ? DEFAULT_PRODUCTION_API : DEFAULT_SANDBOX_API;
}

function maskSecret(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  if (s.length <= 4) return '****';
  return `****${s.slice(-4)}`;
}

function rowToInternal(row) {
  if (!row) {
    return {
      settingId: 1,
      enabled: false,
      integrationMode: 'disabled',
      environment: 'sandbox',
      kraPin: null,
      branchOfficeId: null,
      deviceSerialNumber: null,
      traderName: null,
      apiBaseUrl: null,
      vscuLocalBaseUrl: DEFAULT_VSCU_LOCAL,
      communicationKey: null,
      defaultTaxRateCode: null,
      autoSubmitOnInvoicePaid: false,
      notes: null,
    };
  }
  return {
    settingId: row.settingId,
    enabled: row.enabled === 1,
    integrationMode: row.integrationMode || 'disabled',
    environment: row.environment || 'sandbox',
    kraPin: row.kraPin || null,
    branchOfficeId: row.branchOfficeId || null,
    deviceSerialNumber: row.deviceSerialNumber || null,
    traderName: row.traderName || null,
    apiBaseUrl: row.apiBaseUrl || null,
    vscuLocalBaseUrl: row.vscuLocalBaseUrl || DEFAULT_VSCU_LOCAL,
    communicationKey: row.communicationKey || null,
    defaultTaxRateCode: row.defaultTaxRateCode || null,
    autoSubmitOnInvoicePaid: row.autoSubmitOnInvoicePaid === 1,
    notes: row.notes || null,
    updatedAt: row.updatedAt,
  };
}

function toAdminResponse(internal) {
  const effectiveApiBase =
    trimOrNull(internal.apiBaseUrl) || defaultApiBase(internal.environment);
  const mode = internal.enabled ? internal.integrationMode : 'disabled';
  return {
    settingId: internal.settingId,
    enabled: internal.enabled,
    integrationMode: internal.integrationMode,
    environment: internal.environment,
    kraPin: internal.kraPin,
    branchOfficeId: internal.branchOfficeId,
    deviceSerialNumber: internal.deviceSerialNumber,
    traderName: internal.traderName,
    apiBaseUrl: internal.apiBaseUrl,
    effectiveApiBaseUrl: effectiveApiBase,
    vscuLocalBaseUrl: internal.vscuLocalBaseUrl || DEFAULT_VSCU_LOCAL,
    communicationKeyConfigured: Boolean(internal.communicationKey),
    communicationKeyHint: maskSecret(internal.communicationKey),
    defaultTaxRateCode: internal.defaultTaxRateCode,
    autoSubmitOnInvoicePaid: internal.autoSubmitOnInvoicePaid,
    notes: internal.notes,
    updatedAt: internal.updatedAt,
    readiness: buildReadiness({ ...internal, integrationMode: mode, effectiveApiBaseUrl: effectiveApiBase }),
  };
}

function buildReadiness(settings) {
  const checks = [];
  const mode = settings.integrationMode;
  const push = (id, label, ok, detail) => checks.push({ id, label, ok: Boolean(ok), detail: detail || null });

  push('enabled', 'Integration enabled', settings.enabled, settings.enabled ? null : 'Turn on when sandbox/production is ready.');
  push('mode', 'OSCU or VSCU selected', mode === 'oscu' || mode === 'vscu', 'Choose Online (OSCU) or Virtual (VSCU) on the portal service request.');
  push('kraPin', 'KRA PIN', Boolean(settings.kraPin), 'Taxpayer PIN for the invoicing entity.');
  push('branchOfficeId', 'Branch office ID', Boolean(settings.branchOfficeId), 'From eTIMS device registration (per branch).');
  push('deviceSerial', 'Device serial', Boolean(settings.deviceSerialNumber), 'Equipment serial from eTIMS activation.');
  push(
    'communicationKey',
    'Communication key',
    Boolean(settings.communicationKey),
    'From OSCU/VSCU initialization (selectInitOsdcInfo).'
  );
  if (mode === 'vscu') {
    push(
      'vscuUrl',
      'Local VSCU URL',
      Boolean(settings.vscuLocalBaseUrl),
      'KRA JAR web service (often http://127.0.0.1:8088).'
    );
  }
  if (mode === 'oscu') {
    push('apiBase', 'eTIMS API base URL', Boolean(settings.effectiveApiBaseUrl), settings.effectiveApiBaseUrl);
  }

  const blockers = checks.filter((c) => !c.ok && ['kraPin', 'branchOfficeId', 'deviceSerial', 'communicationKey'].includes(c.id));
  const readyForDev = settings.enabled && mode !== 'disabled' && blockers.length === 0;
  return {
    checks,
    readyForDev,
    message: readyForDev
      ? 'Configuration complete for wiring invoice submit (implementation pending).'
      : 'Complete KRA sandbox service request and fill required fields before go-live.',
  };
}

async function loadSettings() {
  await ensureSettingsTable();
  const [rows] = await pool.execute(
    `SELECT * FROM billing_etims_settings WHERE settingId = 1 LIMIT 1`
  );
  return rowToInternal(rows[0]);
}

async function loadSettingsForBilling() {
  const s = await loadSettings();
  if (!s.enabled || s.integrationMode === 'disabled') return null;
  return {
    ...s,
    effectiveApiBaseUrl: trimOrNull(s.apiBaseUrl) || defaultApiBase(s.environment),
  };
}

async function updateSettings(payload, updatedBy = null) {
  await ensureSettingsTable();
  const allowedModes = ['disabled', 'oscu', 'vscu'];
  const allowedEnv = ['sandbox', 'production'];
  const updates = [];
  const values = [];

  if (payload.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(payload.enabled ? 1 : 0);
  }
  if (payload.integrationMode !== undefined) {
    const m = String(payload.integrationMode).toLowerCase();
    if (!allowedModes.includes(m)) {
      const err = new Error(`integrationMode must be one of: ${allowedModes.join(', ')}`);
      err.code = 'invalid_mode';
      throw err;
    }
    updates.push('integrationMode = ?');
    values.push(m);
    if (m === 'disabled') {
      updates.push('enabled = ?');
      values.push(0);
    }
  }
  if (payload.environment !== undefined) {
    const e = String(payload.environment).toLowerCase();
    if (!allowedEnv.includes(e)) {
      const err = new Error(`environment must be sandbox or production`);
      err.code = 'invalid_environment';
      throw err;
    }
    updates.push('environment = ?');
    values.push(e);
  }
  if (payload.kraPin !== undefined) {
    updates.push('kraPin = ?');
    values.push(trimOrNull(payload.kraPin)?.slice(0, 16) || null);
  }
  if (payload.branchOfficeId !== undefined) {
    updates.push('branchOfficeId = ?');
    values.push(trimOrNull(payload.branchOfficeId)?.slice(0, 32) || null);
  }
  if (payload.deviceSerialNumber !== undefined) {
    updates.push('deviceSerialNumber = ?');
    values.push(trimOrNull(payload.deviceSerialNumber)?.slice(0, 64) || null);
  }
  if (payload.traderName !== undefined) {
    updates.push('traderName = ?');
    values.push(trimOrNull(payload.traderName)?.slice(0, 200) || null);
  }
  if (payload.apiBaseUrl !== undefined) {
    updates.push('apiBaseUrl = ?');
    values.push(trimOrNull(payload.apiBaseUrl)?.slice(0, 512) || null);
  }
  if (payload.vscuLocalBaseUrl !== undefined) {
    updates.push('vscuLocalBaseUrl = ?');
    values.push(trimOrNull(payload.vscuLocalBaseUrl)?.slice(0, 512) || null);
  }
  if (payload.communicationKey !== undefined) {
    const key = trimOrNull(payload.communicationKey);
    updates.push('communicationKey = ?');
    values.push(key ? key.slice(0, 512) : null);
  }
  if (payload.defaultTaxRateCode !== undefined) {
    updates.push('defaultTaxRateCode = ?');
    values.push(trimOrNull(payload.defaultTaxRateCode)?.slice(0, 16) || null);
  }
  if (payload.autoSubmitOnInvoicePaid !== undefined) {
    updates.push('autoSubmitOnInvoicePaid = ?');
    values.push(payload.autoSubmitOnInvoicePaid ? 1 : 0);
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
    `UPDATE billing_etims_settings SET ${updates.join(', ')} WHERE settingId = 1`,
    values
  );
  return loadSettings();
}

function isAdminUser(req) {
  const u = req.user;
  if (!u) return false;
  const role = u.roleName || u.role || u.role?.roleName || '';
  const rn = String(role).toLowerCase();
  if (rn === 'admin' || rn.includes('admin') || rn === 'system administrator') return true;
  if (Number(u.roleId) === 1) return true;
  return false;
}

module.exports = {
  loadSettings,
  loadSettingsForBilling,
  updateSettings,
  toAdminResponse,
  buildReadiness,
  isAdminUser,
  defaultApiBase,
};
