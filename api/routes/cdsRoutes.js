/**
 * Phase 8 — CDS baseline API
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { evaluateClinicalContext } = require('../lib/cdsEvaluator');
const { auditFromRequest } = require('../lib/auditLog');

router.post('/evaluate', async (req, res) => {
  try {
    const { patientId, medicationNames, clinicalText } = req.body || {};
    const hasMeds = Array.isArray(medicationNames) && medicationNames.length > 0;
    const hasText = String(clinicalText || '').trim().length >= 4;
    if (!patientId && !hasMeds && !hasText) {
      return res.status(400).json({ message: 'Provide patientId and/or clinicalText or medicationNames' });
    }
    const result = await evaluateClinicalContext(pool, {
      patientId: patientId ? Number(patientId) : null,
      medicationNames: medicationNames || [],
      clinicalText: clinicalText || null,
    });
    if (result.alerts?.length) {
      await auditFromRequest(req, {
        action: 'CDS_ALERT',
        resourceType: 'patient',
        resourceId: String(patientId),
        patientId: Number(patientId),
        summary: result.alerts[0].message,
      });
    }
    res.json(result);
  } catch (err) {
    console.error('cds evaluate:', err);
    res.status(500).json({ message: 'CDS evaluation failed', error: err.message });
  }
});

module.exports = router;
