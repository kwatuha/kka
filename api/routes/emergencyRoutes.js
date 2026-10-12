/**
 * Emergency care — treat first, complete registration later.
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { createQueueEntry } = require('../lib/queueService');

async function nextEncounterNumber(connection) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ER-${day}-`;
  const [rows] = await connection.execute(
    `SELECT MAX(CAST(SUBSTRING_INDEX(encounterNumber, '-', -1) AS UNSIGNED)) AS maxNum
     FROM emergency_encounters WHERE encounterNumber LIKE CONCAT(?, '%')`,
    [prefix]
  );
  const next = (rows[0]?.maxNum || 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function nextProvisionalPatientNumber(connection) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `TMP-${day}-`;
  const [rows] = await connection.execute(
    `SELECT MAX(CAST(SUBSTRING_INDEX(patientNumber, '-', -1) AS UNSIGNED)) AS maxNum
     FROM patients WHERE patientNumber LIKE CONCAT(?, '%')`,
    [prefix]
  );
  const next = (rows[0]?.maxNum || 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/**
 * POST /api/emergency/intake
 * Minimal intake: provisional patient + emergency encounter + high-priority clinical queue.
 * Skips cashier / full registration.
 */
router.post('/intake', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      firstName,
      lastName,
      gender,
      approximateAge,
      arrivalMode = 'walk_in',
      acuity = 'urgent',
      chiefComplaint,
      locationNotes,
      notes,
      patientId: existingPatientId,
      patientType = 'non_paying',
      priority,
    } = req.body;

    const userId = req.user?.id || req.user?.userId || null;
    let patientId = existingPatientId ? Number(existingPatientId) : null;

    if (!patientId) {
      const patientNumber = await nextProvisionalPatientNumber(connection);
      const safeFirst = String(firstName || 'Unknown').trim() || 'Unknown';
      const safeLast = String(lastName || 'Trauma').trim() || 'Trauma';
      const safeGender = ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Other';

      let dateOfBirth = null;
      const ageNum = Number(approximateAge);
      if (Number.isFinite(ageNum) && ageNum >= 0 && ageNum < 130) {
        const y = new Date().getFullYear() - Math.floor(ageNum);
        dateOfBirth = `${y}-01-01`;
      }

      const billingType = ['paying', 'insurance', 'non_paying'].includes(patientType)
        ? patientType
        : 'non_paying';

      const [ins] = await connection.execute(
        `INSERT INTO patients
         (patientNumber, firstName, lastName, dateOfBirth, gender, patientType, isProvisional, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [patientNumber, safeFirst, safeLast, dateOfBirth, safeGender, billingType, userId]
      );
      patientId = ins.insertId;
    }

    const encounterNumber = await nextEncounterNumber(connection);
    const [enc] = await connection.execute(
      `INSERT INTO emergency_encounters
       (patientId, encounterNumber, arrivalMode, acuity, chiefComplaint, locationNotes, notes, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        encounterNumber,
        arrivalMode || 'walk_in',
        acuity || 'urgent',
        chiefComplaint || null,
        locationNotes || null,
        notes || null,
        userId,
      ]
    );

    const queuePriority =
      priority ||
      (acuity === 'critical' ? 'emergency' : acuity === 'urgent' ? 'urgent' : 'normal');

    const queueId = await createQueueEntry(connection, {
      patientId,
      servicePoint: 'consultation',
      priority: queuePriority,
      notes: `Emergency intake ${encounterNumber}${chiefComplaint ? ` — ${chiefComplaint}` : ''}`,
      userId,
      req,
      checkDuplicate: false,
    });

    await connection.commit();

    const [patient] = await connection.execute(
      `SELECT patientId, patientNumber, firstName, lastName, gender, patientType, isProvisional
       FROM patients WHERE patientId = ?`,
      [patientId]
    );
    const [encounter] = await connection.execute(
      `SELECT * FROM emergency_encounters WHERE encounterId = ?`,
      [enc.insertId]
    );

    res.status(201).json({
      patient: patient[0],
      encounter: encounter[0],
      queueId,
      message: 'Emergency intake created — complete full registration when the patient is stable',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Emergency intake error:', error);
    res.status(500).json({ message: 'Failed to create emergency intake', error: error.message });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/emergency/encounters
 */
router.get('/encounters', async (req, res) => {
  try {
    const { status = 'active', limit = 50 } = req.query;
    const lim = Math.min(Number(limit) || 50, 200);
    const params = [];
    let sql = `
      SELECT e.*, p.patientNumber, p.firstName, p.lastName, p.gender, p.isProvisional, p.patientType
      FROM emergency_encounters e
      JOIN patients p ON p.patientId = e.patientId
      WHERE 1=1`;
    if (status && status !== 'all') {
      sql += ` AND e.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY e.intakeAt DESC LIMIT ${lim}`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('List emergency encounters:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/emergency/encounters/:id/complete-registration
 * Clears provisional flag after demographics are filled elsewhere.
 */
router.put('/encounters/:id/complete-registration', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const [encRows] = await connection.execute(
      `SELECT * FROM emergency_encounters WHERE encounterId = ?`,
      [id]
    );
    if (!encRows.length) {
      return res.status(404).json({ message: 'Encounter not found' });
    }
    const enc = encRows[0];
    await connection.execute(
      `UPDATE patients SET isProvisional = 0, updatedAt = NOW() WHERE patientId = ?`,
      [enc.patientId]
    );
    await connection.execute(
      `UPDATE emergency_encounters
       SET registrationCompletedAt = NOW(), updatedAt = NOW()
       WHERE encounterId = ?`,
      [id]
    );
    res.json({ message: 'Registration marked complete', patientId: enc.patientId, encounterId: id });
  } catch (error) {
    console.error('Complete registration:', error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/emergency/encounters/:id/status
 */
router.put('/encounters/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const allowed = ['active', 'admitted', 'discharged', 'deceased', 'left', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });
    }
    await pool.execute(
      `UPDATE emergency_encounters SET status = ?, updatedAt = NOW() WHERE encounterId = ?`,
      [status, id]
    );
    res.json({ encounterId: id, status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
