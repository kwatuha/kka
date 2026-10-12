/**
 * Phase 2 DHA integration routes: Client Registry (NUPI) + Facility Registry (MFL)
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const {
  resolveClient,
  registerClient,
  loadSettings: loadCrSettings,
} = require('../lib/clientRegistry');
const {
  lookupFacility,
  syncBranches,
  loadSettings: loadFrSettings,
} = require('../lib/facilityRegistry');
const { enqueueOutboxEvent } = require('../lib/integrationOutbox');

/**
 * GET /api/integrations/registry/settings
 */
router.get('/registry/settings', async (req, res) => {
  try {
    const cr = await loadCrSettings(pool);
    const fr = await loadFrSettings(pool);
    const [counts] = await pool.execute(
      `SELECT
         SUM(CASE WHEN mflCode IS NOT NULL AND mflCode != '' THEN 1 ELSE 0 END) AS withMfl,
         COUNT(*) AS branches
       FROM branches WHERE isActive = 1`
    );
    const [nupiCounts] = await pool.execute(
      `SELECT nupiStatus, COUNT(*) AS c FROM patients WHERE voided = 0 GROUP BY nupiStatus`
    );
    res.json({
      clientRegistry: {
        mode: cr?.clientRegistryMode || 'sandbox',
        baseUrlConfigured: Boolean(
          process.env.CLIENT_REGISTRY_BASE_URL || cr?.clientRegistryBaseUrl
        ),
        autoResolveNupiOnRegister: cr?.autoResolveNupiOnRegister !== 0,
      },
      facilityRegistry: {
        mode: fr?.facilityRegistryMode || 'sandbox',
        baseUrlConfigured: Boolean(
          process.env.FACILITY_REGISTRY_BASE_URL || fr?.facilityRegistryBaseUrl
        ),
      },
      facilities: {
        activeBranches: Number(counts[0]?.branches || 0),
        withMflCode: Number(counts[0]?.withMfl || 0),
      },
      nupiByStatus: Object.fromEntries(
        (nupiCounts || []).map((r) => [r.nupiStatus, Number(r.c)])
      ),
    });
  } catch (err) {
    console.error('registry settings:', err);
    res.status(500).json({ message: 'Failed to load registry settings', error: err.message });
  }
});

/**
 * PUT /api/integrations/registry/settings
 */
router.put('/registry/settings', async (req, res) => {
  try {
    const {
      clientRegistryMode,
      clientRegistryBaseUrl,
      facilityRegistryMode,
      facilityRegistryBaseUrl,
      autoResolveNupiOnRegister,
    } = req.body || {};

    const updates = [];
    const values = [];
    if (clientRegistryMode !== undefined) {
      updates.push('clientRegistryMode = ?');
      values.push(clientRegistryMode);
    }
    if (clientRegistryBaseUrl !== undefined) {
      updates.push('clientRegistryBaseUrl = ?');
      values.push(clientRegistryBaseUrl || null);
    }
    if (facilityRegistryMode !== undefined) {
      updates.push('facilityRegistryMode = ?');
      values.push(facilityRegistryMode);
    }
    if (facilityRegistryBaseUrl !== undefined) {
      updates.push('facilityRegistryBaseUrl = ?');
      values.push(facilityRegistryBaseUrl || null);
    }
    if (autoResolveNupiOnRegister !== undefined) {
      updates.push('autoResolveNupiOnRegister = ?');
      values.push(autoResolveNupiOnRegister ? 1 : 0);
    }
    if (!updates.length) {
      return res.status(400).json({ message: 'No settings to update' });
    }
    updates.push('updatedBy = ?');
    values.push(req.user?.id || null);
    await pool.execute(
      `UPDATE integration_registry_settings SET ${updates.join(', ')} WHERE settingId = 1`,
      values
    );
    const refreshed = await pool.execute(
      `SELECT settingId, clientRegistryMode, clientRegistryBaseUrl, facilityRegistryMode,
              facilityRegistryBaseUrl, autoResolveNupiOnRegister, updatedAt
       FROM integration_registry_settings WHERE settingId = 1`
    );
    res.json(refreshed[0][0]);
  } catch (err) {
    console.error('registry settings update:', err);
    res.status(500).json({ message: 'Failed to update settings', error: err.message });
  }
});

/**
 * POST /api/integrations/cr/resolve
 * Body: { idNumber?, phone?, nupi?, firstName?, lastName?, dateOfBirth?, gender? }
 */
router.post('/cr/resolve', async (req, res) => {
  try {
    const result = await resolveClient(pool, req.body || {});
    res.json(result);
  } catch (err) {
    console.error('CR resolve:', err);
    res.status(502).json({ message: 'Client Registry resolve failed', error: err.message });
  }
});

/**
 * POST /api/integrations/cr/register
 * Body: patient demographics (+ optional patientId to persist)
 */
router.post('/cr/register', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await registerClient(pool, body);
    if (result.skipped) {
      return res.json(result);
    }

    if (body.patientId && result.nupi) {
      await pool.execute(
        `UPDATE patients
         SET nupi = ?, nupiStatus = 'registered', crReference = ?, nupiResolvedAt = NOW()
         WHERE patientId = ? AND voided = 0`,
        [result.nupi, result.crReference || null, Number(body.patientId)]
      );
      try {
        await enqueueOutboxEvent(pool, {
          eventType: 'patient.nupi.registered',
          aggregateType: 'patient',
          aggregateId: String(body.patientId),
          payload: {
            patientId: Number(body.patientId),
            nupi: result.nupi,
            crReference: result.crReference,
            mode: result.mode,
          },
        });
      } catch (outboxErr) {
        console.warn('[integrations] nupi outbox skipped:', outboxErr.message);
      }
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('CR register:', err);
    res.status(502).json({ message: 'Client Registry register failed', error: err.message });
  }
});

/**
 * POST /api/integrations/cr/resolve-patient/:id
 * Resolve/register NUPI for an existing patient and persist.
 */
router.post('/cr/resolve-patient/:id', async (req, res) => {
  try {
    const patientId = Number(req.params.id);
    const [rows] = await pool.execute(
      `SELECT patientId, firstName, lastName, middleName, dateOfBirth, gender,
              phone, idNumber, nupi, nupiStatus
       FROM patients WHERE patientId = ? AND voided = 0 LIMIT 1`,
      [patientId]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    const patient = rows[0];
    let result = await resolveClient(pool, {
      idNumber: patient.idNumber,
      phone: patient.phone,
      firstName: patient.firstName,
      lastName: patient.lastName,
      middleName: patient.middleName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      nupi: patient.nupi,
    });

    let status = 'resolved';
    if (!result.found || !result.nupi) {
      result = await registerClient(pool, patient);
      status = result.skipped ? 'skipped' : 'registered';
    }
    if (!result.nupi && !result.skipped) {
      await pool.execute(
        `UPDATE patients SET nupiStatus = 'failed' WHERE patientId = ?`,
        [patientId]
      );
      return res.status(502).json({ message: 'Could not obtain NUPI', result });
    }
    if (result.skipped) {
      return res.json({ patientId, ...result });
    }

    await pool.execute(
      `UPDATE patients
       SET nupi = ?, nupiStatus = ?, crReference = ?, nupiResolvedAt = NOW()
       WHERE patientId = ?`,
      [result.nupi, status, result.crReference || null, patientId]
    );

    try {
      await enqueueOutboxEvent(pool, {
        eventType: status === 'registered' ? 'patient.nupi.registered' : 'patient.nupi.resolved',
        aggregateType: 'patient',
        aggregateId: String(patientId),
        payload: {
          patientId,
          nupi: result.nupi,
          crReference: result.crReference,
          mode: result.mode,
          status,
        },
      });
    } catch (outboxErr) {
      console.warn('[integrations] nupi outbox skipped:', outboxErr.message);
    }

    res.json({
      patientId,
      nupi: result.nupi,
      nupiStatus: status,
      crReference: result.crReference,
      mode: result.mode,
    });
  } catch (err) {
    console.error('CR resolve-patient:', err);
    res.status(502).json({ message: 'NUPI resolve failed', error: err.message });
  }
});

/**
 * GET /api/integrations/mfl/branches — branches with MFL status
 * (Must be registered before /mfl/:code)
 */
router.get('/mfl/branches', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT branchId, branchCode, branchName, mflCode, kephLevel, facilityRegistrySyncedAt, isMainBranch, isActive
       FROM branches
       ORDER BY isMainBranch DESC, branchName ASC`
    );
    res.json({ branches: rows });
  } catch (err) {
    console.error('MFL branches:', err);
    res.status(500).json({ message: 'Failed to list facilities', error: err.message });
  }
});

/**
 * POST /api/integrations/mfl/sync
 */
router.post('/mfl/sync', async (req, res) => {
  try {
    const result = await syncBranches(pool);
    try {
      await enqueueOutboxEvent(pool, {
        eventType: 'facility.mfl.synced',
        aggregateType: 'facility_registry',
        aggregateId: 'bulk',
        payload: {
          mode: result.mode,
          synced: result.synced,
          total: result.total,
        },
      });
    } catch (outboxErr) {
      console.warn('[integrations] mfl sync outbox skipped:', outboxErr.message);
    }
    res.json(result);
  } catch (err) {
    console.error('MFL sync:', err);
    res.status(502).json({ message: 'Facility Registry sync failed', error: err.message });
  }
});

/**
 * GET /api/integrations/mfl/:code
 */
router.get('/mfl/:code', async (req, res) => {
  try {
    const result = await lookupFacility(pool, req.params.code);
    if (!result.found) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('MFL lookup:', err);
    res.status(502).json({ message: 'Facility Registry lookup failed', error: err.message });
  }
});

const { searchHptCatalog, loadCatalog: loadHptCatalog } = require('../lib/hptSandbox');

router.get('/hpt/search', async (req, res) => {
  try {
    const q = req.query.q || req.query.search || '';
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    res.json({ mode: 'sandbox', results: searchHptCatalog(q, limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/hpt/catalog', async (_req, res) => {
  try {
    res.json({ mode: 'sandbox', catalog: loadHptCatalog() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/hpt/map-medication/:medicationId', async (req, res) => {
  try {
    const { hptCode } = req.body || {};
    if (!hptCode) return res.status(400).json({ message: 'hptCode is required' });
    const valid = loadHptCatalog().some((r) => r.hptCode === hptCode);
    if (!valid) return res.status(400).json({ message: 'Unknown sandbox HPT code' });
    await pool.execute(`UPDATE medications SET hptCode = ? WHERE medicationId = ?`, [
      hptCode,
      Number(req.params.medicationId),
    ]);
    const [rows] = await pool.execute(
      `SELECT medicationId, name, medicationCode, hptCode FROM medications WHERE medicationId = ?`,
      [Number(req.params.medicationId)]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
