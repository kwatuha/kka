const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { resolveFacilityScope } = require('../lib/branchContext');

/**
 * @route GET /api/service-points
 * @description List service points (registration desks, triage bays, etc.)
 */
router.get('/', async (req, res) => {
  try {
    const { branchId, pointType, search, isActive } = req.query;
    let query = `
      SELECT sp.*, b.branchName, b.branchCode, b.isMainBranch,
             ds.storeName AS linkedStoreName, l.labName AS linkedLabName
      FROM service_points sp
      LEFT JOIN branches b ON sp.branchId = b.branchId
      LEFT JOIN drug_stores ds ON sp.linkedStoreId = ds.storeId
      LEFT JOIN laboratories l ON sp.linkedLabId = l.labId
      WHERE 1=1
    `;
    const params = [];

    if (branchId) {
      query += ' AND sp.branchId = ?';
      params.push(branchId);
    }
    if (pointType) {
      query += ' AND sp.pointType = ?';
      params.push(pointType);
    }
    if (isActive === 'true' || isActive === '1') {
      query += ' AND sp.isActive = 1';
    } else if (isActive === 'false' || isActive === '0') {
      query += ' AND sp.isActive = 0';
    } else if (isActive !== 'all') {
      query += ' AND sp.isActive = 1';
    }
    if (search) {
      query += ' AND (sp.pointName LIKE ? OR sp.pointCode LIKE ? OR sp.location LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY b.branchName ASC, sp.pointType ASC, sp.isDefault DESC, sp.pointName ASC';
    const [rows] = await pool.execute(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching service points:', error);
    res.status(500).json({ message: 'Error fetching service points', error: error.message });
  }
});

/**
 * @route GET /api/service-points/assignments/me
 * @description Current user's service point assignments for active branch
 */
router.get('/assignments/me', async (req, res) => {
  try {
    const scope = await resolveFacilityScope(pool, req);
    const { getUserServicePointContext } = require('../lib/queueService');
    const context = await getUserServicePointContext(
      pool,
      scope.userId,
      scope.currentBranchId,
    );
    res.status(200).json(context);
  } catch (error) {
    console.error('Error fetching service point assignments:', error);
    res.status(500).json({ message: 'Error fetching assignments', error: error.message });
  }
});

/**
 * @route GET /api/service-points/assignments/user/:userId
 * @description List active service point assignments for a user (admin)
 */
router.get('/assignments/user/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const [rows] = await pool.execute(
      `SELECT usa.assignmentId, usa.userId, usa.servicePointId, usa.isDefault, usa.isActive,
              sp.pointName, sp.pointCode, sp.pointType, sp.branchId, sp.location,
              b.branchName, b.branchCode
       FROM user_service_point_assignments usa
       INNER JOIN service_points sp ON sp.servicePointId = usa.servicePointId
       LEFT JOIN branches b ON b.branchId = sp.branchId
       WHERE usa.userId = ? AND usa.isActive = 1 AND sp.isActive = 1
       ORDER BY sp.pointType ASC, sp.pointName ASC`,
      [userId],
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching user service point assignments:', error);
    res.status(500).json({ message: 'Error fetching user assignments', error: error.message });
  }
});

/**
 * @route POST /api/service-points/assignments/assign
 * @description Replace a user's service point assignments
 * Body: { userId, servicePointIds: number[], defaultServicePointId?: number }
 */
router.post('/assignments/assign', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = Number(req.body?.userId);
    const servicePointIds = Array.isArray(req.body?.servicePointIds)
      ? req.body.servicePointIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
      : [];
    const defaultServicePointId = Number(req.body?.defaultServicePointId) || null;

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const [users] = await connection.execute(
      'SELECT userId FROM users WHERE userId = ? AND voided = 0 LIMIT 1',
      [userId],
    );
    if (!users.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (defaultServicePointId && !servicePointIds.includes(defaultServicePointId)) {
      return res.status(400).json({
        message: 'defaultServicePointId must be included in servicePointIds',
      });
    }

    if (servicePointIds.length) {
      const placeholders = servicePointIds.map(() => '?').join(',');
      const [points] = await connection.execute(
        `SELECT servicePointId FROM service_points
         WHERE servicePointId IN (${placeholders}) AND isActive = 1`,
        servicePointIds,
      );
      if (points.length !== servicePointIds.length) {
        return res.status(400).json({ message: 'One or more service points are invalid or inactive' });
      }
    }

    await connection.beginTransaction();

    if (servicePointIds.length === 0) {
      await connection.execute(
        'UPDATE user_service_point_assignments SET isActive = 0, isDefault = 0, updatedAt = NOW() WHERE userId = ?',
        [userId],
      );
    } else {
      const placeholders = servicePointIds.map(() => '?').join(',');
      await connection.execute(
        `UPDATE user_service_point_assignments
         SET isActive = 0, isDefault = 0, updatedAt = NOW()
         WHERE userId = ? AND servicePointId NOT IN (${placeholders})`,
        [userId, ...servicePointIds],
      );

      for (const servicePointId of servicePointIds) {
        const isDefault = defaultServicePointId
          ? servicePointId === defaultServicePointId
          : servicePointIds[0] === servicePointId;
        await connection.execute(
          `INSERT INTO user_service_point_assignments (userId, servicePointId, isDefault, isActive)
           VALUES (?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE isDefault = VALUES(isDefault), isActive = 1, updatedAt = NOW()`,
          [userId, servicePointId, isDefault ? 1 : 0],
        );
      }

      if (defaultServicePointId) {
        await connection.execute(
          'UPDATE user_service_point_assignments SET isDefault = 0, updatedAt = NOW() WHERE userId = ?',
          [userId],
        );
        await connection.execute(
          `UPDATE user_service_point_assignments
           SET isDefault = 1, updatedAt = NOW()
           WHERE userId = ? AND servicePointId = ?`,
          [userId, defaultServicePointId],
        );
      }
    }

    await connection.commit();

    const [rows] = await connection.execute(
      `SELECT usa.assignmentId, usa.userId, usa.servicePointId, usa.isDefault,
              sp.pointName, sp.pointCode, sp.pointType, sp.branchId, b.branchName
       FROM user_service_point_assignments usa
       INNER JOIN service_points sp ON sp.servicePointId = usa.servicePointId
       LEFT JOIN branches b ON b.branchId = sp.branchId
       WHERE usa.userId = ? AND usa.isActive = 1 AND sp.isActive = 1
       ORDER BY sp.pointType ASC, sp.pointName ASC`,
      [userId],
    );

    res.status(200).json({ success: true, assignments: rows });
  } catch (error) {
    await connection.rollback();
    console.error('Error assigning service points:', error);
    res.status(500).json({ message: 'Error assigning service points', error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT sp.*, b.branchName, b.branchCode
       FROM service_points sp
       LEFT JOIN branches b ON sp.branchId = b.branchId
       WHERE sp.servicePointId = ?`,
      [req.params.id],
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Service point not found' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching service point:', error);
    res.status(500).json({ message: 'Error fetching service point', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      pointCode,
      pointName,
      branchId,
      pointType,
      isDefault = false,
      linkedStoreId = null,
      linkedLabId = null,
      location = null,
      notes = null,
    } = req.body;

    if (!pointCode || !pointName || !branchId || !pointType) {
      return res.status(400).json({ message: 'pointCode, pointName, branchId, and pointType are required' });
    }

    if (isDefault) {
      await pool.execute(
        'UPDATE service_points SET isDefault = 0 WHERE branchId = ? AND pointType = ?',
        [branchId, pointType],
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO service_points
        (pointCode, pointName, branchId, pointType, isDefault, linkedStoreId, linkedLabId, location, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pointCode,
        pointName,
        branchId,
        pointType,
        isDefault ? 1 : 0,
        linkedStoreId || null,
        linkedLabId || null,
        location,
        notes,
      ],
    );

    const [created] = await pool.execute(
      `SELECT sp.*, b.branchName FROM service_points sp
       LEFT JOIN branches b ON sp.branchId = b.branchId
       WHERE sp.servicePointId = ?`,
      [result.insertId],
    );
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating service point:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Service point code already exists' });
    }
    res.status(500).json({ message: 'Error creating service point', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pointCode,
      pointName,
      branchId,
      pointType,
      isDefault,
      linkedStoreId,
      linkedLabId,
      location,
      notes,
      isActive,
    } = req.body;

    const [existing] = await pool.execute(
      'SELECT * FROM service_points WHERE servicePointId = ?',
      [id],
    );
    if (!existing.length) {
      return res.status(404).json({ message: 'Service point not found' });
    }

    const row = existing[0];
    const nextBranchId = branchId ?? row.branchId;
    const nextPointType = pointType ?? row.pointType;

    if (isDefault === true) {
      await pool.execute(
        'UPDATE service_points SET isDefault = 0 WHERE branchId = ? AND pointType = ? AND servicePointId <> ?',
        [nextBranchId, nextPointType, id],
      );
    }

    await pool.execute(
      `UPDATE service_points SET
        pointCode = COALESCE(?, pointCode),
        pointName = COALESCE(?, pointName),
        branchId = COALESCE(?, branchId),
        pointType = COALESCE(?, pointType),
        isDefault = COALESCE(?, isDefault),
        linkedStoreId = ?,
        linkedLabId = ?,
        location = COALESCE(?, location),
        notes = COALESCE(?, notes),
        isActive = COALESCE(?, isActive),
        updatedAt = NOW()
       WHERE servicePointId = ?`,
      [
        pointCode ?? null,
        pointName ?? null,
        branchId ?? null,
        pointType ?? null,
        isDefault === undefined ? null : (isDefault ? 1 : 0),
        linkedStoreId !== undefined ? linkedStoreId : row.linkedStoreId,
        linkedLabId !== undefined ? linkedLabId : row.linkedLabId,
        location ?? null,
        notes ?? null,
        isActive === undefined ? null : (isActive ? 1 : 0),
        id,
      ],
    );

    const [updated] = await pool.execute(
      `SELECT sp.*, b.branchName FROM service_points sp
       LEFT JOIN branches b ON sp.branchId = b.branchId
       WHERE sp.servicePointId = ?`,
      [id],
    );
    res.status(200).json(updated[0]);
  } catch (error) {
    console.error('Error updating service point:', error);
    res.status(500).json({ message: 'Error updating service point', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [activeQueues] = await pool.execute(
      `SELECT COUNT(*) AS activeCount FROM queue_entries
       WHERE servicePointId = ? AND status NOT IN ('completed', 'cancelled')`,
      [id],
    );
    if (activeQueues[0]?.activeCount > 0) {
      return res.status(400).json({
        message: 'Cannot deactivate service point with active queue entries',
        activeCount: activeQueues[0].activeCount,
      });
    }

    const [result] = await pool.execute(
      'UPDATE service_points SET isActive = 0, updatedAt = NOW() WHERE servicePointId = ?',
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service point not found' });
    }
    res.status(200).json({ message: 'Service point deactivated' });
  } catch (error) {
    console.error('Error deactivating service point:', error);
    res.status(500).json({ message: 'Error deactivating service point', error: error.message });
  }
});

module.exports = router;
