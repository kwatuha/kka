/**
 * MCH — antenatal care visits (DHA Phase 12 partial MCH module).
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/patients/:patientId/anc-visits', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const [rows] = await pool.execute(
      `SELECT v.*, u.firstName AS seenByFirstName, u.lastName AS seenByLastName
       FROM antenatal_visits v
       LEFT JOIN users u ON u.userId = v.seenBy
       WHERE v.patientId = ?
       ORDER BY v.visitDate DESC, v.visitId DESC
       LIMIT 100`,
      [patientId]
    );
    res.json(rows);
  } catch (err) {
    console.error('anc list:', err);
    res.status(500).json({ message: 'Failed to load ANC visits', error: err.message });
  }
});

async function patientDeliveryIds(db, patientId) {
  const [rows] = await db.execute(
    `SELECT d.deliveryId, d.deliveryDate, d.deliveryType, d.deliveryTime
     FROM deliveries d
     INNER JOIN maternity_admissions ma ON ma.maternityAdmissionId = d.maternityAdmissionId
     INNER JOIN admissions a ON a.admissionId = ma.admissionId
     WHERE a.patientId = ?
     ORDER BY d.deliveryDate DESC, d.deliveryId DESC
     LIMIT 50`,
    [patientId]
  );
  return rows || [];
}

router.get('/patients/:patientId/deliveries', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const rows = await patientDeliveryIds(pool, patientId);
    res.json(rows);
  } catch (err) {
    console.error('mch deliveries:', err);
    res.status(500).json({ message: 'Failed to load deliveries', error: err.message });
  }
});

router.get('/patients/:patientId/pnc-visits', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const [rows] = await pool.execute(
      `SELECT v.*, u.firstName AS seenByFirstName, u.lastName AS seenByLastName
       FROM postnatal_visits v
       LEFT JOIN users u ON u.userId = v.seenBy
       WHERE v.motherPatientId = ?
       ORDER BY v.visitDate DESC, v.visitId DESC
       LIMIT 100`,
      [patientId]
    );
    res.json(rows);
  } catch (err) {
    if (String(err.message || '').includes("doesn't exist")) {
      return res.json([]);
    }
    console.error('pnc list:', err);
    res.status(500).json({ message: 'Failed to load postnatal visits', error: err.message });
  }
});

router.post('/patients/:patientId/pnc-visits', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const body = req.body || {};
    const deliveryId = Number(body.deliveryId);
    const visitDate = body.visitDate || new Date().toISOString().slice(0, 10);
    if (!deliveryId) {
      return res.status(400).json({ message: 'deliveryId is required (link PNC to a maternity delivery)' });
    }

    const deliveries = await patientDeliveryIds(pool, patientId);
    if (!deliveries.some((d) => Number(d.deliveryId) === deliveryId)) {
      return res.status(400).json({ message: 'deliveryId does not belong to this patient' });
    }

    const seenBy = req.user?.id || req.user?.userId || body.seenBy || null;
    const visitType = body.visitType || 'other';
    const allowedTypes = ['day1', 'day3', 'day7', 'week6', 'other'];
    if (!allowedTypes.includes(visitType)) {
      return res.status(400).json({ message: `visitType must be one of ${allowedTypes.join(', ')}` });
    }

    const [result] = await pool.execute(
      `INSERT INTO postnatal_visits (
        deliveryId, motherPatientId, visitDate, visitType, maternalCondition, babyCondition,
        breastfeedingStatus, findings, nextAppointmentDate, seenBy, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deliveryId,
        patientId,
        visitDate,
        visitType,
        body.maternalCondition || null,
        body.babyCondition || null,
        body.breastfeedingStatus || null,
        body.findings || null,
        body.nextAppointmentDate || null,
        seenBy,
        body.notes || null,
      ]
    );
    const [rows] = await pool.execute('SELECT * FROM postnatal_visits WHERE visitId = ?', [
      result.insertId,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('pnc create:', err);
    res.status(500).json({ message: 'Failed to create postnatal visit', error: err.message });
  }
});

router.post('/patients/:patientId/anc-visits', async (req, res) => {
  try {
    const patientId = Number(req.params.patientId);
    const body = req.body || {};
    const visitDate = body.visitDate || new Date().toISOString().slice(0, 10);
    if (!visitDate) return res.status(400).json({ message: 'visitDate is required' });

    const seenBy = req.user?.id || req.user?.userId || body.seenBy || null;
    const [result] = await pool.execute(
      `INSERT INTO antenatal_visits (
        patientId, visitDate, gestationWeeks, weight, bloodPressure, fundalHeight,
        fetalHeartRate, presentation, findings, nextAppointmentDate, seenBy, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        visitDate,
        body.gestationWeeks != null ? Number(body.gestationWeeks) : null,
        body.weight != null ? Number(body.weight) : null,
        body.bloodPressure || null,
        body.fundalHeight != null ? Number(body.fundalHeight) : null,
        body.fetalHeartRate != null ? Number(body.fetalHeartRate) : null,
        body.presentation || null,
        body.findings || null,
        body.nextAppointmentDate || null,
        seenBy,
        body.notes || null,
      ]
    );
    const [rows] = await pool.execute('SELECT * FROM antenatal_visits WHERE visitId = ?', [
      result.insertId,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('anc create:', err);
    res.status(500).json({ message: 'Failed to create ANC visit', error: err.message });
  }
});

module.exports = router;
