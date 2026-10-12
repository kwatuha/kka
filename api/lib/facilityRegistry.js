/**
 * Facility Registry / MFL adapter (Phase 2 DHA).
 *
 * sandbox: local catalog for Kakamega demo facilities
 * live: HTTP to FACILITY_REGISTRY_BASE_URL (KMHFR-compatible GET)
 * disabled: no-op
 */

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

async function lookupFacility(pool, mflCode) {
  const code = String(mflCode || '').trim();
  if (!code) return { found: false, reason: 'mflCode required' };

  const settings = await loadSettings(pool);
  const mode = resolveMode(settings);

  if (mode === 'disabled') {
    return { found: false, mode, skipped: true };
  }

  if (mode === 'live') {
    const base =
      process.env.FACILITY_REGISTRY_BASE_URL ||
      settings?.facilityRegistryBaseUrl ||
      '';
    if (!base) throw new Error('FACILITY_REGISTRY_BASE_URL not configured for live mode');
    const apiKey =
      process.env.FACILITY_REGISTRY_API_KEY ||
      settings?.facilityRegistryApiKey ||
      '';
    const url = new URL(`facilities/${encodeURIComponent(code)}`, base.endsWith('/') ? base : `${base}/`);
    const headers = { Accept: 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch(url.toString(), { headers });
    if (res.status === 404) return { found: false, mode: 'live' };
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Facility Registry HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      found: true,
      mode: 'live',
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
      const lookup = await lookupFacility(pool, branch.mflCode);
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
