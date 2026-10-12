/**
 * DHA standards — KENHDD validation reports, HL7 v2 lab ORU (sandbox).
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { validatePatient, validateSample } = require('../lib/kenhddValidator');
const { buildOruR01 } = require('../lib/hl7OruBuilder');
const { loadLabResultRow } = require('../lib/fhirMediator');

router.get('/kenhdd/validate/patient/:patientId', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const report = await validatePatient(pool, patientId);
    if (!report) return res.status(404).json({ message: 'Patient not found' });
    res.json(report);
  } catch (err) {
    console.error('kenhdd validate patient:', err);
    res.status(500).json({ message: 'KENHDD validation failed', error: err.message });
  }
});

router.get('/kenhdd/validate/sample', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const report = await validateSample(pool, limit);
    res.setHeader('Content-Disposition', 'attachment; filename="kenhdd-sample-validation.json"');
    res.json(report);
  } catch (err) {
    console.error('kenhdd validate sample:', err);
    res.status(500).json({ message: 'KENHDD sample validation failed', error: err.message });
  }
});

router.get('/hl7/oru/:resultId', async (req, res) => {
  try {
    const resultId = Number(req.params.resultId);
    const row = await loadLabResultRow(pool, resultId);
    if (!row) return res.status(404).json({ message: 'Lab result not found' });
    const payload = buildOruR01(row);
    if (String(req.query.format || '').toLowerCase() === 'plain') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="oru-${resultId}.hl7"`);
      return res.send(payload.hl7);
    }
    res.json(payload);
  } catch (err) {
    console.error('hl7 oru:', err);
    res.status(500).json({ message: 'HL7 ORU build failed', error: err.message });
  }
});

module.exports = router;
