const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { computeCqmPackage, indicatorsToCsv } = require('../lib/cqmIndicators');
const {
  createCqmSubmission,
  listCqmSubmissions,
  getCqmSubmissionById,
} = require('../lib/cqmSubmission');

router.use(authenticate);

router.get('/summary', async (req, res) => {
  try {
    const pkg = await computeCqmPackage(null, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.json(pkg);
  } catch (err) {
    console.error('CQM summary:', err);
    res.status(500).json({ error: err.message || 'CQM calculation failed' });
  }
});

router.get('/export.json', async (req, res) => {
  try {
    const pkg = await computeCqmPackage(null, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cqm-indicators-${pkg.period.startDate}-${pkg.period.endDate}.json"`
    );
    res.json(pkg);
  } catch (err) {
    console.error('CQM JSON export:', err);
    res.status(500).json({ error: err.message || 'CQM JSON export failed' });
  }
});

router.get('/export.csv', async (req, res) => {
  try {
    const pkg = await computeCqmPackage(null, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    const csv = indicatorsToCsv(pkg);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cqm-indicators-${pkg.period.startDate}-${pkg.period.endDate}.csv"`
    );
    res.send(csv);
  } catch (err) {
    console.error('CQM export:', err);
    res.status(500).json({ error: err.message || 'CQM export failed' });
  }
});

router.post('/submissions', async (req, res) => {
  try {
    const { startDate, endDate, notes } = req.body || {};
    const result = await createCqmSubmission({
      startDate,
      endDate,
      notes,
      submittedBy: req.user?.id || req.user?.userId,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('CQM submission:', err);
    res.status(err.status || 500).json({ error: err.message || 'CQM submission failed' });
  }
});

router.get('/submissions', async (req, res) => {
  try {
    const rows = await listCqmSubmissions(req.query.limit);
    res.json({ submissions: rows });
  } catch (err) {
    console.error('CQM submissions list:', err);
    res.status(500).json({ error: err.message || 'Could not list CQM submissions' });
  }
});

router.get('/submissions/:id', async (req, res) => {
  try {
    const row = await getCqmSubmissionById(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json({
      ...row,
      payload: JSON.parse(row.payloadJson || '{}'),
    });
  } catch (err) {
    console.error('CQM submission get:', err);
    res.status(500).json({ error: err.message || 'Could not load submission' });
  }
});

router.get('/submissions/:id/download.json', async (req, res) => {
  try {
    const row = await getCqmSubmissionById(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${row.submissionRef}.json"`
    );
    res.send(row.payloadJson);
  } catch (err) {
    console.error('CQM submission download:', err);
    res.status(500).json({ error: err.message || 'Download failed' });
  }
});

module.exports = router;
