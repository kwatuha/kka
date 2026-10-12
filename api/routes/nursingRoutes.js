// Nursing routes - ward assignments and nurse drug pickup requests
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const pool = require('../config/db');

const { getJwtSecret } = require('../lib/jwtSecret');

/**
 * Get current user id from req.user (when auth middleware is on) or from JWT in Authorization header.
 * When auth is disabled, the frontend still sends the token; we decode it here so the nurse sees their own wards and pickups.
 * Fallback to 1 only when no token and no req.user (e.g. dev without login).
 */
function getUserId(req) {
  if (req.user?.id != null) return req.user.id;
  if (req.user?.userId != null) return req.user.userId;
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        const user = decoded?.user ?? decoded;
        const id = user?.id ?? user?.userId ?? null;
        if (id != null) return id;
      } catch (err) {
        // invalid or expired token
      }
    }
  }
  return 1;
}

/**
 * @route   GET /api/nursing/wards/assigned
 * @desc    Get wards assigned to current nurse
 * @access  Private
 */
router.get('/wards/assigned', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await pool.execute(
      `SELECT nwa.assignmentId, nwa.wardId, w.wardName, w.wardType, nwa.isActive
       FROM nurse_ward_assignments nwa
       INNER JOIN wards w ON w.wardId = nwa.wardId
       WHERE nwa.nurseUserId = ? AND nwa.isActive = 1
       ORDER BY w.wardName ASC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching assigned wards:', error);
    res.status(500).json({ error: 'Failed to fetch assigned wards' });
  }
});

/**
 * @route   GET /api/nursing/wards/nurse/:nurseUserId
 * @desc    Get wards assigned to a specific nurse (admin view)
 * @access  Private
 */
router.get('/wards/nurse/:nurseUserId', async (req, res) => {
  try {
    const { nurseUserId } = req.params;

    const [rows] = await pool.execute(
      `SELECT nwa.assignmentId, nwa.wardId, w.wardName, w.wardType, nwa.isActive
       FROM nurse_ward_assignments nwa
       INNER JOIN wards w ON w.wardId = nwa.wardId
       WHERE nwa.nurseUserId = ? AND nwa.isActive = 1
       ORDER BY w.wardName ASC`,
      [nurseUserId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching nurse assignments:', error);
    res.status(500).json({ error: 'Failed to fetch nurse assignments' });
  }
});

/**
 * @route   POST /api/nursing/wards/assign
 * @desc    Assign wards to a nurse (admin / supervisor operation)
 * @access  Private
 *
 * Body: { nurseUserId: number, wardIds: number[] }
 */
router.post('/wards/assign', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { nurseUserId, wardIds } = req.body || {};
    if (!nurseUserId || !Array.isArray(wardIds) || wardIds.length === 0) {
      return res.status(400).json({ error: 'nurseUserId and wardIds[] are required' });
    }

    await connection.beginTransaction();

    // Soft-deactivate existing assignments not in the incoming list
    await connection.execute(
      `UPDATE nurse_ward_assignments
       SET isActive = 0
       WHERE nurseUserId = ? AND wardId NOT IN (${wardIds.map(() => '?').join(',')})`,
      [nurseUserId, ...wardIds]
    );

    // Upsert each ward assignment as active
    for (const wardId of wardIds) {
      await connection.execute(
        `INSERT INTO nurse_ward_assignments (nurseUserId, wardId, isActive)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE isActive = 1`,
        [nurseUserId, wardId]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Error assigning wards:', error);
    res.status(500).json({ error: 'Failed to assign wards' });
  } finally {
    connection.release();
  }
});

const SHIFT_LABELS = { morning: '7:00 AM - 3:00 PM', evening: '3:00 PM - 11:00 PM', night: '11:00 PM - 7:00 AM' };

/**
 * @route   GET /api/nursing/nurses
 * @desc    List users with nurse-related roles (for assignment dropdowns)
 * @access  Private
 */
router.get('/nurses', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.userId, u.username, u.firstName, u.lastName, u.email, u.roleId, r.roleName
       FROM users u
       INNER JOIN roles r ON r.roleId = u.roleId
       WHERE u.voided = 0
       AND LOWER(r.roleName) LIKE '%nurse%'
       AND LOWER(r.roleName) NOT LIKE '%doctor%'
       ORDER BY u.firstName, u.lastName`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching nurses list:', error);
    res.status(500).json({ error: 'Failed to fetch nurses' });
  }
});

/**
 * @route   GET /api/nursing/shift-schedule
 * @desc    Get nursing staff grouped by shift (morning, evening, night) with ward assignments
 * @access  Private
 */
router.get('/shift-schedule', async (req, res) => {
  try {
    const [assignments] = await pool.execute(
      `SELECT nsa.nurseUserId, nsa.shiftType,
              u.firstName, u.lastName, u.username,
              r.roleName
       FROM nurse_shift_assignments nsa
       INNER JOIN users u ON u.userId = nsa.nurseUserId AND u.voided = 0
       LEFT JOIN roles r ON r.roleId = u.roleId
       ORDER BY nsa.shiftType, u.firstName, u.lastName`
    );

    const wardNamesByNurse = {};
    for (const row of assignments) {
      if (wardNamesByNurse[row.nurseUserId] != null) continue;
      const [wards] = await pool.execute(
        `SELECT w.wardName FROM nurse_ward_assignments nwa
         INNER JOIN wards w ON w.wardId = nwa.wardId
         WHERE nwa.nurseUserId = ? AND nwa.isActive = 1
         ORDER BY w.wardName`,
        [row.nurseUserId]
      );
      wardNamesByNurse[row.nurseUserId] = wards.map(w => w.wardName).join(', ') || '—';
    }

    const morning = [];
    const evening = [];
    const night = [];
    for (const row of assignments) {
      const item = {
        nurseUserId: row.nurseUserId,
        name: [row.firstName, row.lastName].filter(Boolean).join(' ') || row.username || 'Unknown',
        role: row.roleName || 'Nurse',
        username: row.username,
        initials: [row.firstName, row.lastName].filter(Boolean).map(n => (n || '').charAt(0)).join('').toUpperCase().slice(0, 2) || (row.username || '?').slice(0, 2).toUpperCase(),
        assignedWard: wardNamesByNurse[row.nurseUserId] || '—',
        shiftTime: SHIFT_LABELS[row.shiftType] || row.shiftType,
      };
      if (row.shiftType === 'morning') morning.push(item);
      else if (row.shiftType === 'evening') evening.push(item);
      else if (row.shiftType === 'night') night.push(item);
    }

    res.json({ morning, evening, night });
  } catch (error) {
    console.error('Error fetching shift schedule:', error);
    res.status(500).json({ error: 'Failed to fetch shift schedule' });
  }
});

/**
 * @route   POST /api/nursing/shift-schedule/assign
 * @desc    Assign a nurse to a shift (morning, evening, night). One shift per nurse.
 * @access  Private
 * Body: { nurseUserId: number, shiftType: 'morning' | 'evening' | 'night' }
 */
router.post('/shift-schedule/assign', async (req, res) => {
  try {
    const { nurseUserId, shiftType } = req.body || {};
    if (!nurseUserId || !['morning', 'evening', 'night'].includes(shiftType)) {
      return res.status(400).json({ error: 'nurseUserId and shiftType (morning|evening|night) are required' });
    }

    await pool.execute(
      `INSERT INTO nurse_shift_assignments (nurseUserId, shiftType)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE shiftType = ?, updatedAt = NOW()`,
      [nurseUserId, shiftType, shiftType]
    );
    res.json({ success: true, nurseUserId, shiftType });
  } catch (error) {
    console.error('Error assigning shift:', error);
    res.status(500).json({ error: 'Failed to assign shift' });
  }
});

/**
 * @route   GET /api/nursing/pickup-requests/ready
 * @desc    Get admitted patients in nurse's wards with PENDING prescription items (ready to request pickup)
 * @access  Private
 */
router.get('/pickup-requests/ready', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Determine nurse's wards
    const [wardRows] = await pool.execute(
      `SELECT wardId FROM nurse_ward_assignments WHERE nurseUserId = ? AND isActive = 1`,
      [userId]
    );
    const wardIds = wardRows.map(r => r.wardId);
    if (wardIds.length === 0) return res.json([]);

    const placeholders = wardIds.map(() => '?').join(',');

    // Admitted patients in those wards with pending prescription items and not already requested
    const [rows] = await pool.execute(
      `SELECT
          a.admissionId,
          a.admissionNumber,
          a.status as admissionStatus,
          pt.patientId,
          pt.patientNumber,
          pt.firstName as patientFirstName,
          pt.lastName as patientLastName,
          w.wardId,
          w.wardName,
          b.bedNumber,
          pr.prescriptionId,
          pr.prescriptionNumber,
          pr.prescriptionDate,
          pr.status as prescriptionStatus,
          pi.itemId as prescriptionItemId,
          pi.medicationName,
          pi.dosage,
          pi.frequency,
          pi.duration,
          pi.quantity,
          pi.status as itemStatus
       FROM admissions a
       INNER JOIN patients pt ON pt.patientId = a.patientId
       LEFT JOIN beds b ON b.bedId = a.bedId
       LEFT JOIN wards w ON w.wardId = b.wardId
       INNER JOIN prescriptions pr ON pr.patientId = a.patientId
       INNER JOIN prescription_items pi ON pi.prescriptionId = pr.prescriptionId
       WHERE a.status = 'admitted'
         AND w.wardId IN (${placeholders})
         AND pr.status = 'pending'
         AND pi.status = 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM nurse_pickups np
           WHERE np.prescriptionId = pr.prescriptionId
             AND np.admissionId = a.admissionId
             AND np.status IN ('pending','picked_up')
         )
       ORDER BY w.wardName, a.admissionDate DESC, pr.prescriptionDate DESC`,
      wardIds
    );

    // Group into prescriptions with items
    const map = new Map();
    for (const r of rows) {
      const key = `${r.admissionId}:${r.prescriptionId}`;
      if (!map.has(key)) {
        map.set(key, {
          admissionId: r.admissionId,
          admissionNumber: r.admissionNumber,
          wardId: r.wardId,
          wardName: r.wardName,
          bedNumber: r.bedNumber,
          patientId: r.patientId,
          patientNumber: r.patientNumber,
          patientFirstName: r.patientFirstName,
          patientLastName: r.patientLastName,
          prescriptionId: r.prescriptionId,
          prescriptionNumber: r.prescriptionNumber,
          prescriptionDate: r.prescriptionDate,
          items: []
        });
      }
      map.get(key).items.push({
        prescriptionItemId: r.prescriptionItemId,
        medicationName: r.medicationName,
        dosage: r.dosage,
        frequency: r.frequency,
        duration: r.duration,
        quantity: r.quantity,
        status: r.itemStatus
      });
    }

    res.json(Array.from(map.values()));
  } catch (error) {
    console.error('Error fetching pickup-ready prescriptions:', error);
    res.status(500).json({ error: 'Failed to fetch pickup-ready prescriptions' });
  }
});

/**
 * @route   GET /api/nursing/pickup-requests
 * @desc    Get current nurse's pickup request history (pending, picked_up, cancelled)
 * @access  Private
 */
router.get('/pickup-requests', async (req, res) => {
  try {
    const rawUserId = getUserId(req);
    const userId = rawUserId != null ? Number(rawUserId) : null;
    if (userId == null || isNaN(userId)) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await pool.execute(
      `SELECT
          np.pickupId,
          np.prescriptionId,
          np.patientId,
          np.admissionId,
          np.pickedUpBy,
          np.pickupDate,
          np.status,
          np.notes,
          np.createdAt,
          pr.prescriptionNumber,
          pr.prescriptionDate,
          pt.patientNumber,
          pt.firstName as patientFirstName,
          pt.lastName as patientLastName,
          a.admissionNumber,
          w.wardName,
          b.bedNumber
       FROM nurse_pickups np
       INNER JOIN prescriptions pr ON np.prescriptionId = pr.prescriptionId
       INNER JOIN patients pt ON np.patientId = pt.patientId
       LEFT JOIN admissions a ON np.admissionId = a.admissionId
       LEFT JOIN beds b ON a.bedId = b.bedId
       LEFT JOIN wards w ON b.wardId = w.wardId
       WHERE np.pickedUpBy = ?
       ORDER BY np.createdAt DESC`,
      [userId]
    );

    const list = await Promise.all(rows.map(async (r) => {
      try {
        const [items] = await pool.execute(
          `SELECT npi.pickupItemId, npi.prescriptionItemId, npi.quantityPickedUp, npi.notes,
                  pi.medicationName, pi.dosage, pi.frequency, pi.duration, pi.status as itemStatus
           FROM nurse_pickup_items npi
           INNER JOIN prescription_items pi ON pi.itemId = npi.prescriptionItemId
           WHERE npi.pickupId = ?`,
          [r.pickupId]
        );
        return { ...r, items: items || [] };
      } catch (err) {
        console.error('Error fetching items for pickup', r.pickupId, err);
        return { ...r, items: [] };
      }
    }));

    res.json(list);
  } catch (error) {
    console.error('Error fetching nurse pickup requests:', error);
    res.status(500).json({ error: 'Failed to fetch pickup requests' });
  }
});

/**
 * @route   POST /api/nursing/pickup-requests
 * @desc    Create a pickup request (status=pending) for a prescription (nurse-initiated)
 * @access  Private
 *
 * Body: { admissionId, prescriptionId, items: [{ prescriptionItemId, quantityRequested }], notes? }
 */
router.post('/pickup-requests', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { admissionId, prescriptionId, items, notes } = req.body || {};
    if (!admissionId || !prescriptionId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'admissionId, prescriptionId and items[] are required' });
    }

    await connection.beginTransaction();

    // Validate admission is admitted and in nurse ward assignment
    const [wardRows] = await connection.execute(
      `SELECT w.wardId
       FROM admissions a
       LEFT JOIN beds b ON b.bedId = a.bedId
       LEFT JOIN wards w ON w.wardId = b.wardId
       WHERE a.admissionId = ? AND a.status = 'admitted'`,
      [admissionId]
    );
    if (wardRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid admission or patient not admitted' });
    }
    const wardId = wardRows[0].wardId;
    const [assign] = await connection.execute(
      `SELECT 1 FROM nurse_ward_assignments WHERE nurseUserId = ? AND wardId = ? AND isActive = 1`,
      [userId, wardId]
    );
    if (assign.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: 'You are not assigned to this ward' });
    }

    // Get patientId for prescription
    const [presRows] = await connection.execute(
      `SELECT patientId FROM prescriptions WHERE prescriptionId = ?`,
      [prescriptionId]
    );
    if (presRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Prescription not found' });
    }
    const patientId = presRows[0].patientId;

    // Prevent duplicate pending requests
    const [existing] = await connection.execute(
      `SELECT pickupId FROM nurse_pickups
       WHERE prescriptionId = ? AND admissionId = ? AND status = 'pending'`,
      [prescriptionId, admissionId]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'A pending pickup request already exists for this prescription' });
    }

    const [pickupRes] = await connection.execute(
      `INSERT INTO nurse_pickups (prescriptionId, patientId, admissionId, pickedUpBy, pickupDate, status, notes)
       VALUES (?, ?, ?, ?, NOW(), 'pending', ?)`,
      [prescriptionId, patientId, admissionId, userId, notes || null]
    );
    const pickupId = pickupRes.insertId;

    for (const it of items) {
      const prescriptionItemId = it.prescriptionItemId;
      const qty = parseInt(it.quantityRequested ?? it.quantityPickedUp ?? it.quantity ?? 0, 10);
      if (!prescriptionItemId || !qty || qty <= 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Each item must have prescriptionItemId and a positive quantityRequested' });
      }

      // Validate item belongs to prescription and is still pending
      const [itemRows] = await connection.execute(
        `SELECT itemId FROM prescription_items WHERE itemId = ? AND prescriptionId = ? AND status = 'pending'`,
        [prescriptionItemId, prescriptionId]
      );
      if (itemRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: `Item ${prescriptionItemId} is not pending or does not belong to this prescription` });
      }

      await connection.execute(
        `INSERT INTO nurse_pickup_items (pickupId, prescriptionItemId, dispensationId, quantityPickedUp, notes)
         VALUES (?, ?, NULL, ?, NULL)`,
        [pickupId, prescriptionItemId, qty]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, pickupId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating pickup request:', error);
    res.status(500).json({ error: 'Failed to create pickup request' });
  } finally {
    connection.release();
  }
});

/**
 * @route   POST /api/nursing/pickup-requests/:id/cancel
 * @desc    Nurse cancels their own pickup request (only when status is pending or ready_for_pickup)
 * @access  Private
 */
router.post('/pickup-requests/:id/cancel', async (req, res) => {
  try {
    const rawUserId = getUserId(req);
    const userId = rawUserId != null ? Number(rawUserId) : null;
    if (userId == null || isNaN(userId)) return res.status(401).json({ error: 'Unauthorized' });

    const pickupId = req.params.id;
    const [rows] = await pool.execute(
      'SELECT pickupId, status, pickedUpBy FROM nurse_pickups WHERE pickupId = ?',
      [pickupId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Pickup request not found' });

    const pickup = rows[0];
    if (Number(pickup.pickedUpBy) !== userId) {
      return res.status(403).json({ error: 'You can only cancel your own pickup request' });
    }
    if (!['pending', 'ready_for_pickup'].includes(pickup.status)) {
      return res.status(400).json({ error: 'Only pending or ready-for-pickup requests can be cancelled by the nurse. Contact pharmacy to cancel a picked-up request.' });
    }

    await pool.execute(
      'UPDATE nurse_pickups SET status = ?, updatedAt = NOW() WHERE pickupId = ?',
      ['cancelled', pickupId]
    );
    res.status(200).json({ message: 'Pickup request cancelled', pickupId, status: 'cancelled' });
  } catch (error) {
    console.error('Error cancelling pickup request:', error);
    res.status(500).json({ error: 'Failed to cancel pickup request' });
  }
});

module.exports = router;

