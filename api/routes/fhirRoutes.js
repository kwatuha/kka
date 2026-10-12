/**
 * Phase 3 FHIR R4 + LOINC routes (mounted under /api/integrations)
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const {
  loadSettings,
  resolveMode,
  publishPatient,
  publishEncounter,
  publishLabObservation,
  publishClinicalSummary,
  publishConsent,
  buildClinicalSummaryResources,
  loadPatientRow,
  loadEncounterRow,
  loadLabResultRow,
  buildPatient,
  buildEncounter,
  buildObservationsFromLabResult,
} = require('../lib/fhirMediator');
const { buildBundle, buildPatientConsents } = require('../lib/fhirBuilders');
const { PANEL_LOINC, PARAMETER_LOINC } = require('../lib/loincMap');
const { getHieLiveReadiness } = require('../lib/hieLiveReadiness');

/**
 * GET /api/integrations/fhir/live-readiness
 */
router.get('/fhir/live-readiness', async (_req, res) => {
  try {
    res.json(await getHieLiveReadiness());
  } catch (err) {
    console.error('fhir live-readiness:', err);
    res.status(500).json({ message: 'Failed to load live readiness', error: err.message });
  }
});

/**
 * GET /api/integrations/fhir/settings
 */
router.get('/fhir/settings', async (req, res) => {
  try {
    const settings = await loadSettings(pool);
    const [exports] = await pool.execute(
      `SELECT status, COUNT(*) AS c FROM fhir_export_log GROUP BY status`
    );
    const [loinc] = await pool.execute(
      `SELECT
         SUM(CASE WHEN loincCode IS NOT NULL AND loincCode != '' THEN 1 ELSE 0 END) AS mapped,
         COUNT(*) AS total
       FROM lab_test_types WHERE isActive = 1`
    );
    res.json({
      mode: resolveMode(settings),
      baseUrlConfigured: Boolean(process.env.FHIR_BASE_URL || settings?.fhirBaseUrl),
      autoPublishFhir: settings?.autoPublishFhir !== 0,
      exportsByStatus: Object.fromEntries((exports || []).map((r) => [r.status, Number(r.c)])),
      loincMapped: {
        mapped: Number(loinc[0]?.mapped || 0),
        total: Number(loinc[0]?.total || 0),
      },
    });
  } catch (err) {
    console.error('fhir settings:', err);
    res.status(500).json({ message: 'Failed to load FHIR settings', error: err.message });
  }
});

/**
 * PUT /api/integrations/fhir/settings
 */
router.put('/fhir/settings', async (req, res) => {
  try {
    const { fhirMode, fhirBaseUrl, autoPublishFhir } = req.body || {};
    const updates = [];
    const values = [];
    if (fhirMode !== undefined) {
      updates.push('fhirMode = ?');
      values.push(fhirMode);
    }
    if (fhirBaseUrl !== undefined) {
      updates.push('fhirBaseUrl = ?');
      values.push(fhirBaseUrl || null);
    }
    if (autoPublishFhir !== undefined) {
      updates.push('autoPublishFhir = ?');
      values.push(autoPublishFhir ? 1 : 0);
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
    const refreshed = await loadSettings(pool);
    res.json({
      mode: resolveMode(refreshed),
      baseUrlConfigured: Boolean(process.env.FHIR_BASE_URL || refreshed?.fhirBaseUrl),
      autoPublishFhir: refreshed?.autoPublishFhir !== 0,
    });
  } catch (err) {
    console.error('fhir settings update:', err);
    res.status(500).json({ message: 'Failed to update FHIR settings', error: err.message });
  }
});

/**
 * GET /api/integrations/fhir/loinc-map
 */
router.get('/fhir/loinc-map', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT testTypeId, testCode, testName, category, loincCode, isActive
       FROM lab_test_types
       ORDER BY category, testName
       LIMIT 200`
    );
    res.json({
      tests: rows,
      panelCatalog: PANEL_LOINC,
      parameterCatalog: PARAMETER_LOINC,
    });
  } catch (err) {
    console.error('loinc map:', err);
    res.status(500).json({ message: 'Failed to load LOINC map', error: err.message });
  }
});

/**
 * PUT /api/integrations/fhir/loinc-map/:testTypeId
 */
router.put('/fhir/loinc-map/:testTypeId', async (req, res) => {
  try {
    const { loincCode } = req.body || {};
    await pool.execute(
      `UPDATE lab_test_types SET loincCode = ? WHERE testTypeId = ?`,
      [loincCode || null, Number(req.params.testTypeId)]
    );
    const [rows] = await pool.execute(
      `SELECT testTypeId, testCode, testName, loincCode FROM lab_test_types WHERE testTypeId = ?`,
      [Number(req.params.testTypeId)]
    );
    res.json(rows[0] || {});
  } catch (err) {
    console.error('loinc update:', err);
    res.status(500).json({ message: 'Failed to update LOINC', error: err.message });
  }
});

/**
 * GET /api/integrations/fhir/exports
 */
router.get('/fhir/exports', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const [rows] = await pool.execute(
      `SELECT exportId, resourceType, resourceId, sourceType, sourceId, mode, status,
              httpStatus, responseSummary, createdAt, publishedAt
       FROM fhir_export_log
       ORDER BY exportId DESC
       LIMIT ${limit}`
    );
    res.json({ exports: rows });
  } catch (err) {
    console.error('fhir exports:', err);
    res.status(500).json({ message: 'Failed to load FHIR exports', error: err.message });
  }
});

/**
 * GET preview endpoints
 */
router.get('/fhir/patient/:id', async (req, res) => {
  try {
    const row = await loadPatientRow(pool, Number(req.params.id));
    if (!row) return res.status(404).json({ message: 'Patient not found' });
    res.json(buildPatient(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/fhir/encounter/:id', async (req, res) => {
  try {
    const row = await loadEncounterRow(pool, Number(req.params.id));
    if (!row) return res.status(404).json({ message: 'Encounter not found' });
    res.json(buildEncounter(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/fhir/observation/:id', async (req, res) => {
  try {
    const row = await loadLabResultRow(pool, Number(req.params.id));
    if (!row) return res.status(404).json({ message: 'Lab result not found' });
    res.json(buildObservationsFromLabResult(row, row.values || []));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/integrations/fhir/composition/:patientId — clinical summary (Composition + Patient)
 */
router.get('/fhir/consent/:patientId', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const row = await loadPatientRow(pool, patientId);
    if (!row) return res.status(404).json({ message: 'Patient not found' });
    const [consents] = await pool.execute(
      `SELECT consentType, granted, signatureName, grantedAt AS capturedAt FROM patient_consents WHERE patientId = ? ORDER BY grantedAt ASC`,
      [patientId]
    );
    const patient = buildPatient(row);
    const consentResources = buildPatientConsents(patientId, consents || []);
    res.json(buildBundle([patient, ...consentResources], 'collection'));
  } catch (err) {
    console.error('fhir consent:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/fhir/composition/:patientId', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const resources = await buildClinicalSummaryResources(pool, patientId);
    res.json(buildBundle(resources, 'collection'));
  } catch (err) {
    if (err.message === 'Patient not found') {
      return res.status(404).json({ message: err.message });
    }
    console.error('fhir composition:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST publish endpoints
 */
router.post('/fhir/publish/patient/:id', async (req, res) => {
  try {
    const result = await publishPatient(pool, Number(req.params.id));
    res.status(result.status === 'failed' ? 502 : 200).json(result);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

router.post('/fhir/publish/encounter/:id', async (req, res) => {
  try {
    const result = await publishEncounter(pool, Number(req.params.id));
    res.status(result.status === 'failed' ? 502 : 200).json(result);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

router.post('/fhir/publish/observation/:id', async (req, res) => {
  try {
    const result = await publishLabObservation(pool, Number(req.params.id));
    res.status(result.status === 'failed' ? 502 : 200).json(result);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

router.post('/fhir/publish/composition/:patientId', async (req, res) => {
  try {
    const result = await publishClinicalSummary(pool, Number(req.params.patientId));
    res.status(result.status === 'failed' ? 502 : 200).json(result);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

router.post('/fhir/publish/consent/:patientId', async (req, res) => {
  try {
    const result = await publishConsent(pool, Number(req.params.patientId));
    res.status(result.status === 'failed' ? 502 : 200).json(result);
  } catch (err) {
    if (err.message === 'Patient not found') {
      return res.status(404).json({ message: err.message });
    }
    console.error('fhir publish consent:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
