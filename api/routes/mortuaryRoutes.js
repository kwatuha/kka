/**
 * Mortuary management — body intake after death outcome or brought-in-dead.
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

async function nextCaseNumber(connection) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MOR-${day}-`;
  const [rows] = await connection.execute(
    `SELECT MAX(CAST(SUBSTRING_INDEX(caseNumber, '-', -1) AS UNSIGNED)) AS maxNum
     FROM mortuary_cases WHERE caseNumber LIKE CONCAT(?, '%')`,
    [prefix]
  );
  const next = (rows[0]?.maxNum || 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/**
 * POST /api/mortuary/cases
 */
router.post('/cases', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      patientId,
      sourceType = 'opd',
      sourceRefId,
      deathAt,
      placeOfDeath,
      causeOfDeath,
      storageBay,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelationship,
      policeCaseNumber,
      postmortemRequired = false,
      notes,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required' });
    }

    const userId = req.user?.id || req.user?.userId || null;
    const caseNumber = await nextCaseNumber(connection);

    const [result] = await connection.execute(
      `INSERT INTO mortuary_cases
       (caseNumber, patientId, sourceType, sourceRefId, deathAt, placeOfDeath, causeOfDeath,
        storageBay, nextOfKinName, nextOfKinPhone, nextOfKinRelationship, policeCaseNumber,
        postmortemRequired, status, notes, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)`,
      [
        caseNumber,
        patientId,
        sourceType,
        sourceRefId || null,
        deathAt || null,
        placeOfDeath || null,
        causeOfDeath || null,
        storageBay || null,
        nextOfKinName || null,
        nextOfKinPhone || null,
        nextOfKinRelationship || null,
        policeCaseNumber || null,
        postmortemRequired ? 1 : 0,
        notes || null,
        userId,
      ]
    );

    // If linked emergency encounter, mark deceased
    if (sourceType === 'emergency' && sourceRefId) {
      try {
        await connection.execute(
          `UPDATE emergency_encounters SET status = 'deceased', updatedAt = NOW() WHERE encounterId = ?`,
          [sourceRefId]
        );
      } catch {
        /* table may not exist yet on older DBs */
      }
    }

    const [rows] = await connection.execute(
      `SELECT m.*, p.patientNumber, p.firstName, p.lastName
       FROM mortuary_cases m
       JOIN patients p ON p.patientId = m.patientId
       WHERE m.caseId = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Create mortuary case:', error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/mortuary/cases
 */
router.get('/cases', async (req, res) => {
  try {
    const { status, search, limit = 50 } = req.query;
    const lim = Math.min(Number(limit) || 50, 200);
    const params = [];
    let sql = `
      SELECT m.*, p.patientNumber, p.firstName, p.lastName, p.gender
      FROM mortuary_cases m
      JOIN patients p ON p.patientId = m.patientId
      WHERE 1=1`;
    if (status && status !== 'all') {
      sql += ` AND m.status = ?`;
      params.push(status);
    }
    if (search) {
      const term = `%${search}%`;
      sql += ` AND (m.caseNumber LIKE ? OR p.patientNumber LIKE ? OR p.firstName LIKE ? OR p.lastName LIKE ?)`;
      params.push(term, term, term, term);
    }
    sql += ` ORDER BY COALESCE(m.deathAt, m.createdAt) DESC LIMIT ${lim}`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('List mortuary cases:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/mortuary/cases/:id
 */
router.get('/cases/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT m.*, p.patientNumber, p.firstName, p.lastName, p.gender, p.dateOfBirth
       FROM mortuary_cases m
       JOIN patients p ON p.patientId = m.patientId
       WHERE m.caseId = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Case not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/mortuary/cases/:id
 */
router.put('/cases/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      storageBay,
      status,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelationship,
      policeCaseNumber,
      postmortemRequired,
      causeOfDeath,
      placeOfDeath,
      deathAt,
      releasedAt,
      releasedTo,
      releaseNotes,
      notes,
    } = req.body;

    const [existing] = await pool.execute(`SELECT caseId FROM mortuary_cases WHERE caseId = ?`, [id]);
    if (!existing.length) return res.status(404).json({ message: 'Case not found' });

    await pool.execute(
      `UPDATE mortuary_cases SET
         storageBay = COALESCE(?, storageBay),
         status = COALESCE(?, status),
         nextOfKinName = COALESCE(?, nextOfKinName),
         nextOfKinPhone = COALESCE(?, nextOfKinPhone),
         nextOfKinRelationship = COALESCE(?, nextOfKinRelationship),
         policeCaseNumber = COALESCE(?, policeCaseNumber),
         postmortemRequired = COALESCE(?, postmortemRequired),
         causeOfDeath = COALESCE(?, causeOfDeath),
         placeOfDeath = COALESCE(?, placeOfDeath),
         deathAt = COALESCE(?, deathAt),
         releasedAt = COALESCE(?, releasedAt),
         releasedTo = COALESCE(?, releasedTo),
         releaseNotes = COALESCE(?, releaseNotes),
         notes = COALESCE(?, notes),
         updatedAt = NOW()
       WHERE caseId = ?`,
      [
        storageBay ?? null,
        status ?? null,
        nextOfKinName ?? null,
        nextOfKinPhone ?? null,
        nextOfKinRelationship ?? null,
        policeCaseNumber ?? null,
        postmortemRequired === undefined ? null : postmortemRequired ? 1 : 0,
        causeOfDeath ?? null,
        placeOfDeath ?? null,
        deathAt ?? null,
        releasedAt ?? null,
        releasedTo ?? null,
        releaseNotes ?? null,
        notes ?? null,
        id,
      ]
    );

    const [rows] = await pool.execute(
      `SELECT m.*, p.patientNumber, p.firstName, p.lastName
       FROM mortuary_cases m JOIN patients p ON p.patientId = m.patientId
       WHERE m.caseId = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
