/**
 * Facility Registry / MFL adapter (Phase 2 DHA).
 *
 * sandbox: local catalog for Kakamega demo facilities
 * live: AfyaConnect GET /facilities/search or generic GET facilities/{code}
 * disabled: no-op
 *
 * @see docs/DHA_UAT_FR_TEST_IDS.md
 */

const { afyaConnectFetch, isAfyaConnectConfigured } = require('./afyaConnectAuth');
const { mapFrResponseToLookupResult } = require('./afyaConnectFrMapper');

const SANDBOX_FACILITIES = {
  15915: {
    mflCode: '15915',
    officialName: 'Kakamega County General Hospital',
    kephLevel: 'Level 5',
    county: 'Kakamega',
    subCounty: 'Lurambi',
    owner: 'Ministry of Health',
    status: 'Operational',
  },
  15916: {
    mflCode: '15916',
    officialName: 'Matungu Sub-County Hospital',
    kephLevel: 'Level 4',
    county: 'Kakamega',
    subCounty: 'Matungu',
    owner: 'Ministry of Health',
    status: 'Operational',
  },
  15917: {
    mflCode: '15917',
    officialName: 'Malava Sub-County Hospital',
    kephLevel: 'Level 4',
    county: 'Kakamega',
    subCounty: 'Malava',
    owner: 'Ministry of Health',
    status: 'Operational',
  },
  15918: {
    mflCode: '15918',
    officialName: 'Butere Sub-County Hospital',
    kephLevel: 'Level 4',
    county: 'Kakamega',
    subCounty: 'Butere',
    owner: 'Ministry of Health',
    status: 'Operational',
  },
};

async function loadSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT facilityRegistryMode, facilityRegistryBaseUrl, facilityRegistryApiKey
       FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

function resolveMode(settings) {
  const fromEnv = (process.env.FACILITY_REGISTRY_MODE || '').toLowerCase();
  if (fromEnv === 'sandbox' || fromEnv === 'live' || fromEnv === 'disabled') return fromEnv;
  return String(settings?.facilityRegistryMode || 'sandbox').toLowerCase();
}

function trimEnv(key) {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

function resolveLiveProvider(settings) {
  const fromEnv = trimEnv('FACILITY_REGISTRY_PROVIDER').toLowerCase();
  if (fromEnv === 'afyaconnect' || fromEnv === 'generic') return fromEnv;
  if (isAfyaConnectConfigured()) return 'afyaconnect';
  const apiKey =
    trimEnv('FACILITY_REGISTRY_API_KEY') || String(settings?.facilityRegistryApiKey || '').trim();
  return apiKey ? 'generic' : 'afyaconnect';
}

function resolveFrApiStyle() {
  const style = trimEnv('FACILITY_REGISTRY_API_STYLE').toLowerCase();
  if (style === 'search-v1' || style === 'generic') return style;
  return 'search-v1';
}

function resolveFrBaseUrl(settings) {
  return (
    trimEnv('FACILITY_REGISTRY_BASE_URL') ||
    trimEnv('CLIENT_REGISTRY_BASE_URL') ||
    String(settings?.facilityRegistryBaseUrl || '').trim()
  );
}

function inferIdentifierType(identifier) {
  const id = String(identifier || '').trim();
  if (/^FID-/i.test(id)) return 'fr-code';
  return trimEnv('FACILITY_REGISTRY_DEFAULT_IDENTIFIER_TYPE') || 'registration-number';
}

async function liveLookupAfyaConnect(settings, identifier, opts = {}) {
  const base = resolveFrBaseUrl(settings);
  if (!base) {
    throw new Error(
      'FACILITY_REGISTRY_BASE_URL (or CLIENT_REGISTRY_BASE_URL) not configured for AfyaConnect Facility Registry'
    );
  }
  if (!isAfyaConnectConfigured()) {
    throw new Error('AfyaConnect OAuth not configured (see AFYACONNECT_* env vars)');
  }

  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  const url = new URL(`${root}/facilities/search`);
  const id = String(identifier || '').trim();
  if (!id && !opts.name) {
    return { found: false, mode: 'live', provider: 'afyaconnect', reason: 'identifier required' };
  }
  if (id) {
    url.searchParams.set('identifier', id);
    url.searchParams.set(
      'identifier-type',
      opts.identifierType || inferIdentifierType(id)
    );
  }
  if (opts.name) url.searchParams.set('name', String(opts.name));

  const res = await afyaConnectFetch(url.toString(), { method: 'GET' });
  if (res.status === 404) {
    return { found: false, mode: 'live', provider: 'afyaconnect' };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Facility Registry HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  if (Array.isArray(data) && data.length === 0) {
    return { found: false, mode: 'live', provider: 'afyaconnect' };
  }

  return mapFrResponseToLookupResult(data, {
    identifier: id,
    identifierType: opts.identifierType,
  });
}

async function liveLookupGeneric(settings, code) {
  const base = resolveFrBaseUrl(settings);
  if (!base) throw new Error('FACILITY_REGISTRY_BASE_URL not configured for live mode');
  const apiKey =
    trimEnv('FACILITY_REGISTRY_API_KEY') || String(settings?.facilityRegistryApiKey || '').trim();
  const url = new URL(`facilities/${encodeURIComponent(code)}`, base.endsWith('/') ? base : `${base}/`);
  const headers = { Accept: 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(url.toString(), { headers });
  if (res.status === 404) return { found: false, mode: 'live', provider: 'generic' };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Facility Registry HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    found: true,
    mode: 'live',
    provider: 'generic',
    facility: {
      mflCode: String(data.code || data.mflCode || code),
      officialName: data.officialName || data.name || null,
      kephLevel: data.kephLevel || data.level || null,
      county: data.county || null,
      subCounty: data.subCounty || data.sub_county || null,
      owner: data.owner || null,
      status: data.status || null,
    },
    raw: data,
  };
}

/**
 * @param {import('mysql2/promise').Pool|null} pool
 * @param {string} identifier — MFL, fr-code, or registration number
 * @param {{ identifierType?: string, name?: string }} [opts]
 */
async function lookupFacility(pool, identifier, opts = {}) {
  const code = String(identifier || '').trim();
  if (!code && !opts.name) return { found: false, reason: 'identifier required' };

  const settings = await loadSettings(pool);
  const mode = resolveMode(settings);

  if (mode === 'disabled') {
    return { found: false, mode, skipped: true };
  }

  if (mode === 'live') {
    const provider = resolveLiveProvider(settings);
    if (provider === 'afyaconnect' && resolveFrApiStyle() === 'search-v1') {
      return liveLookupAfyaConnect(settings, code, opts);
    }
    if (!code) {
      return { found: false, mode: 'live', reason: 'generic live lookup requires identifier code' };
    }
    return liveLookupGeneric(settings, code);
  }

  const facility = SANDBOX_FACILITIES[code];
  if (!facility) {
    return {
      found: false,
      mode: 'sandbox',
      reason: 'Unknown MFL in sandbox catalog — set live mode or add code',
    };
  }
  return { found: true, mode: 'sandbox', facility: { ...facility } };
}

/**
 * Sync all active branches that have an mflCode against the registry.
 * Updates kephLevel + facilityRegistrySyncedAt when found.
 */
async function syncBranches(pool) {
  const settings = await loadSettings(pool);
  const mode = resolveMode(settings);
  if (mode === 'disabled') {
    return { mode, synced: 0, results: [], skipped: true };
  }

  const [branches] = await pool.execute(
    `SELECT branchId, branchCode, branchName, mflCode, kephLevel
     FROM branches WHERE isActive = 1 AND mflCode IS NOT NULL AND mflCode != ''`
  );

  const results = [];
  let synced = 0;
  for (const branch of branches) {
    try {
      const lookup = await lookupFacility(pool, branch.mflCode, {
        identifierType: inferIdentifierType(branch.mflCode),
      });
      if (lookup.found && lookup.facility) {
        await pool.execute(
          `UPDATE branches
           SET kephLevel = COALESCE(?, kephLevel),
               facilityRegistrySyncedAt = NOW()
           WHERE branchId = ?`,
          [lookup.facility.kephLevel || null, branch.branchId]
        );
        synced += 1;
        results.push({
          branchId: branch.branchId,
          branchCode: branch.branchCode,
          mflCode: branch.mflCode,
          status: 'synced',
          officialName: lookup.facility.officialName,
          kephLevel: lookup.facility.kephLevel,
        });
      } else {
        results.push({
          branchId: branch.branchId,
          branchCode: branch.branchCode,
          mflCode: branch.mflCode,
          status: 'not_found',
        });
      }
    } catch (err) {
      results.push({
        branchId: branch.branchId,
        branchCode: branch.branchCode,
        mflCode: branch.mflCode,
        status: 'error',
        error: err.message || String(err),
      });
    }
  }

  return { mode, synced, total: branches.length, results };
}

module.exports = {
  lookupFacility,
  syncBranches,
  loadSettings,
  resolveMode,
  SANDBOX_FACILITIES,
};
