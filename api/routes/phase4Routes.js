/**
 * Phase 4 routes: IDSR, DHIS2, SHA (mounted under /api/integrations)
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const idsr = require('../lib/idsrPublisher');
const dhis2 = require('../lib/dhis2Exporter');
const sha = require('../lib/shaClaimsAdapter');
const { exportWeeklyIdsrPackage } = require('../lib/idsrWeeklyExporter');
const { getRequestUserId } = require('../lib/branchContext');
const { auditFromRequest } = require('../lib/auditLog');

router.get('/phase4/settings', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT idsrMode, idsrBaseUrl, dhis2Mode, dhis2BaseUrl, dhis2OrgUnit,
              shaMode, shaBaseUrl, autoSubmitShaClaims
       FROM integration_registry_settings WHERE settingId = 1 LIMIT 1`
    );
    const s = rows[0] || {};
    const [idsrCounts] = await pool.execute(
      `SELECT status, COUNT(*) AS c FROM idsr_alerts GROUP BY status`
    );
    const [dhisCounts] = await pool.execute(
      `SELECT status, COUNT(*) AS c FROM dhis2_export_log GROUP BY status`
    );
    const [shaCounts] = await pool.execute(
      `SELECT status, COUNT(*) AS c FROM sha_claim_submissions GROUP BY status`
    );
    res.json({
      idsr: {
        mode: idsr.resolveMode(s),
        baseUrlConfigured: Boolean(process.env.IDSR_BASE_URL || s.idsrBaseUrl),
        byStatus: Object.fromEntries((idsrCounts || []).map((r) => [r.status, Number(r.c)])),
      },
      dhis2: {
        mode: dhis2.resolveMode(s),
        baseUrlConfigured: Boolean(process.env.DHIS2_BASE_URL || s.dhis2BaseUrl),
        orgUnit: process.env.DHIS2_ORG_UNIT || s.dhis2OrgUnit || null,
        byStatus: Object.fromEntries((dhisCounts || []).map((r) => [r.status, Number(r.c)])),
      },
      sha: {
        mode: sha.resolveMode(s),
        baseUrlConfigured: Boolean(process.env.SHA_BASE_URL || s.shaBaseUrl),
        autoSubmitShaClaims: s.autoSubmitShaClaims !== 0,
        byStatus: Object.fromEntries((shaCounts || []).map((r) => [r.status, Number(r.c)])),
      },
    });
  } catch (err) {
    console.error('phase4 settings:', err);
    res.status(500).json({ message: 'Failed to load Phase 4 settings', error: err.message });
  }
});

router.put('/phase4/settings', async (req, res) => {
  try {
    const body = req.body || {};
    const map = {
      idsrMode: body.idsrMode,
      dhis2Mode: body.dhis2Mode,
      dhis2OrgUnit: body.dhis2OrgUnit,
      shaMode: body.shaMode,
      autoSubmitShaClaims: body.autoSubmitShaClaims,
    };
    const updates = [];
    const values = [];
    for (const [col, val] of Object.entries(map)) {
      if (val === undefined) continue;
      updates.push(`${col} = ?`);
      values.push(col === 'autoSubmitShaClaims' ? (val ? 1 : 0) : val || null);
    }
    if (!updates.length) return res.status(400).json({ message: 'No settings to update' });
    updates.push('updatedBy = ?');
    values.push(req.user?.id || null);
    await pool.execute(
      `UPDATE integration_registry_settings SET ${updates.join(', ')} WHERE settingId = 1`,
      values
    );
    res.json({ message: 'Phase 4 settings saved' });
  } catch (err) {
    console.error('phase4 settings update:', err);
    res.status(500).json({ message: 'Failed to save settings', error: err.message });
  }
});

router.get('/idsr/catalog', async (req, res) => {
  try {
    const catalog = await idsr.loadCatalog(pool);
    res.json({ diseases: catalog });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/idsr/alerts', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 40, 200);
    const params = [];
    let where = 'WHERE 1=1';
    const status = req.query.status ? String(req.query.status).trim() : '';
    if (status && status !== 'all') {
      where += ' AND a.status = ?';
      params.push(status);
    }
    if (req.query.patientId) {
      where += ' AND a.patientId = ?';
      params.push(Number(req.query.patientId));
    }
    const [rows] = await pool.execute(
      `SELECT a.alertId, a.diseaseCode, a.diseaseName, a.urgency, a.patientId, a.sourceType, a.sourceId,
              a.facilityMflCode, a.facilityName, a.summary, a.mode, a.status, a.createdAt, a.publishedAt,
              l.eventCode AS ihrEventCode, c.title AS ihrEventTitle
       FROM idsr_alerts a
       LEFT JOIN ihr_idsr_links l ON l.linkId = (
         SELECT MIN(linkId) FROM ihr_idsr_links WHERE idsrAlertId = a.alertId
       )
       LEFT JOIN ihr_event_catalog c ON c.eventCode = l.eventCode
       ${where}
       ORDER BY a.alertId DESC
       LIMIT ${limit}`,
      params
    );
    const [counts] = await pool.execute(
      `SELECT status, COUNT(*) AS c FROM idsr_alerts GROUP BY status`
    );
    res.json({
      alerts: rows,
      byStatus: Object.fromEntries((counts || []).map((r) => [r.status, Number(r.c)])),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/idsr/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alertId = Number(req.params.id);
    const userId = getRequestUserId(req);
    const [existing] = await pool.execute(
      'SELECT alertId, patientId, diseaseCode, status FROM idsr_alerts WHERE alertId = ? LIMIT 1',
      [alertId]
    );
    if (!existing.length) return res.status(404).json({ message: 'Alert not found' });
    if (existing[0].status === 'acknowledged') {
      return res.json({ message: 'Already acknowledged', alertId, status: 'acknowledged' });
    }
    await pool.execute(
      `UPDATE idsr_alerts SET status = 'acknowledged' WHERE alertId = ?`,
      [alertId]
    );
    await auditFromRequest(req, {
      action: 'IDSR_ACK',
      resourceType: 'idsr_alert',
      resourceId: String(alertId),
      patientId: existing[0].patientId || null,
      summary: `IDSR alert acknowledged: ${existing[0].diseaseCode}`,
    });
    res.json({
      alertId,
      status: 'acknowledged',
      acknowledgedBy: userId || null,
      message: 'Alert acknowledged for facility review',
    });
  } catch (err) {
    console.error('idsr acknowledge:', err);
    res.status(500).json({ message: err.message || 'Acknowledge failed' });
  }
});

router.post('/idsr/weekly-export', async (req, res) => {
  try {
    const result = await exportWeeklyIdsrPackage(pool, {
      referenceDate: req.body?.referenceDate || null,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('idsr weekly export:', err);
    res.status(500).json({ message: 'IDSR weekly export failed', error: err.message });
  }
});

router.get('/idsr/weekly-reports', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 12, 52);
    const [rows] = await pool.execute(
      `SELECT reportId, weekLabel, periodStart, periodEnd, mode, alertCount, status,
              externalReference, generatedAt, submittedAt
       FROM idsr_weekly_reports ORDER BY reportId DESC LIMIT ${limit}`
    );
    res.json({ reports: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/idsr/weekly-reports/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM idsr_weekly_reports WHERE reportId = ? LIMIT 1`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Report not found' });
    const row = rows[0];
    if (typeof row.packageJson === 'string') {
      try {
        row.packageJson = JSON.parse(row.packageJson);
      } catch {
        /* keep */
      }
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/idsr/evaluate', async (req, res) => {
  try {
    const result = await idsr.evaluateAndPublish(pool, {
      text: req.body?.text || req.body?.diagnosis || '',
      patientId: req.body?.patientId || null,
      sourceType: req.body?.sourceType || 'manual',
      sourceId: req.body?.sourceId || `manual-${Date.now()}`,
      facilityMflCode: req.body?.facilityMflCode || null,
      facilityName: req.body?.facilityName || null,
      summary: req.body?.summary || null,
    });
    res.json(result);
  } catch (err) {
    res.status(502).json({ message: 'IDSR evaluate failed', error: err.message });
  }
});

router.post('/dhis2/export', async (req, res) => {
  try {
    const result = await dhis2.exportPeriod(pool, {
      period: req.body?.period || req.query.period,
      format: req.body?.format || req.query.format || 'json',
    });
    res.status(result.status === 'failed' ? 502 : 200).json(result);
  } catch (err) {
    res.status(500).json({ message: 'DHIS2 export failed', error: err.message });
  }
});

router.get('/dhis2/exports', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const [rows] = await pool.execute(
      `SELECT exportId, period, datasetCode, orgUnit, mode, status, format, httpStatus,
              responseSummary, createdAt, publishedAt
       FROM dhis2_export_log ORDER BY exportId DESC LIMIT ${limit}`
    );
    res.json({ exports: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/dhis2/exports/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM dhis2_export_log WHERE exportId = ? LIMIT 1`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Export not found' });
    const row = rows[0];
    if (typeof row.packageJson === 'string') {
      try {
        row.packageJson = JSON.parse(row.packageJson);
      } catch {
        /* keep string */
      }
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/sha/submit/:claimId', async (req, res) => {
  try {
    const result = await sha.submitClaim(pool, Number(req.params.claimId), {
      force: Boolean(req.body?.force),
    });
    res.status(result.status === 'failed' ? 502 : 200).json(result);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

router.get('/sha/submissions', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const [rows] = await pool.execute(
      `SELECT submissionId, claimId, claimNumber, patientId, mode, status,
              externalReference, httpStatus, createdAt, submittedAt
       FROM sha_claim_submissions ORDER BY submissionId DESC LIMIT ${limit}`
    );
    res.json({ submissions: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/sha/preview/:claimId', async (req, res) => {
  try {
    const claim = await sha.loadClaim(pool, Number(req.params.claimId));
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json({
      isSha: sha.isShaProvider(claim),
      payload: sha.buildShaPayload(claim),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
