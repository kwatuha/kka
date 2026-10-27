/**
 * Client Registry / NUPI adapter (Phase 2 DHA).
 *
 * Modes:
 *  - sandbox: deterministic local NUPI from national ID / phone (demo + offline cert evidence)
 *  - live: HTTP call to CLIENT_REGISTRY_BASE_URL (or DB settings)
 *  - disabled: no-op
 *
 * Official workflow (search vs national create): docs/DHA_CLIENT_REGISTRY_WORKFLOWS.md
 */
const crypto = require('crypto');
const { afyaConnectFetch, isAfyaConnectConfigured } = require('./afyaConnectAuth');
const { mapCrResponseToResolveResult } = require('./afyaConnectCrMapper');
const { mapHmisIdTypeToDha, resolveDhaPatientIdentification, trimOrNull } = require('./dhaIdentification');

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

function trimEnv(key) {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

/** @returns {'afyaconnect'|'generic'} */
function resolveLiveProvider(settings) {
  const fromEnv = trimEnv('CLIENT_REGISTRY_PROVIDER').toLowerCase();
  if (fromEnv === 'afyaconnect' || fromEnv === 'generic') return fromEnv;
  if (isAfyaConnectConfigured()) return 'afyaconnect';
  const apiKey =
    trimEnv('CLIENT_REGISTRY_API_KEY') || String(settings?.clientRegistryApiKey || '').trim();
  return apiKey ? 'generic' : 'afyaconnect';
}

function resolveCrApiStyle() {
  const style = trimEnv('CLIENT_REGISTRY_API_STYLE').toLowerCase();
  if (style === 'patients-v1' || style === 'generic') return style;
  return 'fetch-client-v3';
}

function resolveCrAgent() {
  return trimEnv('CLIENT_REGISTRY_AGENT') || trimEnv('AFYACONNECT_AGENT') || '';
}

function mapIdentificationType(query) {
  const idNum = trimOrNull(query.idNumber || query.nationalId || query.identificationNumber);
  const nupi = trimOrNull(query.nupi || query.crId);
  if (idNum) {
    return mapHmisIdTypeToDha(query.identificationType || query.idType, { fallback: 'National ID' });
  }
  if (nupi) return 'ClientRegistry ID';
  return 'National ID';
}

async function liveResolveAfyaConnect(settings, query) {
  const base =
    trimEnv('CLIENT_REGISTRY_BASE_URL') || String(settings?.clientRegistryBaseUrl || '').trim();
  if (!base) {
    throw new Error('CLIENT_REGISTRY_BASE_URL not configured for AfyaConnect Client Registry');
  }
  if (!isAfyaConnectConfigured()) {
    throw new Error('AfyaConnect OAuth not configured (see AFYACONNECT_* env vars)');
  }

  const style = resolveCrApiStyle();
  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  const idResolved = resolveDhaPatientIdentification(query);

  if (!idResolved.identification_number) {
    return { found: false, mode: 'live', provider: 'afyaconnect', reason: 'idNumber or NUPI required' };
  }

  const identificationType = idResolved.identification_type;
  const identificationNumber = idResolved.identification_number;

  let url;
  if (style === 'patients-v1') {
    url = new URL(`${root}/patients`);
    url.searchParams.set('identification_number', String(identificationNumber));
    url.searchParams.set('identification_type', identificationType);
  } else if (style === 'generic') {
    url = new URL(`${root}/clients/resolve`);
    if (identificationNumber) url.searchParams.set('nationalId', String(identificationNumber));
    if (query.phone) url.searchParams.set('phone', query.phone);
    if (query.nupi) url.searchParams.set('nupi', query.nupi);
  } else {
    url = new URL(`${root}/v3/client-registry/fetch-client`);
    url.searchParams.set('identification_type', identificationType);
    url.searchParams.set('identification_number', String(identificationNumber));
    const agent = resolveCrAgent();
    if (agent) url.searchParams.set('agent', agent);
  }

  const res = await afyaConnectFetch(url.toString(), { method: 'GET' });
  if (res.status === 404) {
    return { found: false, mode: 'live', provider: 'afyaconnect' };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 400 && text.includes('zero results')) {
      return { found: false, mode: 'live', provider: 'afyaconnect' };
    }
    if (
      res.status === 400 &&
      /client_registry|frappe\.exceptions|failed to get patient record/i.test(text)
    ) {
      return {
        found: false,
        mode: 'live',
        provider: 'afyaconnect',
        reason:
          'National Client Registry returned a server error (DHA UAT). Retry later or email afyaconnect.dha@gmail.com. For preauth UAT you can paste NUPI CR0490482291444-0 on the chart if the patient is already saved locally.',
        nationalCrUnavailable: true,
        httpStatus: res.status,
      };
    }
    throw new Error(`Client Registry HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  if (style === 'generic') {
    return {
      found: true,
      mode: 'live',
      provider: 'generic',
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

  return mapCrResponseToResolveResult(data, {
    idNumber: identificationNumber,
    identificationType,
  });
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
    const provider = resolveLiveProvider(settings);
    if (provider === 'afyaconnect') {
      return liveResolveAfyaConnect(settings, query);
    }
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
    const provider = resolveLiveProvider(settings);
    if (provider === 'afyaconnect') {
      throw new Error(
        'AfyaConnect live client creation is not wired yet; resolve an existing national ID first'
      );
    }
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
  resolveLiveProvider,
  liveResolveAfyaConnect,
};
