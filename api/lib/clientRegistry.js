/**
 * Client Registry / NUPI adapter (Phase 2 DHA).
 *
 * Modes:
 *  - sandbox: deterministic local NUPI from national ID / phone (demo + offline cert evidence)
 *  - live: HTTP call to CLIENT_REGISTRY_BASE_URL (or DB settings)
 *  - disabled: no-op
 */
const crypto = require('crypto');

function envMode() {
  return (process.env.CLIENT_REGISTRY_MODE || '').toLowerCase();
}

async function loadSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT clientRegistryMode, clientRegistryBaseUrl, clientRegistryApiKey, autoResolveNupiOnRegister
       FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

function resolveMode(settings) {
  const fromEnv = envMode();
  if (fromEnv === 'sandbox' || fromEnv === 'live' || fromEnv === 'disabled') return fromEnv;
  return String(settings?.clientRegistryMode || 'sandbox').toLowerCase();
}

function sanitizeId(value) {
  return String(value || '').replace(/\D/g, '');
}

function sandboxNupiFromIdentity({ idNumber, phone, firstName, lastName }) {
  const basis = sanitizeId(idNumber) || sanitizeId(phone) || `${firstName || ''}|${lastName || ''}`;
  const hash = crypto.createHash('sha256').update(`kakamega-nupi:${basis}`).digest('hex');
  // Kenya-style NUPI display: KE- + 12 digits (sandbox only — not a real CR number)
  const digits = hash.replace(/\D/g, '').slice(0, 12).padEnd(12, '0');
  return `KE-${digits}`;
}

async function liveResolve(settings, query) {
  const base =
    process.env.CLIENT_REGISTRY_BASE_URL ||
    settings?.clientRegistryBaseUrl ||
    '';
  if (!base) {
    throw new Error('CLIENT_REGISTRY_BASE_URL not configured for live mode');
  }
  const apiKey =
    process.env.CLIENT_REGISTRY_API_KEY ||
    settings?.clientRegistryApiKey ||
    '';
  const url = new URL('/clients/resolve', base.endsWith('/') ? base : `${base}/`);
  if (query.idNumber) url.searchParams.set('nationalId', query.idNumber);
  if (query.phone) url.searchParams.set('phone', query.phone);
  if (query.nupi) url.searchParams.set('nupi', query.nupi);

  const headers = { Accept: 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url.toString(), { method: 'GET', headers });
  if (res.status === 404) {
    return { found: false, mode: 'live' };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Client Registry HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    found: true,
    mode: 'live',
    nupi: data.nupi || data.clientNumber || data.id,
    crReference: data.reference || data.resourceId || data.id || null,
    patient: {
      firstName: data.firstName || data.givenName || null,
      lastName: data.lastName || data.familyName || null,
      middleName: data.middleName || null,
      dateOfBirth: data.dateOfBirth || data.birthDate || null,
      gender: data.gender || null,
      phone: data.phone || data.telecom || null,
      idNumber: data.nationalId || data.idNumber || query.idNumber || null,
    },
    raw: data,
  };
}

async function liveRegister(settings, patient) {
  const base =
    process.env.CLIENT_REGISTRY_BASE_URL ||
    settings?.clientRegistryBaseUrl ||
    '';
  if (!base) {
    throw new Error('CLIENT_REGISTRY_BASE_URL not configured for live mode');
  }
  const apiKey =
    process.env.CLIENT_REGISTRY_API_KEY ||
    settings?.clientRegistryApiKey ||
    '';
  const url = new URL('/clients', base.endsWith('/') ? base : `${base}/`);
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const body = {
    firstName: patient.firstName,
    lastName: patient.lastName,
    middleName: patient.middleName || undefined,
    dateOfBirth: patient.dateOfBirth || undefined,
    gender: patient.gender || undefined,
    nationalId: patient.idNumber || undefined,
    phone: patient.phone || undefined,
    facilityMflCode: patient.facilityMflCode || undefined,
  };

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Client Registry register HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    mode: 'live',
    nupi: data.nupi || data.clientNumber || data.id,
    crReference: data.reference || data.resourceId || data.id || null,
    raw: data,
  };
}

/**
 * Resolve NUPI for identity fields. Does not write to DB.
 */
async function resolveClient(pool, query = {}) {
  const settings = await loadSettings(pool);
  const mode = resolveMode(settings);

  if (mode === 'disabled') {
    return { found: false, mode, skipped: true };
  }

  if (mode === 'live') {
    return liveResolve(settings, query);
  }

  // sandbox
  if (!query.idNumber && !query.phone && !query.nupi) {
    return { found: false, mode: 'sandbox', reason: 'idNumber or phone required' };
  }
  if (query.nupi) {
    return {
      found: true,
      mode: 'sandbox',
      nupi: query.nupi,
      crReference: `sandbox:${query.nupi}`,
      patient: {
        firstName: query.firstName || null,
        lastName: query.lastName || null,
        idNumber: query.idNumber || null,
        phone: query.phone || null,
      },
    };
  }

  const nupi = sandboxNupiFromIdentity(query);
  return {
    found: true,
    mode: 'sandbox',
    nupi,
    crReference: `sandbox:${nupi}`,
    patient: {
      firstName: query.firstName || null,
      lastName: query.lastName || null,
      middleName: query.middleName || null,
      dateOfBirth: query.dateOfBirth || null,
      gender: query.gender || null,
      phone: query.phone || null,
      idNumber: query.idNumber || null,
    },
  };
}

/**
 * Register a new client when resolve finds nothing (live) or always mint sandbox NUPI.
 */
async function registerClient(pool, patient = {}) {
  const settings = await loadSettings(pool);
  const mode = resolveMode(settings);

  if (mode === 'disabled') {
    return { skipped: true, mode };
  }

  if (mode === 'live') {
    return liveRegister(settings, patient);
  }

  const nupi = sandboxNupiFromIdentity(patient);
  return {
    mode: 'sandbox',
    nupi,
    crReference: `sandbox-reg:${nupi}`,
  };
}

async function shouldAutoResolve(pool) {
  const settings = await loadSettings(pool);
  if (!settings) return true;
  return Boolean(settings.autoResolveNupiOnRegister);
}

module.exports = {
  resolveClient,
  registerClient,
  shouldAutoResolve,
  loadSettings,
  resolveMode,
};
