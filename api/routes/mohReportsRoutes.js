// MOH Reports routes - Ministry of Health facility reports
const express = require('express');
const router = express.Router();
const { getCatalog, getReport } = require('../lib/mohReportService');
const {
  exportMohRoutineBundle,
  exportMohReportPackage,
  monthBounds,
} = require('../lib/mohReportExporter');

/**
 * Flatten helper for legacy UI that expects bare indicator objects.
 */
function sendLegacyOrFull(req, res, report, legacyFlat = false) {
  if (legacyFlat || req.query.format === 'legacy') {
    return res.status(200).json(report.indicators || { rows: report.rows });
  }
  return res.status(200).json(report);
}

/**
 * @route GET /api/moh-reports
 * @description List available MOH reports
 */
router.get('/', (_req, res) => {
  res.status(200).json({
    reports: getCatalog(),
    source: 'Ministry of Health facility reporting catalog',
  });
});

/**
 * Legacy flat endpoints used by existing React components.
 * Immunization data historically lived under /711 — keep that for old UI;
 * official immunization summary is /710.
 */
router.get('/717', async (req, res) => {
  try {
    const report = await getReport('717', req.query.startDate, req.query.endDate);
    sendLegacyOrFull(req, res, report, true);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.get('/705', async (req, res) => {
  try {
    const report = await getReport('705', req.query.startDate, req.query.endDate);
    sendLegacyOrFull(req, res, report, true);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.get('/708', async (req, res) => {
  try {
    const report = await getReport('708', req.query.startDate, req.query.endDate);
    sendLegacyOrFull(req, res, report, true);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.get('/730', async (req, res) => {
  try {
    const report = await getReport('730');
    sendLegacyOrFull(req, res, report, true);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.get('/731-plus', async (req, res) => {
  try {
    const report = await getReport('731-plus', req.query.startDate, req.query.endDate);
    sendLegacyOrFull(req, res, report, true);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/** Official MOH 711 — integrated RH/HIV/malaria/TB/nutrition (not immunization). */
router.get('/711', async (req, res) => {
  try {
    const report = await getReport('711', req.query.startDate, req.query.endDate);
    if (req.query.format === 'legacy') {
      return sendLegacyOrFull(req, res, report, true);
    }
    return res.status(200).json(report);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/** Immunization summary — MOH 710 (also serves legacy UI that called /711). */
router.get('/710', async (req, res) => {
  try {
    const report = await getReport('710', req.query.startDate, req.query.endDate);
    if (req.query.format === 'legacy') {
      return sendLegacyOrFull(req, res, report, true);
    }
    return res.status(200).json(report);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.post('/scheduled-export', async (req, res) => {
  try {
    const body = req.body || {};
    if (body.reportCode) {
      const bounds = monthBounds(body.referenceDate ? new Date(body.referenceDate) : new Date());
      const result = await exportMohReportPackage(null, {
        reportCode: body.reportCode,
        startDate: body.startDate || bounds.start,
        endDate: body.endDate || bounds.end,
        periodLabel: body.periodLabel || bounds.periodLabel,
      });
      return res.status(201).json(result);
    }
    const result = await exportMohRoutineBundle(null, {
      referenceDate: body.referenceDate,
      startDate: body.startDate,
      endDate: body.endDate,
      periodLabel: body.periodLabel,
      reportCodes: body.reportCodes,
    });
    res.status(201).json(result);
  } catch (error) {
    console.error('MOH scheduled export:', error);
    res.status(500).json({ message: error.message || 'MOH export failed' });
  }
});

router.get('/exports', async (req, res) => {
  try {
    const pool = require('../config/db');
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const [rows] = await pool.execute(
      `SELECT exportId, reportCode, periodLabel, startDate, endDate, sha256, status, generatedAt
       FROM moh_report_exports ORDER BY exportId DESC LIMIT ${limit}`
    );
    res.json({ exports: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/moh-reports/:code
 * @description Generate a MOH report by code (envelope with indicators or rows)
 */
router.get('/:code', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await getReport(req.params.code, startDate, endDate);
    res.status(200).json(report);
  } catch (error) {
    const status = error.status || 500;
    console.error(`Error fetching MOH ${req.params.code} data:`, error);
    res.status(status).json({
      message: error.message || `Error fetching MOH ${req.params.code} data`,
      error: error.message,
    });
  }
});

module.exports = router;
