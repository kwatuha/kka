// Asset management routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/assets
 * @description Get all assets with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { status, category, search } = req.query;

        let query = `
            SELECT *
            FROM assets
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (assetName LIKE ? OR assetCode LIKE ? OR serialNumber LIKE ? OR manufacturer LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY createdAt DESC, assetName ASC';

        const [rows] = await pool.execute(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({ message: 'Error fetching assets', error: error.message });
    }
});

/**
 * @route GET /api/assets/:id
 * @description Get a single asset by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            'SELECT * FROM assets WHERE assetId = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching asset:', error);
        res.status(500).json({ message: 'Error fetching asset', error: error.message });
    }
});

/**
 * @route POST /api/assets
 * @description Create a new asset
 */
router.post('/', async (req, res) => {
    try {
        const {
            assetCode,
            assetName,
            category,
            assetType,
            purchaseDate,
            purchaseCost,
            currentValue,
            depreciationMethod,
            depreciationRate,
            location,
            serialNumber,
            manufacturer,
            model,
            status = 'active',
            isCritical = false,
            notes
        } = req.body;

        if (!assetName || !purchaseCost) {
            return res.status(400).json({ error: 'Asset name and purchase cost are required' });
        }

        // Generate asset code if not provided
        let finalAssetCode = assetCode;
        if (!finalAssetCode) {
            const [count] = await pool.execute('SELECT COUNT(*) as count FROM assets');
            const assetNum = count[0].count + 1;
            finalAssetCode = `AST-${String(assetNum).padStart(6, '0')}`;
        } else {
            // Check if code already exists
            const [existing] = await pool.execute('SELECT assetId FROM assets WHERE assetCode = ?', [finalAssetCode]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Asset code already exists' });
            }
        }

        // Set currentValue to purchaseCost if not provided
        const finalCurrentValue = currentValue !== undefined ? currentValue : purchaseCost;
        const finalAccumulatedDepreciation = 0;

        const [result] = await pool.execute(
            `INSERT INTO assets (
                assetCode, assetName, category, assetType, purchaseDate, purchaseCost,
                currentValue, depreciationMethod, depreciationRate, accumulatedDepreciation,
                location, serialNumber, manufacturer, model, status, isCritical, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalAssetCode,
                assetName,
                category || null,
                assetType || null,
                purchaseDate || null,
                purchaseCost,
                finalCurrentValue,
                depreciationMethod || null,
                depreciationRate || null,
                finalAccumulatedDepreciation,
                location || null,
                serialNumber || null,
                manufacturer || null,
                model || null,
                status,
                isCritical ? 1 : 0,
                notes || null
            ]
        );

        const [newAsset] = await pool.execute(
            'SELECT * FROM assets WHERE assetId = ?',
            [result.insertId]
        );

        res.status(201).json(newAsset[0]);
    } catch (error) {
        console.error('Error creating asset:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Asset code already exists' });
        }
        res.status(500).json({ message: 'Error creating asset', error: error.message });
    }
});

/**
 * @route PUT /api/assets/:id
 * @description Update an asset
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            assetCode,
            assetName,
            category,
            assetType,
            purchaseDate,
            purchaseCost,
            currentValue,
            depreciationMethod,
            depreciationRate,
            accumulatedDepreciation,
            location,
            serialNumber,
            manufacturer,
            model,
            status,
            isCritical,
            disposedDate,
            disposedValue,
            notes
        } = req.body;

        // Check if asset exists
        const [existing] = await pool.execute('SELECT assetId FROM assets WHERE assetId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        // Check for duplicate asset code if it's being changed
        if (assetCode) {
            const [duplicate] = await pool.execute(
                'SELECT assetId FROM assets WHERE assetCode = ? AND assetId != ?',
                [assetCode, id]
            );
            if (duplicate.length > 0) {
                return res.status(400).json({ error: 'Asset code already exists' });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (assetCode !== undefined) { updates.push('assetCode = ?'); values.push(assetCode); }
        if (assetName !== undefined) { updates.push('assetName = ?'); values.push(assetName); }
        if (category !== undefined) { updates.push('category = ?'); values.push(category); }
        if (assetType !== undefined) { updates.push('assetType = ?'); values.push(assetType); }
        if (purchaseDate !== undefined) { updates.push('purchaseDate = ?'); values.push(purchaseDate); }
        if (purchaseCost !== undefined) { updates.push('purchaseCost = ?'); values.push(purchaseCost); }
        if (currentValue !== undefined) { updates.push('currentValue = ?'); values.push(currentValue); }
        if (depreciationMethod !== undefined) { updates.push('depreciationMethod = ?'); values.push(depreciationMethod); }
        if (depreciationRate !== undefined) { updates.push('depreciationRate = ?'); values.push(depreciationRate); }
        if (accumulatedDepreciation !== undefined) { updates.push('accumulatedDepreciation = ?'); values.push(accumulatedDepreciation); }
        if (location !== undefined) { updates.push('location = ?'); values.push(location); }
        if (serialNumber !== undefined) { updates.push('serialNumber = ?'); values.push(serialNumber); }
        if (manufacturer !== undefined) { updates.push('manufacturer = ?'); values.push(manufacturer); }
        if (model !== undefined) { updates.push('model = ?'); values.push(model); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (isCritical !== undefined) { updates.push('isCritical = ?'); values.push(isCritical ? 1 : 0); }
        if (disposedDate !== undefined) { updates.push('disposedDate = ?'); values.push(disposedDate); }
        if (disposedValue !== undefined) { updates.push('disposedValue = ?'); values.push(disposedValue); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE assets SET ${updates.join(', ')}, updatedAt = NOW() WHERE assetId = ?`,
            values
        );

        const [updated] = await pool.execute(
            'SELECT * FROM assets WHERE assetId = ?',
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating asset:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Asset code already exists' });
        }
        res.status(500).json({ message: 'Error updating asset', error: error.message });
    }
});

/**
 * @route DELETE /api/assets/:id
 * @description Delete an asset
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if asset exists
        const [existing] = await pool.execute('SELECT assetId FROM assets WHERE assetId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        await pool.execute('DELETE FROM assets WHERE assetId = ?', [id]);

        res.status(200).json({ message: 'Asset deleted successfully' });
    } catch (error) {
        console.error('Error deleting asset:', error);
        res.status(500).json({ message: 'Error deleting asset', error: error.message });
    }
});

/**
 * @route GET /api/assets/stats/summary
 * @description Get summary statistics for assets
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT
                COUNT(*) as totalAssets,
                SUM(purchaseCost) as totalPurchaseCost,
                SUM(currentValue) as totalCurrentValue,
                SUM(accumulatedDepreciation) as totalDepreciation,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as activeCount,
                COUNT(CASE WHEN status = 'disposed' THEN 1 END) as disposedCount,
                COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenanceCount,
                COUNT(CASE WHEN status = 'retired' THEN 1 END) as retiredCount
            FROM assets
        `);

        res.status(200).json(stats[0] || {
            totalAssets: 0,
            totalPurchaseCost: 0,
            totalCurrentValue: 0,
            totalDepreciation: 0,
            activeCount: 0,
            disposedCount: 0,
            maintenanceCount: 0,
            retiredCount: 0,
        });
    } catch (error) {
        console.error('Error fetching asset stats:', error);
        res.status(500).json({ message: 'Error fetching asset stats', error: error.message });
    }
});

/**
 * @route GET /api/assets/critical/list
 * @description Get all critical assets with today's verification status
 */
router.get('/critical/list', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT * FROM vw_critical_assets_today_status
            ORDER BY assetName
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching critical assets:', error);
        res.status(500).json({ message: 'Error fetching critical assets', error: error.message });
    }
});

/**
 * @route GET /api/assets/critical/verification-history
 * @description Get verification history for critical assets
 */
router.get('/critical/verification-history', async (req, res) => {
    try {
        const { assetId, startDate, endDate } = req.query;

        let query = `
            SELECT * FROM vw_critical_assets_verification_history
            WHERE 1=1
        `;
        const params = [];

        if (assetId) {
            query += ' AND assetId = ?';
            params.push(assetId);
        }

        if (startDate) {
            query += ' AND logDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND logDate <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY logDate DESC, assetName';

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching verification history:', error);
        res.status(500).json({ message: 'Error fetching verification history', error: error.message });
    }
});

/**
 * @route POST /api/assets/critical/daily-log
 * @description Create or update daily log entry for critical asset verification
 */
router.post('/critical/daily-log', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            assetId,
            logDate,
            isPresent,
            verifiedBy,
            notes,
            issues,
            location,
            condition = 'good'
        } = req.body;

        // Validate required fields
        if (!assetId || !logDate || verifiedBy === undefined) {
            await connection.rollback();
            return res.status(400).json({ error: 'Asset ID, log date, and verified by are required' });
        }

        // Check if asset is critical
        const [asset] = await connection.execute(
            'SELECT isCritical, status FROM assets WHERE assetId = ?',
            [assetId]
        );

        if (asset.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (!asset[0].isCritical) {
            await connection.rollback();
            return res.status(400).json({ error: 'Asset is not marked as critical' });
        }

        if (asset[0].status !== 'active') {
            await connection.rollback();
            return res.status(400).json({ error: 'Only active assets can be verified' });
        }

        // Check if log already exists for this date
        const [existing] = await connection.execute(
            'SELECT logId FROM critical_asset_daily_log WHERE assetId = ? AND logDate = ?',
            [assetId, logDate]
        );

        if (existing.length > 0) {
            // Update existing log
            await connection.execute(
                `UPDATE critical_asset_daily_log
                 SET isPresent = ?, verifiedBy = ?, notes = ?, issues = ?, location = ?, \`condition\` = ?, verifiedAt = NOW()
                 WHERE logId = ?`,
                [isPresent ? 1 : 0, verifiedBy, notes || null, issues || null, location || null, condition, existing[0].logId]
            );

            const [updated] = await connection.execute(
                'SELECT * FROM critical_asset_daily_log WHERE logId = ?',
                [existing[0].logId]
            );

            await connection.commit();
            res.status(200).json(updated[0]);
        } else {
            // Create new log
            const [result] = await connection.execute(
                `INSERT INTO critical_asset_daily_log
                 (assetId, logDate, isPresent, verifiedBy, notes, issues, location, \`condition\`)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [assetId, logDate, isPresent ? 1 : 0, verifiedBy, notes || null, issues || null, location || null, condition]
            );

            const [newLog] = await connection.execute(
                'SELECT * FROM critical_asset_daily_log WHERE logId = ?',
                [result.insertId]
            );

            await connection.commit();
            res.status(201).json(newLog[0]);
        }
    } catch (error) {
        await connection.rollback();
        console.error('Error creating/updating daily log:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Log entry already exists for this asset and date' });
        }
        res.status(500).json({ message: 'Error creating/updating daily log', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route POST /api/assets/critical/bulk-verify
 * @description Bulk verify multiple critical assets for today
 */
router.post('/critical/bulk-verify', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { verifications, verifiedBy } = req.body; // verifications is array of {assetId, isPresent, notes, issues, location, condition}

        if (!Array.isArray(verifications) || verifications.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Verifications array is required' });
        }

        if (!verifiedBy) {
            await connection.rollback();
            return res.status(400).json({ error: 'Verified by is required' });
        }

        const today = new Date().toISOString().split('T')[0];
        const results = [];

        for (const verification of verifications) {
            const { assetId, isPresent = true, notes, issues, location, condition = 'good' } = verification;

            // Check if asset is critical
            const [asset] = await connection.execute(
                'SELECT isCritical, status FROM assets WHERE assetId = ?',
                [assetId]
            );

            if (asset.length === 0 || !asset[0].isCritical || asset[0].status !== 'active') {
                continue; // Skip invalid assets
            }

            // Check if log exists
            const [existing] = await connection.execute(
                'SELECT logId FROM critical_asset_daily_log WHERE assetId = ? AND logDate = ?',
                [assetId, today]
            );

            if (existing.length > 0) {
                // Update
                await connection.execute(
                    `UPDATE critical_asset_daily_log
                     SET isPresent = ?, verifiedBy = ?, notes = ?, issues = ?, location = ?, \`condition\` = ?, verifiedAt = NOW()
                     WHERE logId = ?`,
                    [isPresent ? 1 : 0, verifiedBy, notes || null, issues || null, location || null, condition, existing[0].logId]
                );
            } else {
                // Insert
                await connection.execute(
                    `INSERT INTO critical_asset_daily_log
                     (assetId, logDate, isPresent, verifiedBy, notes, issues, location, \`condition\`)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [assetId, today, isPresent ? 1 : 0, verifiedBy, notes || null, issues || null, location || null, condition]
                );
            }

            results.push({ assetId, success: true });
        }

        await connection.commit();
        res.status(200).json({ message: 'Bulk verification completed', results });
    } catch (error) {
        await connection.rollback();
        console.error('Error in bulk verification:', error);
        res.status(500).json({ message: 'Error in bulk verification', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/assets/critical/stats
 * @description Get statistics for critical assets verification
 */
router.get('/critical/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = '';
        const params = [];

        if (startDate && endDate) {
            dateFilter = 'WHERE logDate BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else if (startDate) {
            dateFilter = 'WHERE logDate >= ?';
            params.push(startDate);
        } else if (endDate) {
            dateFilter = 'WHERE logDate <= ?';
            params.push(endDate);
        }

        const [stats] = await pool.execute(`
            SELECT
                COUNT(DISTINCT assetId) as totalCriticalAssets,
                COUNT(*) as totalVerifications,
                COUNT(CASE WHEN isPresent = 1 THEN 1 END) as presentCount,
                COUNT(CASE WHEN isPresent = 0 THEN 1 END) as missingCount,
                COUNT(CASE WHEN logDate = CURDATE() THEN 1 END) as verifiedToday,
                COUNT(CASE WHEN logDate = CURDATE() AND isPresent = 0 THEN 1 END) as missingToday
            FROM critical_asset_daily_log
            ${dateFilter}
        `, params);

        // Get today's status
        const [todayStatus] = await pool.execute(`
            SELECT
                COUNT(*) as totalCritical,
                COUNT(CASE WHEN verifiedToday IS NOT NULL THEN 1 END) as verified,
                COUNT(CASE WHEN verifiedToday = 0 THEN 1 END) as missing,
                COUNT(CASE WHEN verifiedToday IS NULL THEN 1 END) as pending
            FROM vw_critical_assets_today_status
        `);

        res.status(200).json({
            ...stats[0],
            today: todayStatus[0] || { totalCritical: 0, verified: 0, missing: 0, pending: 0 }
        });
    } catch (error) {
        console.error('Error fetching critical assets stats:', error);
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
});

/**
 * @route GET /api/assets/:id/maintenance
 * @description Get maintenance records for a specific asset
 */
router.get('/:id/maintenance', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, type, startDate, endDate } = req.query;

        let query = `
            SELECT
                m.*,
                u.firstName as performedByFirstName,
                u.lastName as performedByLastName,
                creator.firstName as createdByFirstName,
                creator.lastName as createdByLastName
            FROM asset_maintenance m
            LEFT JOIN users u ON m.performedBy = u.userId
            LEFT JOIN users creator ON m.createdBy = creator.userId
            WHERE m.assetId = ?
        `;
        const params = [id];

        if (status) {
            query += ' AND m.status = ?';
            params.push(status);
        }

        if (type) {
            query += ' AND m.maintenanceType = ?';
            params.push(type);
        }

        if (startDate) {
            query += ' AND m.maintenanceDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND m.maintenanceDate <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY m.maintenanceDate DESC, m.createdAt DESC';

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching maintenance records:', error);
        res.status(500).json({ message: 'Error fetching maintenance records', error: error.message });
    }
});

/**
 * @route GET /api/assets/maintenance/upcoming
 * @description Get upcoming maintenance for all assets
 */
router.get('/maintenance/upcoming', async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const [rows] = await pool.execute(`
            SELECT * FROM vw_upcoming_maintenance
            WHERE daysUntil <= ? AND daysUntil >= 0
            ORDER BY daysUntil ASC
        `, [days]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching upcoming maintenance:', error);
        res.status(500).json({ message: 'Error fetching upcoming maintenance', error: error.message });
    }
});

/**
 * @route GET /api/assets/maintenance/history
 * @description Get maintenance history for all assets
 */
router.get('/maintenance/history', async (req, res) => {
    try {
        const { assetId, startDate, endDate, status, type } = req.query;

        let query = 'SELECT * FROM vw_maintenance_history WHERE 1=1';
        const params = [];

        if (assetId) {
            query += ' AND assetId = ?';
            params.push(assetId);
        }

        if (startDate) {
            query += ' AND maintenanceDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND maintenanceDate <= ?';
            params.push(endDate);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (type) {
            query += ' AND maintenanceType = ?';
            params.push(type);
        }

        query += ' ORDER BY maintenanceDate DESC LIMIT 100';

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching maintenance history:', error);
        res.status(500).json({ message: 'Error fetching maintenance history', error: error.message });
    }
});

/**
 * @route POST /api/assets/maintenance
 * @description Create a new maintenance record
 */
router.post('/maintenance', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            assetId,
            maintenanceType = 'repair',
            maintenanceDate,
            scheduledDate,
            status = 'scheduled',
            description,
            workPerformed,
            cost = 0,
            performedBy,
            serviceProvider,
            partsReplaced,
            nextMaintenanceDate,
            maintenanceIntervalDays,
            notes,
            createdBy
        } = req.body;

        if (!assetId || !maintenanceDate) {
            await connection.rollback();
            return res.status(400).json({ error: 'Asset ID and maintenance date are required' });
        }

        // Check if asset exists
        const [asset] = await connection.execute(
            'SELECT assetId FROM assets WHERE assetId = ?',
            [assetId]
        );

        if (asset.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Asset not found' });
        }

        const [result] = await connection.execute(
            `INSERT INTO asset_maintenance (
                assetId, maintenanceType, maintenanceDate, scheduledDate, status,
                description, workPerformed, cost, performedBy, serviceProvider,
                partsReplaced, nextMaintenanceDate, maintenanceIntervalDays, notes, createdBy
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                assetId,
                maintenanceType,
                maintenanceDate,
                scheduledDate || null,
                status,
                description || null,
                workPerformed || null,
                cost || 0,
                performedBy || null,
                serviceProvider || null,
                partsReplaced || null,
                nextMaintenanceDate || null,
                maintenanceIntervalDays || null,
                notes || null,
                createdBy || null
            ]
        );

        const [newMaintenance] = await connection.execute(
            `SELECT
                m.*,
                u.firstName as performedByFirstName,
                u.lastName as performedByLastName
            FROM asset_maintenance m
            LEFT JOIN users u ON m.performedBy = u.userId
            WHERE m.maintenanceId = ?`,
            [result.insertId]
        );

        await connection.commit();
        res.status(201).json(newMaintenance[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating maintenance record:', error);
        res.status(500).json({ message: 'Error creating maintenance record', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/assets/maintenance/:id
 * @description Update a maintenance record
 */
router.put('/maintenance/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const {
            maintenanceType,
            maintenanceDate,
            scheduledDate,
            completedDate,
            status,
            description,
            workPerformed,
            cost,
            performedBy,
            serviceProvider,
            partsReplaced,
            nextMaintenanceDate,
            maintenanceIntervalDays,
            notes
        } = req.body;

        // Check if maintenance record exists
        const [existing] = await connection.execute(
            'SELECT maintenanceId FROM asset_maintenance WHERE maintenanceId = ?',
            [id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Maintenance record not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (maintenanceType !== undefined) { updates.push('maintenanceType = ?'); values.push(maintenanceType); }
        if (maintenanceDate !== undefined) { updates.push('maintenanceDate = ?'); values.push(maintenanceDate); }
        if (scheduledDate !== undefined) { updates.push('scheduledDate = ?'); values.push(scheduledDate); }
        if (completedDate !== undefined) { updates.push('completedDate = ?'); values.push(completedDate); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (workPerformed !== undefined) { updates.push('workPerformed = ?'); values.push(workPerformed); }
        if (cost !== undefined) { updates.push('cost = ?'); values.push(cost); }
        if (performedBy !== undefined) { updates.push('performedBy = ?'); values.push(performedBy); }
        if (serviceProvider !== undefined) { updates.push('serviceProvider = ?'); values.push(serviceProvider); }
        if (partsReplaced !== undefined) { updates.push('partsReplaced = ?'); values.push(partsReplaced); }
        if (nextMaintenanceDate !== undefined) { updates.push('nextMaintenanceDate = ?'); values.push(nextMaintenanceDate); }
        if (maintenanceIntervalDays !== undefined) { updates.push('maintenanceIntervalDays = ?'); values.push(maintenanceIntervalDays); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

        if (updates.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await connection.execute(
            `UPDATE asset_maintenance SET ${updates.join(', ')}, updatedAt = NOW() WHERE maintenanceId = ?`,
            values
        );

        const [updated] = await connection.execute(
            `SELECT
                m.*,
                u.firstName as performedByFirstName,
                u.lastName as performedByLastName
            FROM asset_maintenance m
            LEFT JOIN users u ON m.performedBy = u.userId
            WHERE m.maintenanceId = ?`,
            [id]
        );

        await connection.commit();
        res.status(200).json(updated[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating maintenance record:', error);
        res.status(500).json({ message: 'Error updating maintenance record', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/assets/maintenance/:id
 * @description Delete a maintenance record
 */
router.delete('/maintenance/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if maintenance record exists
        const [existing] = await pool.execute(
            'SELECT maintenanceId FROM asset_maintenance WHERE maintenanceId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Maintenance record not found' });
        }

        await pool.execute('DELETE FROM asset_maintenance WHERE maintenanceId = ?', [id]);

        res.status(200).json({ message: 'Maintenance record deleted successfully' });
    } catch (error) {
        console.error('Error deleting maintenance record:', error);
        res.status(500).json({ message: 'Error deleting maintenance record', error: error.message });
    }
});

/**
 * @route POST /api/assets/maintenance/:id/complete
 * @description Complete a maintenance record and optionally record expense
 */
router.post('/maintenance/:id/complete', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { completedDate, recordExpense = false, expenseAccountId, paymentMethod = 'cash', createdBy } = req.body;
        const userId = req.user?.id || createdBy || null;

        // Get maintenance record
        const [maintenance] = await connection.execute(
            `SELECT m.*, a.assetCode, a.assetName
             FROM asset_maintenance m
             INNER JOIN assets a ON m.assetId = a.assetId
             WHERE m.maintenanceId = ?`,
            [id]
        );

        if (maintenance.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Maintenance record not found' });
        }

        const maint = maintenance[0];

        // Update maintenance record
        const completionDate = completedDate || new Date().toISOString().split('T')[0];
        await connection.execute(
            `UPDATE asset_maintenance
             SET status = 'completed',
                 completedDate = ?,
                 updatedAt = NOW()
             WHERE maintenanceId = ?`,
            [completionDate, id]
        );

        // Record expense in general ledger if requested and cost > 0
        if (recordExpense && maint.cost > 0) {
            // Determine expense account based on maintenance type
            let expenseAccount = expenseAccountId;
            if (!expenseAccount) {
                // Default expense accounts based on maintenance type
                const accountMap = {
                    'repair': '5202', // Equipment Repairs
                    'calibration': '5205', // Equipment Calibration
                    'inspection': '5201', // Equipment Maintenance
                    'scheduled': '5201', // Equipment Maintenance
                    'cleaning': '5201', // Equipment Maintenance
                    'upgrade': '5201', // Equipment Maintenance
                    'other': '5201' // Equipment Maintenance
                };
                const accountCode = accountMap[maint.maintenanceType] || '5201';

                const [account] = await connection.execute(
                    'SELECT accountId FROM accounts WHERE accountCode = ? AND accountType = "Expense"',
                    [accountCode]
                );

                if (account.length === 0) {
                    await connection.rollback();
                    return res.status(400).json({ error: `Expense account ${accountCode} not found` });
                }
                expenseAccount = account[0].accountId;
            }

            // Get cash/accounts payable account based on payment method
            let paymentAccount;
            if (paymentMethod === 'cash') {
                const [cashAccount] = await connection.execute(
                    'SELECT accountId FROM accounts WHERE accountCode = "1010" AND accountType = "Asset" LIMIT 1'
                );
                if (cashAccount.length === 0) {
                    await connection.rollback();
                    return res.status(400).json({ error: 'Cash account (1010) not found' });
                }
                paymentAccount = cashAccount[0].accountId;
            } else {
                // For accounts payable
                const [payableAccount] = await connection.execute(
                    'SELECT accountId FROM accounts WHERE accountCode = "2010" AND accountType = "Liability" LIMIT 1'
                );
                if (payableAccount.length === 0) {
                    await connection.rollback();
                    return res.status(400).json({ error: 'Accounts Payable account (2010) not found' });
                }
                paymentAccount = payableAccount[0].accountId;
            }

            // Generate transaction number
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const datePrefix = `JRN-${today}-`;
            const [maxResult] = await connection.execute(
                `SELECT MAX(CAST(SUBSTRING_INDEX(transactionNumber, '-', -1) AS UNSIGNED)) as maxNum
                 FROM transactions WHERE transactionNumber LIKE CONCAT(?, '%')`,
                [datePrefix]
            );
            let nextNum = (maxResult[0]?.maxNum || 0) + 1;
            let transactionNumber = `${datePrefix}${String(nextNum).padStart(4, '0')}`;

            // Create journal entry: Debit Expense, Credit Cash/Payable
            await connection.execute(
                `INSERT INTO transactions
                 (transactionNumber, transactionDate, description, referenceNumber, referenceType,
                  debitAccountId, creditAccountId, amount, postedBy, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    transactionNumber,
                    completionDate,
                    `Maintenance Expense - ${maint.assetCode} ${maint.assetName}`,
                    `MAINT-${maint.maintenanceId}`,
                    'maintenance',
                    expenseAccount,
                    paymentAccount,
                    maint.cost,
                    userId || null,
                    `Maintenance: ${maint.maintenanceType} - ${maint.description || 'No description'}`
                ]
            );
        }

        // Get updated maintenance record
        const [updated] = await connection.execute(
            `SELECT
                m.*,
                u.firstName as performedByFirstName,
                u.lastName as performedByLastName
            FROM asset_maintenance m
            LEFT JOIN users u ON m.performedBy = u.userId
            WHERE m.maintenanceId = ?`,
            [id]
        );

        await connection.commit();
        res.status(200).json({
            maintenance: updated[0],
            expenseRecorded: recordExpense && maint.cost > 0
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error completing maintenance:', error);
        res.status(500).json({ message: 'Error completing maintenance', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/assets/:id/assignments
 * @description Get assignments for a specific asset
 */
router.get('/:id/assignments', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.query;

        let query = `
            SELECT
                a.*,
                u.firstName as assignedToFirstName,
                u.lastName as assignedToLastName,
                u.email as assignedToEmail,
                u.phone as assignedToPhone,
                u.department as assignedToDepartment,
                assigner.firstName as assignedByFirstName,
                assigner.lastName as assignedByLastName
            FROM asset_assignments a
            INNER JOIN users u ON a.assignedTo = u.userId
            LEFT JOIN users assigner ON a.assignedBy = assigner.userId
            WHERE a.assetId = ?
        `;
        const params = [id];

        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        query += ' ORDER BY a.assignmentDate DESC, a.createdAt DESC';

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching asset assignments:', error);
        res.status(500).json({ message: 'Error fetching asset assignments', error: error.message });
    }
});

/**
 * @route GET /api/assets/assignments/current
 * @description Get all current active assignments
 */
router.get('/assignments/current', async (req, res) => {
    try {
        const { userId, department } = req.query;

        let query = 'SELECT * FROM vw_current_asset_assignments WHERE 1=1';
        const params = [];

        if (userId) {
            query += ' AND assignedTo = ?';
            params.push(userId);
        }

        if (department) {
            query += ' AND assignedToDepartment = ?';
            params.push(department);
        }

        query += ' ORDER BY assignmentDate DESC';

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching current assignments:', error);
        res.status(500).json({ message: 'Error fetching current assignments', error: error.message });
    }
});

/**
 * @route GET /api/assets/assignments/history
 * @description Get assignment history
 */
router.get('/assignments/history', async (req, res) => {
    try {
        const { assetId, userId, status, startDate, endDate } = req.query;

        let query = 'SELECT * FROM vw_asset_assignment_history WHERE 1=1';
        const params = [];

        if (assetId) {
            query += ' AND assetId = ?';
            params.push(assetId);
        }

        if (userId) {
            query += ' AND assignedTo = ?';
            params.push(userId);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (startDate) {
            query += ' AND assignmentDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND assignmentDate <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY assignmentDate DESC LIMIT 100';

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching assignment history:', error);
        res.status(500).json({ message: 'Error fetching assignment history', error: error.message });
    }
});

/**
 * @route POST /api/assets/assignments
 * @description Create a new asset assignment
 */
router.post('/assignments', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            assetId,
            assignedTo,
            assignmentDate,
            conditionAtAssignment = 'good',
            location,
            department,
            notes,
            assignedBy
        } = req.body;

        if (!assetId || !assignedTo || !assignmentDate) {
            await connection.rollback();
            return res.status(400).json({ error: 'Asset ID, assigned to, and assignment date are required' });
        }

        // Check if asset exists and is available
        const [asset] = await connection.execute(
            'SELECT assetId, status FROM assets WHERE assetId = ?',
            [assetId]
        );

        if (asset.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Check if asset is already assigned (active assignment)
        const [existing] = await connection.execute(
            'SELECT assignmentId FROM asset_assignments WHERE assetId = ? AND status = "active"',
            [assetId]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Asset is already assigned to another user' });
        }

        // Check if user exists
        const [user] = await connection.execute(
            'SELECT userId FROM users WHERE userId = ?',
            [assignedTo]
        );

        if (user.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'User not found' });
        }

        const [result] = await connection.execute(
            `INSERT INTO asset_assignments (
                assetId, assignedTo, assignedBy, assignmentDate,
                conditionAtAssignment, location, department, notes, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [
                assetId,
                assignedTo,
                assignedBy || null,
                assignmentDate,
                conditionAtAssignment,
                location || null,
                department || null,
                notes || null
            ]
        );

        const [newAssignment] = await connection.execute(
            `SELECT
                a.*,
                u.firstName as assignedToFirstName,
                u.lastName as assignedToLastName,
                u.email as assignedToEmail,
                u.phone as assignedToPhone,
                u.department as assignedToDepartment,
                assigner.firstName as assignedByFirstName,
                assigner.lastName as assignedByLastName
            FROM asset_assignments a
            INNER JOIN users u ON a.assignedTo = u.userId
            LEFT JOIN users assigner ON a.assignedBy = assigner.userId
            WHERE a.assignmentId = ?`,
            [result.insertId]
        );

        await connection.commit();
        res.status(201).json(newAssignment[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating asset assignment:', error);
        res.status(500).json({ message: 'Error creating asset assignment', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/assets/assignments/:id
 * @description Update an asset assignment
 */
router.put('/assignments/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const {
            assignedTo,
            assignmentDate,
            returnDate,
            status,
            conditionAtAssignment,
            conditionAtReturn,
            location,
            department,
            notes,
            returnNotes
        } = req.body;

        // Check if assignment exists
        const [existing] = await connection.execute(
            'SELECT assignmentId, assetId FROM asset_assignments WHERE assignmentId = ?',
            [id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // If changing to returned status, set return date if not provided
        let finalReturnDate = returnDate;
        if (status === 'returned' && !returnDate) {
            finalReturnDate = new Date().toISOString().split('T')[0];
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (assignedTo !== undefined) { updates.push('assignedTo = ?'); values.push(assignedTo); }
        if (assignmentDate !== undefined) { updates.push('assignmentDate = ?'); values.push(assignmentDate); }
        if (finalReturnDate !== undefined) { updates.push('returnDate = ?'); values.push(finalReturnDate); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (conditionAtAssignment !== undefined) { updates.push('conditionAtAssignment = ?'); values.push(conditionAtAssignment); }
        if (conditionAtReturn !== undefined) { updates.push('conditionAtReturn = ?'); values.push(conditionAtReturn); }
        if (location !== undefined) { updates.push('location = ?'); values.push(location); }
        if (department !== undefined) { updates.push('department = ?'); values.push(department); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
        if (returnNotes !== undefined) { updates.push('returnNotes = ?'); values.push(returnNotes); }

        if (updates.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await connection.execute(
            `UPDATE asset_assignments SET ${updates.join(', ')}, updatedAt = NOW() WHERE assignmentId = ?`,
            values
        );

        const [updated] = await connection.execute(
            `SELECT
                a.*,
                u.firstName as assignedToFirstName,
                u.lastName as assignedToLastName,
                u.email as assignedToEmail,
                u.phone as assignedToPhone,
                u.department as assignedToDepartment,
                assigner.firstName as assignedByFirstName,
                assigner.lastName as assignedByLastName
            FROM asset_assignments a
            INNER JOIN users u ON a.assignedTo = u.userId
            LEFT JOIN users assigner ON a.assignedBy = assigner.userId
            WHERE a.assignmentId = ?`,
            [id]
        );

        await connection.commit();
        res.status(200).json(updated[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating asset assignment:', error);
        res.status(500).json({ message: 'Error updating asset assignment', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route POST /api/assets/assignments/:id/return
 * @description Return an assigned asset
 */
router.post('/assignments/:id/return', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { returnDate, conditionAtReturn, returnNotes } = req.body;

        // Check if assignment exists and is active
        const [existing] = await connection.execute(
            'SELECT assignmentId, assetId FROM asset_assignments WHERE assignmentId = ? AND status = "active"',
            [id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Active assignment not found' });
        }

        const finalReturnDate = returnDate || new Date().toISOString().split('T')[0];

        await connection.execute(
            `UPDATE asset_assignments
             SET status = 'returned',
                 returnDate = ?,
                 conditionAtReturn = ?,
                 returnNotes = ?,
                 updatedAt = NOW()
             WHERE assignmentId = ?`,
            [finalReturnDate, conditionAtReturn || null, returnNotes || null, id]
        );

        const [returned] = await connection.execute(
            `SELECT
                a.*,
                u.firstName as assignedToFirstName,
                u.lastName as assignedToLastName,
                u.email as assignedToEmail,
                u.phone as assignedToPhone,
                u.department as assignedToDepartment,
                assigner.firstName as assignedByFirstName,
                assigner.lastName as assignedByLastName
            FROM asset_assignments a
            INNER JOIN users u ON a.assignedTo = u.userId
            LEFT JOIN users assigner ON a.assignedBy = assigner.userId
            WHERE a.assignmentId = ?`,
            [id]
        );

        await connection.commit();
        res.status(200).json(returned[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error returning asset:', error);
        res.status(500).json({ message: 'Error returning asset', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/assets/assignments/:id
 * @description Delete an asset assignment
 */
router.delete('/assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if assignment exists
        const [existing] = await pool.execute(
            'SELECT assignmentId FROM asset_assignments WHERE assignmentId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        await pool.execute('DELETE FROM asset_assignments WHERE assignmentId = ?', [id]);

        res.status(200).json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ message: 'Error deleting assignment', error: error.message });
    }
});

/**
 * @route GET /api/assets/assignments/stats
 * @description Get assignment statistics
 */
router.get('/assignments/stats', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT
                COUNT(*) as totalAssignments,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as activeAssignments,
                COUNT(CASE WHEN status = 'returned' THEN 1 END) as returnedAssignments,
                COUNT(CASE WHEN status = 'lost' THEN 1 END) as lostAssignments,
                COUNT(CASE WHEN status = 'damaged' THEN 1 END) as damagedAssignments,
                COUNT(DISTINCT assetId) as uniqueAssetsAssigned,
                COUNT(DISTINCT assignedTo) as uniqueUsersAssigned
            FROM asset_assignments
        `);

        res.status(200).json(stats[0]);
    } catch (error) {
        console.error('Error fetching assignment stats:', error);
        res.status(500).json({ message: 'Error fetching assignment stats', error: error.message });
    }
});

/**
 * @route GET /api/assets/maintenance/stats
 * @description Get maintenance statistics
 */
router.get('/maintenance/stats', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT
                COUNT(*) as totalMaintenance,
                COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduledCount,
                COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as inProgressCount,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedCount,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdueCount,
                SUM(cost) as totalCost,
                AVG(cost) as averageCost,
                COUNT(CASE WHEN scheduledDate <= CURDATE() AND status IN ('scheduled', 'in-progress') THEN 1 END) as overdueScheduled
            FROM asset_maintenance
        `);

        const [upcoming] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM vw_upcoming_maintenance
            WHERE daysUntil <= 7 AND daysUntil >= 0
        `);

        res.status(200).json({
            ...stats[0],
            upcomingThisWeek: upcoming[0]?.count || 0
        });
    } catch (error) {
        console.error('Error fetching maintenance stats:', error);
        res.status(500).json({ message: 'Error fetching maintenance stats', error: error.message });
    }
});

module.exports = router;

