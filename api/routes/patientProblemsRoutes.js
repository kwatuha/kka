/**
 * DHA Phase 7 — structured problem list (ICD-10 capable).
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getRequestUserId } = require('../lib/branchContext');
const { auditFromRequest } = require('../lib/auditLog');
const { lookupSnomedForIcd10 } = require('../lib/snomedMap');
const { maybeRepublishClinicalSummary } = require('../lib/fhirMediator');

router.get('/:patientId/problems/snomed-lookup', async (req, res) => {
  try {
    const mapped = lookupSnomedForIcd10(req.query.icd10);
    res.json(mapped || { icd10: req.query.icd10 || null, snomed: null, display: null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:patientId/problems', async (req, res) => {
  try {
    const { patientId } = req.params;
    const includeResolved = req.query.includeResolved === '1';
    let sql = `
      SELECT problemId, patientId, medicalRecordId, icd10Code, snomedCode, snomedDisplay,
             problemText, status, onsetDate, resolvedDate,
             recordedBy, notes, carePlanNotes, createdAt, updatedAt
      FROM patient_problems
      WHERE patientId = ? AND voided = 0`;
    if (!includeResolved) sql += ` AND status = 'active'`;
    sql += ' ORDER BY status ASC, onsetDate DESC, problemId DESC';
    const [rows] = await pool.execute(sql, [patientId]);
    res.json(rows);
  } catch (err) {
    console.error('problems list:', err);
    res.status(500).json({ message: 'Failed to load problems', error: err.message });
  }
});

router.post('/:patientId/problems', async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      icd10Code,
      problemText,
      status,
      onsetDate,
      notes,
      carePlanNotes,
      snomedCode,
      snomedDisplay,
      medicalRecordId,
    } = req.body || {};
    if (!String(problemText || '').trim()) {
      return res.status(400).json({ message: 'problemText is required' });
    }
    let snomed = snomedCode ? String(snomedCode).trim().slice(0, 32) : null;
    let snomedLabel = snomedDisplay ? String(snomedDisplay).trim().slice(0, 255) : null;
    if (!snomed && icd10Code) {
      const mapped = lookupSnomedForIcd10(icd10Code);
      if (mapped) {
        snomed = mapped.snomed;
        snomedLabel = mapped.display;
      }
    }
    const recordId =
      medicalRecordId != null && medicalRecordId !== '' ? Number(medicalRecordId) : null;
    const userId = getRequestUserId(req);
    const st = ['active', 'inactive', 'resolved'].includes(status) ? status : 'active';
    const [result] = await pool.execute(
      `INSERT INTO patient_problems
       (patientId, medicalRecordId, icd10Code, snomedCode, snomedDisplay, problemText, status, onsetDate, recordedBy, notes, carePlanNotes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        recordId,
        icd10Code || null,
        snomed,
        snomedLabel,
        String(problemText).trim().slice(0, 500),
        st,
        onsetDate || null,
        userId,
        notes || null,
        carePlanNotes ? String(carePlanNotes).trim().slice(0, 2000) : null,
      ]
    );
    await auditFromRequest(req, {
      action: 'CREATE',
      resourceType: 'patient_problem',
      resourceId: String(result.insertId),
      patientId: Number(patientId),
      summary: `Problem added: ${String(problemText).trim().slice(0, 80)}`,
    });
    const [rows] = await pool.execute(
      'SELECT * FROM patient_problems WHERE problemId = ?',
      [result.insertId]
    );
    await maybeRepublishClinicalSummary(pool, patientId);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('problem create:', err);
    res.status(500).json({ message: 'Failed to create problem', error: err.message });
  }
});

router.put('/:patientId/problems/:problemId', async (req, res) => {
  try {
    const { patientId, problemId } = req.params;
    const {
      icd10Code,
      problemText,
      status,
      onsetDate,
      resolvedDate,
      notes,
      carePlanNotes,
      snomedCode,
      snomedDisplay,
      medicalRecordId,
    } = req.body || {};
    const updates = [];
    const values = [];
    if (icd10Code !== undefined) {
      updates.push('icd10Code = ?');
      values.push(icd10Code || null);
      if (snomedCode === undefined && snomedDisplay === undefined && icd10Code) {
        const mapped = lookupSnomedForIcd10(icd10Code);
        if (mapped) {
          updates.push('snomedCode = ?', 'snomedDisplay = ?');
          values.push(mapped.snomed, mapped.display);
        }
      }
    }
    if (snomedCode !== undefined) {
      updates.push('snomedCode = ?');
      values.push(snomedCode ? String(snomedCode).trim().slice(0, 32) : null);
    }
    if (snomedDisplay !== undefined) {
      updates.push('snomedDisplay = ?');
      values.push(snomedDisplay ? String(snomedDisplay).trim().slice(0, 255) : null);
    }
    if (medicalRecordId !== undefined) {
      updates.push('medicalRecordId = ?');
      values.push(
        medicalRecordId != null && medicalRecordId !== '' ? Number(medicalRecordId) : null
      );
    }
    if (problemText !== undefined) {
      updates.push('problemText = ?');
      values.push(String(problemText).trim().slice(0, 500));
    }
    if (status !== undefined) {
      const st = ['active', 'inactive', 'resolved'].includes(status) ? status : 'active';
      updates.push('status = ?');
      values.push(st);
      if (st === 'resolved' && resolvedDate === undefined) {
        updates.push('resolvedDate = CURDATE()');
      }
    }
    if (onsetDate !== undefined) {
      updates.push('onsetDate = ?');
      values.push(onsetDate || null);
    }
    if (resolvedDate !== undefined) {
      updates.push('resolvedDate = ?');
      values.push(resolvedDate || null);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes || null);
    }
    if (carePlanNotes !== undefined) {
      updates.push('carePlanNotes = ?');
      values.push(carePlanNotes ? String(carePlanNotes).trim().slice(0, 2000) : null);
    }
    if (!updates.length) return res.status(400).json({ message: 'No fields to update' });
    values.push(problemId, patientId);
    await pool.execute(
      `UPDATE patient_problems SET ${updates.join(', ')} WHERE problemId = ? AND patientId = ? AND voided = 0`,
      values
    );
    await auditFromRequest(req, {
      action: 'UPDATE',
      resourceType: 'patient_problem',
      resourceId: String(problemId),
      patientId: Number(patientId),
      summary: 'Problem list updated',
    });
    const [rows] = await pool.execute(
      'SELECT * FROM patient_problems WHERE problemId = ? AND patientId = ?',
      [problemId, patientId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Problem not found' });
    await maybeRepublishClinicalSummary(pool, patientId);
    res.json(rows[0]);
  } catch (err) {
    console.error('problem update:', err);
    res.status(500).json({ message: 'Failed to update problem', error: err.message });
  }
});

module.exports = router;
