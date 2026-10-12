const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function padSeq(n) {
  return String(n).padStart(5, '0');
}

async function nextNationalDonorId(conn) {
  const year = new Date().getFullYear();
  const prefix = `KEN-ND-${year}-`;
  const [rows] = await conn.execute(
    `SELECT nationalDonorId FROM nbtms_donors WHERE nationalDonorId LIKE ? ORDER BY donorId DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (rows.length) {
    const tail = String(rows[0].nationalDonorId).slice(prefix.length);
    const parsed = parseInt(tail, 10);
    if (!Number.isNaN(parsed)) seq = parsed + 1;
  }
  return `${prefix}${padSeq(seq)}`;
}

async function nextUnitCode(conn) {
  const prefix = `UNIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-`;
  const [rows] = await conn.execute(
    `SELECT unitCode FROM nbtms_blood_units WHERE unitCode LIKE ? ORDER BY unitId DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (rows.length) {
    const tail = String(rows[0].unitCode).slice(prefix.length);
    const parsed = parseInt(tail, 10);
    if (!Number.isNaN(parsed)) seq = parsed + 1;
  }
  return `${prefix}${padSeq(seq)}`;
}

async function donorHasActiveDeferral(conn, donorId) {
  const [rows] = await conn.execute(
    `SELECT deferralId FROM nbtms_donor_deferrals
     WHERE donorId = ?
       AND effectiveFrom <= CURDATE()
       AND (effectiveUntil IS NULL OR effectiveUntil >= CURDATE())
     LIMIT 1`,
    [donorId]
  );
  return rows.length > 0;
}

router.get('/donors', async (req, res) => {
  try {
    const { search, limit = '50' } = req.query;
    let sql = `SELECT d.*,
      (SELECT COUNT(*) FROM nbtms_donations dn WHERE dn.donorId = d.donorId) AS donationCount
      FROM nbtms_donors d WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ` AND (d.nationalDonorId LIKE ? OR d.firstName LIKE ? OR d.lastName LIKE ? OR d.phone LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    sql += ` ORDER BY d.updatedAt DESC LIMIT ?`;
    params.push(Math.min(parseInt(limit, 10) || 50, 200));
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('nbtms donors list', err);
    res.status(500).json({ message: 'Error listing donors', error: err.message });
  }
});

router.get('/donors/:id', async (req, res) => {
  try {
    const [donors] = await pool.execute(`SELECT * FROM nbtms_donors WHERE donorId = ?`, [req.params.id]);
    if (!donors.length) return res.status(404).json({ message: 'Donor not found' });
    const [donations] = await pool.execute(
      `SELECT * FROM nbtms_donations WHERE donorId = ? ORDER BY donationDate DESC LIMIT 20`,
      [req.params.id]
    );
    const [deferrals] = await pool.execute(
      `SELECT * FROM nbtms_donor_deferrals WHERE donorId = ? ORDER BY effectiveFrom DESC`,
      [req.params.id]
    );
    res.json({ ...donors[0], donations, deferrals });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching donor', error: err.message });
  }
});

router.post('/donors', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      phone,
      email,
      bloodGroup,
      consentContact,
      homeBranchId,
      notes,
    } = req.body || {};
    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'firstName and lastName are required' });
    }
    await conn.beginTransaction();
    const nationalDonorId = await nextNationalDonorId(conn);
    const [result] = await conn.execute(
      `INSERT INTO nbtms_donors
        (nationalDonorId, firstName, lastName, gender, dateOfBirth, phone, email, bloodGroup, consentContact, homeBranchId, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nationalDonorId,
        firstName,
        lastName,
        gender || 'Unknown',
        dateOfBirth || null,
        phone || null,
        email || null,
        bloodGroup || null,
        consentContact === false || consentContact === 0 ? 0 : 1,
        homeBranchId || null,
        notes || null,
      ]
    );
    await conn.commit();
    res.status(201).json({ donorId: result.insertId, nationalDonorId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error creating donor', error: err.message });
  } finally {
    conn.release();
  }
});

router.get('/deferrals', async (req, res) => {
  try {
    const { active } = req.query;
    let sql = `SELECT df.*, d.nationalDonorId, d.firstName, d.lastName
               FROM nbtms_donor_deferrals df
               INNER JOIN nbtms_donors d ON d.donorId = df.donorId WHERE 1=1`;
    if (active === '1' || active === 'true') {
      sql += ` AND df.effectiveFrom <= CURDATE() AND (df.effectiveUntil IS NULL OR df.effectiveUntil >= CURDATE())`;
    }
    sql += ` ORDER BY df.effectiveFrom DESC LIMIT 100`;
    const [rows] = await pool.execute(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error listing deferrals', error: err.message });
  }
});

router.post('/deferrals', async (req, res) => {
  try {
    const { donorId, deferralType, reasonCode, reasonText, effectiveFrom, effectiveUntil } = req.body || {};
    if (!donorId || !reasonCode || !effectiveFrom) {
      return res.status(400).json({ message: 'donorId, reasonCode, and effectiveFrom are required' });
    }
    const [result] = await pool.execute(
      `INSERT INTO nbtms_donor_deferrals
        (donorId, deferralType, reasonCode, reasonText, effectiveFrom, effectiveUntil, createdByUserId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        donorId,
        deferralType || 'temporary',
        reasonCode,
        reasonText || null,
        effectiveFrom,
        effectiveUntil || null,
        req.user?.userId || null,
      ]
    );
    res.status(201).json({ deferralId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error creating deferral', error: err.message });
  }
});

router.get('/donations', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT dn.*, d.nationalDonorId, d.firstName, d.lastName, b.branchName AS collectionBranchName
       FROM nbtms_donations dn
       INNER JOIN nbtms_donors d ON d.donorId = dn.donorId
       INNER JOIN branches b ON b.branchId = dn.collectionBranchId
       ORDER BY dn.donationDate DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error listing donations', error: err.message });
  }
});

router.post('/donations', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      donorId,
      collectionBranchId,
      collectionType,
      mobileDriveName,
      donationDate,
      volumeMl,
      screeningPassed,
      screeningNotes,
      createUnit,
      bloodGroup,
      componentType,
      expiryAt,
    } = req.body || {};
    if (!donorId || !collectionBranchId) {
      return res.status(400).json({ message: 'donorId and collectionBranchId are required' });
    }
    if (await donorHasActiveDeferral(conn, donorId)) {
      return res.status(409).json({ message: 'Donor has an active deferral' });
    }
    await conn.beginTransaction();
    const [ins] = await conn.execute(
      `INSERT INTO nbtms_donations
        (donorId, collectionBranchId, collectionType, mobileDriveName, donationDate, volumeMl, screeningPassed, screeningNotes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        donorId,
        collectionBranchId,
        collectionType || 'fixed_centre',
        mobileDriveName || null,
        donationDate || new Date(),
        volumeMl || null,
        screeningPassed == null ? null : screeningPassed ? 1 : 0,
        screeningNotes || null,
        screeningPassed ? 'collected' : 'registered',
      ]
    );
    const donationId = ins.insertId;
    let unit = null;
    if (createUnit && bloodGroup && componentType && expiryAt) {
      const unitCode = await nextUnitCode(conn);
      const [uins] = await conn.execute(
        `INSERT INTO nbtms_blood_units
          (unitCode, donationId, bloodGroup, componentType, volumeMl, facilityBranchId, collectedAt, expiryAt, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'quarantine')`,
        [
          unitCode,
          donationId,
          bloodGroup,
          componentType,
          volumeMl || null,
          collectionBranchId,
          donationDate || new Date(),
          expiryAt,
        ]
      );
      unit = { unitId: uins.insertId, unitCode };
    }
    await conn.commit();
    res.status(201).json({ donationId, unit });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error recording donation', error: err.message });
  } finally {
    conn.release();
  }
});

router.get('/units', async (req, res) => {
  try {
    const { status, bloodGroup, componentType, branchId } = req.query;
    let sql = `SELECT u.*, b.branchName FROM nbtms_blood_units u
               INNER JOIN branches b ON b.branchId = u.facilityBranchId WHERE 1=1`;
    const params = [];
    if (status) {
      sql += ` AND u.status = ?`;
      params.push(status);
    }
    if (bloodGroup) {
      sql += ` AND u.bloodGroup = ?`;
      params.push(bloodGroup);
    }
    if (componentType) {
      sql += ` AND u.componentType = ?`;
      params.push(componentType);
    }
    if (branchId) {
      sql += ` AND u.facilityBranchId = ?`;
      params.push(branchId);
    }
    sql += ` ORDER BY u.expiryAt ASC LIMIT 200`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error listing units', error: err.message });
  }
});

router.get('/stock/summary', async (req, res) => {
  try {
    const [byGroup] = await pool.execute(
      `SELECT bloodGroup, componentType, facilityBranchId,
              SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS availableUnits,
              SUM(CASE WHEN status = 'available' AND expiryAt <= DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS expiringIn7Days
       FROM nbtms_blood_units
       GROUP BY bloodGroup, componentType, facilityBranchId`
    );
    const [totals] = await pool.execute(
      `SELECT
         SUM(status = 'available') AS availableUnits,
         SUM(status = 'quarantine') AS quarantineUnits,
         SUM(status = 'reserved') AS reservedUnits,
         SUM(status = 'expired') AS expiredUnits
       FROM nbtms_blood_units`
    );
    res.json({ totals: totals[0], byGroup });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stock summary', error: err.message });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, p.firstName AS patientFirstName, p.lastName AS patientLastName,
              rb.branchName AS requestingBranchName
       FROM nbtms_blood_requests r
       LEFT JOIN patients p ON p.patientId = r.patientId
       INNER JOIN branches rb ON rb.branchId = r.requestingBranchId
       ORDER BY r.requestedAt DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error listing requests', error: err.message });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const {
      patientId,
      requestingBranchId,
      urgency,
      bloodGroup,
      componentType,
      unitsRequested,
      clinicalIndication,
    } = req.body || {};
    if (!requestingBranchId || !bloodGroup || !componentType) {
      return res.status(400).json({ message: 'requestingBranchId, bloodGroup, and componentType are required' });
    }
    const [result] = await pool.execute(
      `INSERT INTO nbtms_blood_requests
        (patientId, requestingBranchId, urgency, bloodGroup, componentType, unitsRequested, clinicalIndication, createdByUserId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId || null,
        requestingBranchId,
        urgency || 'routine',
        bloodGroup,
        componentType,
        unitsRequested || 1,
        clinicalIndication || null,
        req.user?.userId || null,
      ]
    );
    res.status(201).json({ requestId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error creating blood request', error: err.message });
  }
});

router.post('/requests/:id/cross-match', async (req, res) => {
  try {
    const { unitId, result, notes } = req.body || {};
    if (!unitId) return res.status(400).json({ message: 'unitId is required' });
    await pool.execute(
      `INSERT INTO nbtms_cross_matches (requestId, unitId, result, performedAt, performedByUserId, notes)
       VALUES (?, ?, ?, NOW(), ?, ?)
       ON DUPLICATE KEY UPDATE result = VALUES(result), performedAt = NOW(), notes = VALUES(notes)`,
      [req.params.id, unitId, result || 'pending', req.user?.userId || null, notes || null]
    );
    if (result === 'compatible') {
      await pool.execute(`UPDATE nbtms_blood_units SET status = 'reserved' WHERE unitId = ? AND status = 'available'`, [
        unitId,
      ]);
      await pool.execute(`UPDATE nbtms_blood_requests SET status = 'crossmatched' WHERE requestId = ?`, [req.params.id]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Error recording cross-match', error: err.message });
  }
});

router.post('/requests/:id/issue', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { unitId } = req.body || {};
    if (!unitId) return res.status(400).json({ message: 'unitId is required' });
    await conn.beginTransaction();
    const [xm] = await conn.execute(
      `SELECT result FROM nbtms_cross_matches WHERE requestId = ? AND unitId = ?`,
      [req.params.id, unitId]
    );
    if (!xm.length || xm[0].result !== 'compatible') {
      await conn.rollback();
      return res.status(409).json({ message: 'Unit is not cross-matched as compatible for this request' });
    }
    await conn.execute(
      `INSERT INTO nbtms_unit_issues (requestId, unitId, issuedByUserId) VALUES (?, ?, ?)`,
      [req.params.id, unitId, req.user?.userId || null]
    );
    await conn.execute(`UPDATE nbtms_blood_units SET status = 'issued' WHERE unitId = ?`, [unitId]);
    await conn.execute(`UPDATE nbtms_blood_requests SET status = 'issued', fulfillingBranchId = (
      SELECT facilityBranchId FROM nbtms_blood_units WHERE unitId = ?
    ) WHERE requestId = ?`, [unitId, req.params.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error issuing unit', error: err.message });
  } finally {
    conn.release();
  }
});

router.get('/hemovigilance', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM nbtms_hemovigilance_events ORDER BY reportedAt DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error listing hemovigilance events', error: err.message });
  }
});

router.post('/hemovigilance', async (req, res) => {
  try {
    const { eventType, donorId, patientId, unitId, severity, description, outcome } = req.body || {};
    if (!eventType || !severity || !description) {
      return res.status(400).json({ message: 'eventType, severity, and description are required' });
    }
    const [result] = await pool.execute(
      `INSERT INTO nbtms_hemovigilance_events
        (eventType, donorId, patientId, unitId, severity, description, outcome, reportedByUserId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventType,
        donorId || null,
        patientId || null,
        unitId || null,
        severity,
        description,
        outcome || null,
        req.user?.userId || null,
      ]
    );
    res.status(201).json({ eventId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error recording hemovigilance event', error: err.message });
  }
});

router.get('/traceability/unit/:unitCode', async (req, res) => {
  try {
    const [units] = await pool.execute(
      `SELECT u.*, dn.donationId, d.nationalDonorId, d.firstName, d.lastName
       FROM nbtms_blood_units u
       LEFT JOIN nbtms_donations dn ON dn.donationId = u.donationId
       LEFT JOIN nbtms_donors d ON d.donorId = dn.donorId
       WHERE u.unitCode = ?`,
      [req.params.unitCode]
    );
    if (!units.length) return res.status(404).json({ message: 'Unit not found' });
    const unit = units[0];
    const [issues] = await pool.execute(
      `SELECT i.*, r.patientId FROM nbtms_unit_issues i
       INNER JOIN nbtms_blood_requests r ON r.requestId = i.requestId
       WHERE i.unitId = ?`,
      [unit.unitId]
    );
    res.json({ unit, issues });
  } catch (err) {
    res.status(500).json({ message: 'Error tracing unit', error: err.message });
  }
});

router.get('/traceability/donation/:donationId', async (req, res) => {
  try {
    const [units] = await pool.execute(`SELECT * FROM nbtms_blood_units WHERE donationId = ?`, [req.params.donationId]);
    const recipients = [];
    for (const u of units) {
      const [issues] = await pool.execute(
        `SELECT r.patientId, p.firstName, p.lastName, i.issuedAt, i.transfusedAt
         FROM nbtms_unit_issues i
         INNER JOIN nbtms_blood_requests r ON r.requestId = i.requestId
         LEFT JOIN patients p ON p.patientId = r.patientId
         WHERE i.unitId = ?`,
        [u.unitId]
      );
      recipients.push(...issues);
    }
    res.json({ donationId: req.params.donationId, units, recipients });
  } catch (err) {
    res.status(500).json({ message: 'Error tracing donation', error: err.message });
  }
});

module.exports = router;
