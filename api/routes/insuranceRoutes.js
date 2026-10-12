// Insurance management routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { enqueueOutboxEvent } = require('../lib/integrationOutbox');
const { submitClaim: submitShaClaim, shouldAutoSubmit: shouldAutoSubmitSha } = require('../lib/shaClaimsAdapter');

// ============================================
// INSURANCE PROVIDERS
// ============================================

/**
 * @route GET /api/insurance/providers
 * @description Get all insurance providers with optional filters
 */
router.get('/providers', async (req, res) => {
    try {
        const { status, providerType, search } = req.query;

        let query = `
            SELECT *
            FROM insurance_providers
            WHERE 1=1
        `;
        const params = [];

        if (status === 'active') {
            query += ' AND isActive = 1';
        } else if (status === 'inactive') {
            query += ' AND isActive = 0';
        }

        if (providerType) {
            query += ' AND providerType = ?';
            params.push(providerType);
        }

        if (search) {
            query += ' AND (providerName LIKE ? OR providerCode LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        // Order SHA first, then others alphabetically
        query += ` ORDER BY
            CASE
                WHEN providerCode = 'SHA' OR providerName LIKE '%SHA%' OR providerName LIKE '%Social Health%' THEN 0
                ELSE 1
            END,
            providerName ASC`;

        const [rows] = await pool.execute(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching insurance providers:', error);
        res.status(500).json({ message: 'Error fetching insurance providers', error: error.message });
    }
});

/**
 * @route GET /api/insurance/providers/:id
 * @description Get a single insurance provider by ID
 */
router.get('/providers/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            'SELECT * FROM insurance_providers WHERE providerId = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Insurance provider not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching insurance provider:', error);
        res.status(500).json({ message: 'Error fetching insurance provider', error: error.message });
    }
});

/**
 * @route POST /api/insurance/providers
 * @description Create a new insurance provider
 */
router.post('/providers', async (req, res) => {
    try {
        const {
            providerCode,
            providerName,
            contactPerson,
            phone,
            email,
            address,
            claimsAddress,
            website,
            isActive = true,
            notes
        } = req.body;

        if (!providerName) {
            return res.status(400).json({ error: 'Provider name is required' });
        }

        // Generate provider code if not provided
        let finalProviderCode = providerCode;
        if (!finalProviderCode) {
            const [count] = await pool.execute('SELECT COUNT(*) as count FROM insurance_providers');
            const providerNum = count[0].count + 1;
            finalProviderCode = `INS-${String(providerNum).padStart(4, '0')}`;
        } else {
            // Check if code already exists
            const [existing] = await pool.execute('SELECT providerId FROM insurance_providers WHERE providerCode = ?', [finalProviderCode]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Provider code already exists' });
            }
        }

        const [result] = await pool.execute(
            `INSERT INTO insurance_providers (
                providerCode, providerName, contactPerson, phone, email, address, claimsAddress, website, isActive, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalProviderCode,
                providerName,
                contactPerson || null,
                phone || null,
                email || null,
                address || null,
                claimsAddress || null,
                website || null,
                isActive,
                notes || null
            ]
        );

        const [newProvider] = await pool.execute(
            'SELECT * FROM insurance_providers WHERE providerId = ?',
            [result.insertId]
        );

        res.status(201).json(newProvider[0]);
    } catch (error) {
        console.error('Error creating insurance provider:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Provider code already exists' });
        }
        res.status(500).json({ message: 'Error creating insurance provider', error: error.message });
    }
});

/**
 * @route PUT /api/insurance/providers/:id
 * @description Update an insurance provider
 */
router.put('/providers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            providerCode,
            providerName,
            contactPerson,
            phone,
            email,
            address,
            claimsAddress,
            website,
            isActive,
            notes
        } = req.body;

        // Check if provider exists
        const [existing] = await pool.execute('SELECT providerId FROM insurance_providers WHERE providerId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Insurance provider not found' });
        }

        // Check for duplicate provider code if it's being changed
        if (providerCode) {
            const [duplicate] = await pool.execute(
                'SELECT providerId FROM insurance_providers WHERE providerCode = ? AND providerId != ?',
                [providerCode, id]
            );
            if (duplicate.length > 0) {
                return res.status(400).json({ error: 'Provider code already exists' });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (providerCode !== undefined) { updates.push('providerCode = ?'); values.push(providerCode); }
        if (providerName !== undefined) { updates.push('providerName = ?'); values.push(providerName); }
        if (contactPerson !== undefined) { updates.push('contactPerson = ?'); values.push(contactPerson); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email); }
        if (address !== undefined) { updates.push('address = ?'); values.push(address); }
        if (claimsAddress !== undefined) { updates.push('claimsAddress = ?'); values.push(claimsAddress); }
        if (website !== undefined) { updates.push('website = ?'); values.push(website); }
        if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE insurance_providers SET ${updates.join(', ')}, updatedAt = NOW() WHERE providerId = ?`,
            values
        );

        const [updated] = await pool.execute(
            'SELECT * FROM insurance_providers WHERE providerId = ?',
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating insurance provider:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Provider code already exists' });
        }
        res.status(500).json({ message: 'Error updating insurance provider', error: error.message });
    }
});

/**
 * @route DELETE /api/insurance/providers/:id
 * @description Delete an insurance provider (only when it has no policies and no packages)
 */
router.delete('/providers/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.execute('SELECT providerId FROM insurance_providers WHERE providerId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Insurance provider not found' });
        }

        const [policies] = await pool.execute(
            'SELECT COUNT(*) as count FROM patient_insurance WHERE providerId = ?',
            [id]
        );
        if (policies[0].count > 0) {
            return res.status(400).json({
                error: 'Cannot delete provider that has patient policies. Remove or reassign all policies for this provider first (Insurance → Policies, or from patient records).',
            });
        }

        const [packages] = await pool.execute(
            'SELECT COUNT(*) as count FROM insurance_packages WHERE providerId = ?',
            [id]
        );
        if (packages[0].count > 0) {
            return res.status(400).json({
                error: 'Cannot delete provider that has packages. Delete or reassign all packages for this provider first (Insurance → Packages).',
            });
        }

        await pool.execute('DELETE FROM insurance_providers WHERE providerId = ?', [id]);

        res.status(200).json({ message: 'Insurance provider deleted successfully' });
    } catch (error) {
        console.error('Error deleting insurance provider:', error);
        res.status(500).json({ message: 'Error deleting insurance provider', error: error.message });
    }
});

/**
 * @route POST /api/insurance/providers/cleanup-duplicates
 * @description Remove duplicate providers, keeping one per unique provider name (case-insensitive)
 */
router.post('/providers/cleanup-duplicates', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [keepRows] = await connection.execute(`
            SELECT MIN(providerId) AS providerId, LOWER(TRIM(providerName)) AS name_key
            FROM insurance_providers
            GROUP BY LOWER(TRIM(providerName))
        `);

        const nameKeyToKeeper = new Map(keepRows.map((r) => [r.name_key, r.providerId]));

        const [allProviders] = await connection.execute(
            'SELECT providerId, providerName FROM insurance_providers'
        );

        const toDelete = allProviders.filter((p) => {
            const key = (p.providerName || '').toLowerCase().trim();
            const keeper = nameKeyToKeeper.get(key);
            return keeper != null && keeper !== p.providerId;
        });

        if (toDelete.length === 0) {
            await connection.commit();
            return res.status(200).json({
                message: 'No duplicate providers found',
                deleted: 0,
                kept: allProviders.length,
            });
        }

        for (const dup of toDelete) {
            const key = (dup.providerName || '').toLowerCase().trim();
            const keeperId = nameKeyToKeeper.get(key);
            if (!keeperId) continue;

            await connection.execute(
                'UPDATE patient_insurance SET providerId = ? WHERE providerId = ?',
                [keeperId, dup.providerId]
            );
            await connection.execute(
                'UPDATE claim_requirement_templates SET providerId = ? WHERE providerId = ?',
                [keeperId, dup.providerId]
            );
            await connection.execute(
                'UPDATE insurance_packages SET providerId = ? WHERE providerId = ?',
                [keeperId, dup.providerId]
            );
            await connection.execute(
                'DELETE FROM insurance_providers WHERE providerId = ?',
                [dup.providerId]
            );
        }

        await connection.commit();
        res.status(200).json({
            message: 'Duplicate providers removed; one provider kept per unique name.',
            deleted: toDelete.length,
            kept: keepRows.length,
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error cleaning up duplicate providers:', error);
        res.status(500).json({
            message: 'Error cleaning up duplicate providers',
            error: error.message,
        });
    } finally {
        connection.release();
    }
});

// ============================================
// INSURANCE PACKAGES
// ============================================

/**
 * @route GET /api/insurance/packages
 * @description Get all insurance packages with optional filters
 */
router.get('/packages', async (req, res) => {
    try {
        const { providerId, status, search } = req.query;

        let query = `
            SELECT pkg.*, ip.providerName, ip.providerCode
            FROM insurance_packages pkg
            LEFT JOIN insurance_providers ip ON pkg.providerId = ip.providerId
            WHERE 1=1
        `;
        const params = [];

        if (providerId) {
            query += ' AND pkg.providerId = ?';
            params.push(providerId);
        }

        if (status === 'active') {
            query += ' AND pkg.isActive = 1';
        } else if (status === 'inactive') {
            query += ' AND pkg.isActive = 0';
        }

        if (search) {
            query += ' AND (pkg.packageName LIKE ? OR pkg.packageCode LIKE ? OR ip.providerName LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY ip.providerName ASC, pkg.packageName ASC';

        const [rows] = await pool.execute(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching insurance packages:', error);
        res.status(500).json({ message: 'Error fetching insurance packages', error: error.message });
    }
});

/**
 * @route POST /api/insurance/packages/cleanup-duplicates
 * @description Remove duplicate packages, keeping one per (provider + package name), case-insensitive
 */
router.post('/packages/cleanup-duplicates', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            'SELECT packageId, providerId, packageName FROM insurance_packages'
        );

        const key = (p) => `${p.providerId}\t${(p.packageName || '').toLowerCase().trim()}`;
        const keepByKey = new Map();
        for (const p of rows) {
            const k = key(p);
            if (!keepByKey.has(k) || p.packageId < keepByKey.get(k)) keepByKey.set(k, p.packageId);
        }

        const toDelete = rows.filter((p) => {
            const keeper = keepByKey.get(key(p));
            return keeper != null && keeper !== p.packageId;
        });

        if (toDelete.length === 0) {
            await connection.commit();
            return res.status(200).json({
                message: 'No duplicate packages found',
                deleted: 0,
                kept: rows.length,
            });
        }

        for (const dup of toDelete) {
            const keeperId = keepByKey.get(key(dup));
            if (!keeperId) continue;
            await connection.execute(
                'UPDATE patient_insurance SET packageId = ? WHERE packageId = ?',
                [keeperId, dup.packageId]
            );
            await connection.execute(
                'DELETE FROM insurance_packages WHERE packageId = ?',
                [dup.packageId]
            );
        }

        await connection.commit();
        res.status(200).json({
            message: 'Duplicate packages removed; one package kept per provider and name.',
            deleted: toDelete.length,
            kept: keepByKey.size,
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error cleaning up duplicate packages:', error);
        res.status(500).json({
            message: 'Error cleaning up duplicate packages',
            error: error.message,
        });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/insurance/packages/:id
 * @description Get a single insurance package by ID
 */
router.get('/packages/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            `SELECT pkg.*, ip.providerName, ip.providerCode
             FROM insurance_packages pkg
             LEFT JOIN insurance_providers ip ON pkg.providerId = ip.providerId
             WHERE pkg.packageId = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Insurance package not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching insurance package:', error);
        res.status(500).json({ message: 'Error fetching insurance package', error: error.message });
    }
});

/**
 * @route POST /api/insurance/packages
 * @description Create a new insurance package
 */
router.post('/packages', async (req, res) => {
    try {
        const {
            providerId,
            packageCode,
            packageName,
            coverageType = 'both',
            coverageLimit,
            coPayPercentage = 0,
            coPayAmount = 0,
            isActive = true,
            description
        } = req.body;

        if (!providerId || !packageName) {
            return res.status(400).json({ error: 'Provider ID and package name are required' });
        }

        const [result] = await pool.execute(
            `INSERT INTO insurance_packages (
                providerId, packageCode, packageName, coverageType, coverageLimit,
                coPayPercentage, coPayAmount, isActive, description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                providerId,
                packageCode || null,
                packageName,
                coverageType,
                coverageLimit != null ? coverageLimit : null,
                coPayPercentage != null ? coPayPercentage : 0,
                coPayAmount != null ? coPayAmount : 0,
                isActive,
                description || null
            ]
        );

        const [newPackage] = await pool.execute(
            `SELECT pkg.*, ip.providerName, ip.providerCode
             FROM insurance_packages pkg
             LEFT JOIN insurance_providers ip ON pkg.providerId = ip.providerId
             WHERE pkg.packageId = ?`,
            [result.insertId]
        );

        res.status(201).json(newPackage[0]);
    } catch (error) {
        console.error('Error creating insurance package:', error);
        res.status(500).json({ message: 'Error creating insurance package', error: error.message });
    }
});

/**
 * @route PUT /api/insurance/packages/:id
 * @description Update an insurance package
 */
router.put('/packages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            providerId,
            packageCode,
            packageName,
            coverageType,
            coverageLimit,
            coPayPercentage,
            coPayAmount,
            isActive,
            description
        } = req.body;

        const [existing] = await pool.execute('SELECT packageId FROM insurance_packages WHERE packageId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Insurance package not found' });
        }

        const updates = [];
        const values = [];

        if (providerId !== undefined) { updates.push('providerId = ?'); values.push(providerId); }
        if (packageCode !== undefined) { updates.push('packageCode = ?'); values.push(packageCode || null); }
        if (packageName !== undefined) { updates.push('packageName = ?'); values.push(packageName); }
        if (coverageType !== undefined) { updates.push('coverageType = ?'); values.push(coverageType); }
        if (coverageLimit !== undefined) { updates.push('coverageLimit = ?'); values.push(coverageLimit != null ? coverageLimit : null); }
        if (coPayPercentage !== undefined) { updates.push('coPayPercentage = ?'); values.push(coPayPercentage != null ? coPayPercentage : 0); }
        if (coPayAmount !== undefined) { updates.push('coPayAmount = ?'); values.push(coPayAmount != null ? coPayAmount : 0); }
        if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE insurance_packages SET ${updates.join(', ')}, updatedAt = NOW() WHERE packageId = ?`,
            values
        );

        const [updated] = await pool.execute(
            `SELECT pkg.*, ip.providerName, ip.providerCode
             FROM insurance_packages pkg
             LEFT JOIN insurance_providers ip ON pkg.providerId = ip.providerId
             WHERE pkg.packageId = ?`,
            [id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating insurance package:', error);
        res.status(500).json({ message: 'Error updating insurance package', error: error.message });
    }
});

/**
 * @route DELETE /api/insurance/packages/:id
 * @description Delete an insurance package (patient_insurance.packageId will be set to NULL for references)
 */
router.delete('/packages/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.execute('SELECT packageId FROM insurance_packages WHERE packageId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Insurance package not found' });
        }

        await pool.execute('UPDATE patient_insurance SET packageId = NULL WHERE packageId = ?', [id]);
        await pool.execute('DELETE FROM insurance_packages WHERE packageId = ?', [id]);

        res.status(200).json({ message: 'Insurance package deleted successfully' });
    } catch (error) {
        console.error('Error deleting insurance package:', error);
        res.status(500).json({ message: 'Error deleting insurance package', error: error.message });
    }
});

// ============================================
// INSURANCE CHARGE RATES (insurer-specific rates per charge, over time)
// ============================================

/**
 * @route GET /api/insurance/charge-rate-rules
 * @description Centralized charge pricing rules for insurance/cash with optional ward and provider scope
 */
router.get('/charge-rate-rules', async (req, res) => {
    try {
        const { payerType, providerId, chargeId, wardId, wardType, asOf } = req.query;
        let query = `
            SELECT r.*,
                   sc.chargeCode, sc.name AS chargeName, sc.category AS chargeCategory,
                   ip.providerName, ip.providerCode,
                   w.wardName, w.wardType AS wardTypeName
            FROM charge_rate_rules r
            LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
            LEFT JOIN insurance_providers ip ON r.providerId = ip.providerId
            LEFT JOIN wards w ON r.wardId = w.wardId
            WHERE 1=1
        `;
        const params = [];
        if (payerType) { query += ' AND r.payerType = ?'; params.push(payerType); }
        if (providerId) { query += ' AND r.providerId = ?'; params.push(providerId); }
        if (chargeId) { query += ' AND r.chargeId = ?'; params.push(chargeId); }
        if (wardId) { query += ' AND r.wardId = ?'; params.push(wardId); }
        if (wardType) { query += ' AND r.wardType = ?'; params.push(wardType); }
        if (asOf) {
            query += ' AND r.startDate <= ? AND (r.endDate IS NULL OR r.endDate >= ?)';
            params.push(asOf, asOf);
        }
        query += ` ORDER BY
            r.payerType ASC,
            COALESCE(ip.providerName, '') ASC,
            sc.name ASC,
            CASE WHEN r.wardId IS NOT NULL THEN 1 WHEN r.wardType IS NOT NULL THEN 2 ELSE 3 END ASC,
            r.priority DESC,
            r.startDate DESC`;
        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching charge rate rules:', error);
        if (error && (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146)) {
            return res.status(400).json({ message: 'Centralized charge-rate rules table is missing. Run migration add_charge_rate_rules.sql first.' });
        }
        res.status(500).json({ message: 'Error fetching charge rate rules', error: error.message });
    }
});

/**
 * @route POST /api/insurance/charge-rate-rules
 */
router.post('/charge-rate-rules', async (req, res) => {
    try {
        const { chargeId, payerType, providerId, wardId, wardType, amount, startDate, endDate, priority, notes } = req.body;
        if (!chargeId || !payerType || amount == null || !startDate) {
            return res.status(400).json({ error: 'chargeId, payerType, amount, and startDate are required' });
        }
        if (!['cash', 'insurance'].includes(payerType)) {
            return res.status(400).json({ error: 'payerType must be cash or insurance' });
        }
        if (payerType === 'insurance' && !providerId) {
            return res.status(400).json({ error: 'providerId is required when payerType is insurance' });
        }
        const [result] = await pool.execute(
            `INSERT INTO charge_rate_rules (chargeId, payerType, providerId, wardId, wardType, amount, startDate, endDate, priority, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                chargeId,
                payerType,
                providerId || null,
                wardId || null,
                wardType || null,
                amount,
                startDate,
                endDate || null,
                priority != null ? priority : 0,
                notes || null
            ]
        );
        const [rows] = await pool.execute(
            `SELECT r.*,
                    sc.chargeCode, sc.name AS chargeName,
                    ip.providerName, w.wardName
             FROM charge_rate_rules r
             LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
             LEFT JOIN insurance_providers ip ON r.providerId = ip.providerId
             LEFT JOIN wards w ON r.wardId = w.wardId
             WHERE r.ruleId = ?`,
            [result.insertId]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating charge rate rule:', error);
        res.status(500).json({ message: 'Error creating charge rate rule', error: error.message });
    }
});

/**
 * @route PUT /api/insurance/charge-rate-rules/:id
 */
router.put('/charge-rate-rules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { payerType, providerId, wardId, wardType, amount, startDate, endDate, priority, notes } = req.body;
        const [existing] = await pool.execute('SELECT ruleId FROM charge_rate_rules WHERE ruleId = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'Charge rate rule not found' });

        const updates = []; const values = [];
        if (payerType !== undefined) { updates.push('payerType = ?'); values.push(payerType); }
        if (providerId !== undefined) { updates.push('providerId = ?'); values.push(providerId || null); }
        if (wardId !== undefined) { updates.push('wardId = ?'); values.push(wardId || null); }
        if (wardType !== undefined) { updates.push('wardType = ?'); values.push(wardType || null); }
        if (amount != null) { updates.push('amount = ?'); values.push(amount); }
        if (startDate != null) { updates.push('startDate = ?'); values.push(startDate); }
        if (endDate !== undefined) { updates.push('endDate = ?'); values.push(endDate || null); }
        if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(id);
        await pool.execute(`UPDATE charge_rate_rules SET ${updates.join(', ')}, updatedAt = NOW() WHERE ruleId = ?`, values);
        const [rows] = await pool.execute(
            `SELECT r.*,
                    sc.chargeCode, sc.name AS chargeName,
                    ip.providerName, w.wardName
             FROM charge_rate_rules r
             LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
             LEFT JOIN insurance_providers ip ON r.providerId = ip.providerId
             LEFT JOIN wards w ON r.wardId = w.wardId
             WHERE r.ruleId = ?`,
            [id]
        );
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error updating charge rate rule:', error);
        res.status(500).json({ message: 'Error updating charge rate rule', error: error.message });
    }
});

/**
 * @route DELETE /api/insurance/charge-rate-rules/:id
 */
router.delete('/charge-rate-rules/:id', async (req, res) => {
    try {
        const [result] = await pool.execute('DELETE FROM charge_rate_rules WHERE ruleId = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Charge rate rule not found' });
        res.status(200).json({ message: 'Charge rate rule deleted' });
    } catch (error) {
        console.error('Error deleting charge rate rule:', error);
        res.status(500).json({ message: 'Error deleting charge rate rule', error: error.message });
    }
});

/**
 * @route GET /api/insurance/charge-rates
 * @description List insurance charge rates; optional providerId, chargeId, asOf (date) for current only
 */
router.get('/charge-rates', async (req, res) => {
    try {
        const { providerId, chargeId, asOf } = req.query;
        let query = `
            SELECT r.*, sc.chargeCode, sc.name AS chargeName, sc.category AS chargeCategory,
                   ip.providerName, ip.providerCode
            FROM insurance_charge_rates r
            LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
            LEFT JOIN insurance_providers ip ON r.providerId = ip.providerId
            WHERE 1=1
        `;
        const params = [];
        if (providerId) { query += ' AND r.providerId = ?'; params.push(providerId); }
        if (chargeId) { query += ' AND r.chargeId = ?'; params.push(chargeId); }
        if (asOf) {
            query += ' AND r.startDate <= ? AND (r.endDate IS NULL OR r.endDate >= ?)';
            params.push(asOf, asOf);
        }
        query += ' ORDER BY ip.providerName, sc.name, r.startDate DESC';
        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching insurance charge rates:', error);
        res.status(500).json({ message: 'Error fetching insurance charge rates', error: error.message });
    }
});

/**
 * @route GET /api/insurance/charge-rates/effective
 * @description Get the effective rate for (chargeId, providerId) on a date (default today)
 */
router.get('/charge-rates/effective', async (req, res) => {
    try {
        const { chargeId, providerId, date } = req.query;
        if (!chargeId || !providerId) {
            return res.status(400).json({ error: 'chargeId and providerId are required' });
        }
        const asOf = date || new Date().toISOString().slice(0, 10);
        const [rows] = await pool.execute(
            `SELECT r.*, sc.name AS chargeName, ip.providerName
             FROM insurance_charge_rates r
             LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
             LEFT JOIN insurance_providers ip ON r.providerId = ip.providerId
             WHERE r.chargeId = ? AND r.providerId = ? AND r.startDate <= ? AND (r.endDate IS NULL OR r.endDate >= ?)
             ORDER BY r.startDate DESC LIMIT 1`,
            [chargeId, providerId, asOf, asOf]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'No rate found for this charge and provider on the given date' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching effective rate:', error);
        res.status(500).json({ message: 'Error fetching effective rate', error: error.message });
    }
});

/**
 * @route GET /api/insurance/charge-rates/:id
 */
router.get('/charge-rates/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT r.*, sc.chargeCode, sc.name AS chargeName, ip.providerName, ip.providerCode
             FROM insurance_charge_rates r
             LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
             LEFT JOIN insurance_providers ip ON r.providerId = ip.providerId
             WHERE r.rateId = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Insurance charge rate not found' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching insurance charge rate:', error);
        res.status(500).json({ message: 'Error fetching insurance charge rate', error: error.message });
    }
});

/**
 * @route POST /api/insurance/charge-rates
 */
router.post('/charge-rates', async (req, res) => {
    try {
        const { chargeId, providerId, amount, startDate, endDate, notes } = req.body;
        if (!chargeId || !providerId || amount == null || !startDate) {
            return res.status(400).json({ error: 'chargeId, providerId, amount, and startDate are required' });
        }
        const [result] = await pool.execute(
            `INSERT INTO insurance_charge_rates (chargeId, providerId, amount, startDate, endDate, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [chargeId, providerId, amount, startDate, endDate || null, notes || null]
        );
        const [rows] = await pool.execute(
            `SELECT r.*, sc.chargeCode, sc.name AS chargeName, ip.providerName
             FROM insurance_charge_rates r
             LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
             LEFT JOIN insurance_providers ip ON r.providerId = ip.providerId
             WHERE r.rateId = ?`,
            [result.insertId]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating insurance charge rate:', error);
        res.status(500).json({ message: 'Error creating insurance charge rate', error: error.message });
    }
});

/**
 * @route PUT /api/insurance/charge-rates/:id
 */
router.put('/charge-rates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, startDate, endDate, notes } = req.body;
        const [existing] = await pool.execute('SELECT rateId FROM insurance_charge_rates WHERE rateId = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'Insurance charge rate not found' });
        const updates = []; const values = [];
        if (amount != null) { updates.push('amount = ?'); values.push(amount); }
        if (startDate != null) { updates.push('startDate = ?'); values.push(startDate); }
        if (endDate !== undefined) { updates.push('endDate = ?'); values.push(endDate || null); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(id);
        await pool.execute(`UPDATE insurance_charge_rates SET ${updates.join(', ')}, updatedAt = NOW() WHERE rateId = ?`, values);
        const [rows] = await pool.execute(
            `SELECT r.*, sc.chargeCode, sc.name AS chargeName, ip.providerName
             FROM insurance_charge_rates r LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
             LEFT JOIN insurance_providers ip ON r.providerId = ip.providerId WHERE r.rateId = ?`,
            [id]
        );
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error updating insurance charge rate:', error);
        res.status(500).json({ message: 'Error updating insurance charge rate', error: error.message });
    }
});

/**
 * @route DELETE /api/insurance/charge-rates/:id
 */
router.delete('/charge-rates/:id', async (req, res) => {
    try {
        const [result] = await pool.execute('DELETE FROM insurance_charge_rates WHERE rateId = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Insurance charge rate not found' });
        res.status(200).json({ message: 'Insurance charge rate deleted' });
    } catch (error) {
        console.error('Error deleting insurance charge rate:', error);
        res.status(500).json({ message: 'Error deleting insurance charge rate', error: error.message });
    }
});

// ============================================
// INPATIENT CHARGE RATES (cash-paying inpatients; can vary by ward/ward type)
// ============================================

/**
 * @route GET /api/insurance/inpatient-charge-rates
 * @description List inpatient charge rates; optional chargeId, wardId, wardType, asOf
 */
router.get('/inpatient-charge-rates', async (req, res) => {
    try {
        const { chargeId, wardId, wardType, asOf } = req.query;
        let query = `
            SELECT r.*, sc.chargeCode, sc.name AS chargeName, sc.category,
                   w.wardName, w.wardType AS wardTypeName
            FROM inpatient_charge_rates r
            LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
            LEFT JOIN wards w ON r.wardId = w.wardId
            WHERE 1=1
        `;
        const params = [];
        if (chargeId) { query += ' AND r.chargeId = ?'; params.push(chargeId); }
        if (wardId) { query += ' AND r.wardId = ?'; params.push(wardId); }
        if (wardType) { query += ' AND r.wardType = ?'; params.push(wardType); }
        if (asOf) {
            query += ' AND r.startDate <= ? AND (r.endDate IS NULL OR r.endDate >= ?)';
            params.push(asOf, asOf);
        }
        query += ' ORDER BY sc.name, w.wardName, r.wardType, r.startDate DESC';
        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching inpatient charge rates:', error);
        res.status(500).json({ message: 'Error fetching inpatient charge rates', error: error.message });
    }
});

/**
 * @route GET /api/insurance/inpatient-charge-rates/effective
 * @description Get effective rate for cash inpatient: chargeId, optional wardId/wardType, date. Precedence: wardId > wardType > default.
 */
router.get('/inpatient-charge-rates/effective', async (req, res) => {
    try {
        const { chargeId, wardId, wardType, date } = req.query;
        if (!chargeId) return res.status(400).json({ error: 'chargeId is required' });
        const asOf = date || new Date().toISOString().slice(0, 10);
        let rate = null;
        if (wardId) {
            const [rows] = await pool.execute(
                `SELECT r.* FROM inpatient_charge_rates r
                 WHERE r.chargeId = ? AND r.wardId = ? AND r.startDate <= ? AND (r.endDate IS NULL OR r.endDate >= ?)
                 ORDER BY r.startDate DESC LIMIT 1`,
                [chargeId, wardId, asOf, asOf]
            );
            if (rows.length > 0) rate = rows[0];
        }
        if (!rate && wardType) {
            const [rows] = await pool.execute(
                `SELECT r.* FROM inpatient_charge_rates r
                 WHERE r.chargeId = ? AND r.wardId IS NULL AND r.wardType = ? AND r.startDate <= ? AND (r.endDate IS NULL OR r.endDate >= ?)
                 ORDER BY r.startDate DESC LIMIT 1`,
                [chargeId, wardType, asOf, asOf]
            );
            if (rows.length > 0) rate = rows[0];
        }
        if (!rate) {
            const [rows] = await pool.execute(
                `SELECT r.* FROM inpatient_charge_rates r
                 WHERE r.chargeId = ? AND r.wardId IS NULL AND r.wardType IS NULL AND r.startDate <= ? AND (r.endDate IS NULL OR r.endDate >= ?)
                 ORDER BY r.startDate DESC LIMIT 1`,
                [chargeId, asOf, asOf]
            );
            if (rows.length > 0) rate = rows[0];
        }
        if (!rate) return res.status(404).json({ message: 'No inpatient rate found for this charge (and ward/type) on the given date' });
        res.status(200).json(rate);
    } catch (error) {
        console.error('Error fetching effective inpatient rate:', error);
        res.status(500).json({ message: 'Error fetching effective inpatient rate', error: error.message });
    }
});

/**
 * @route GET /api/insurance/inpatient-charge-rates/:id
 */
router.get('/inpatient-charge-rates/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT r.*, sc.chargeCode, sc.name AS chargeName, w.wardName
             FROM inpatient_charge_rates r
             LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
             LEFT JOIN wards w ON r.wardId = w.wardId
             WHERE r.rateId = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Inpatient charge rate not found' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching inpatient charge rate:', error);
        res.status(500).json({ message: 'Error fetching inpatient charge rate', error: error.message });
    }
});

/**
 * @route POST /api/insurance/inpatient-charge-rates
 */
router.post('/inpatient-charge-rates', async (req, res) => {
    try {
        const { chargeId, wardId, wardType, amount, startDate, endDate, notes } = req.body;
        if (!chargeId || amount == null || !startDate) {
            return res.status(400).json({ error: 'chargeId, amount, and startDate are required' });
        }
        const [result] = await pool.execute(
            `INSERT INTO inpatient_charge_rates (chargeId, wardId, wardType, amount, startDate, endDate, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [chargeId, wardId || null, wardType || null, amount, startDate, endDate || null, notes || null]
        );
        const [rows] = await pool.execute(
            `SELECT r.*, sc.chargeCode, sc.name AS chargeName, w.wardName
             FROM inpatient_charge_rates r
             LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
             LEFT JOIN wards w ON r.wardId = w.wardId
             WHERE r.rateId = ?`,
            [result.insertId]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating inpatient charge rate:', error);
        res.status(500).json({ message: 'Error creating inpatient charge rate', error: error.message });
    }
});

/**
 * @route PUT /api/insurance/inpatient-charge-rates/:id
 */
router.put('/inpatient-charge-rates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { wardId, wardType, amount, startDate, endDate, notes } = req.body;
        const [existing] = await pool.execute('SELECT rateId FROM inpatient_charge_rates WHERE rateId = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'Inpatient charge rate not found' });
        const updates = []; const values = [];
        if (wardId !== undefined) { updates.push('wardId = ?'); values.push(wardId || null); }
        if (wardType !== undefined) { updates.push('wardType = ?'); values.push(wardType || null); }
        if (amount != null) { updates.push('amount = ?'); values.push(amount); }
        if (startDate != null) { updates.push('startDate = ?'); values.push(startDate); }
        if (endDate !== undefined) { updates.push('endDate = ?'); values.push(endDate || null); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(id);
        await pool.execute(`UPDATE inpatient_charge_rates SET ${updates.join(', ')}, updatedAt = NOW() WHERE rateId = ?`, values);
        const [rows] = await pool.execute(
            `SELECT r.*, sc.chargeCode, sc.name AS chargeName, w.wardName
             FROM inpatient_charge_rates r LEFT JOIN service_charges sc ON r.chargeId = sc.chargeId
             LEFT JOIN wards w ON r.wardId = w.wardId WHERE r.rateId = ?`,
            [id]
        );
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error updating inpatient charge rate:', error);
        res.status(500).json({ message: 'Error updating inpatient charge rate', error: error.message });
    }
});

/**
 * @route DELETE /api/insurance/inpatient-charge-rates/:id
 */
router.delete('/inpatient-charge-rates/:id', async (req, res) => {
    try {
        const [result] = await pool.execute('DELETE FROM inpatient_charge_rates WHERE rateId = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Inpatient charge rate not found' });
        res.status(200).json({ message: 'Inpatient charge rate deleted' });
    } catch (error) {
        console.error('Error deleting inpatient charge rate:', error);
        res.status(500).json({ message: 'Error deleting inpatient charge rate', error: error.message });
    }
});

// ============================================
// PATIENT INSURANCE POLICIES
// ============================================

/**
 * @route GET /api/insurance/policies
 * @description Get all patient insurance policies with optional filters
 */
router.get('/policies', async (req, res) => {
    try {
        const { patientId, providerId, status, search } = req.query;

        let query = `
            SELECT pi.*,
                   p.patientNumber, p.firstName, p.lastName, p.phone as patientPhone,
                   ip.providerName, ip.providerCode
            FROM patient_insurance pi
            LEFT JOIN patients p ON pi.patientId = p.patientId
            LEFT JOIN insurance_providers ip ON pi.providerId = ip.providerId
            WHERE 1=1
        `;
        const params = [];

        if (patientId) {
            query += ' AND pi.patientId = ?';
            params.push(patientId);
        }

        if (providerId) {
            query += ' AND pi.providerId = ?';
            params.push(providerId);
        }

        if (status === 'active') {
            query += ' AND pi.isActive = 1 AND (pi.coverageEndDate IS NULL OR pi.coverageEndDate >= CURDATE())';
        } else if (status === 'inactive') {
            query += ' AND (pi.isActive = 0 OR pi.coverageEndDate < CURDATE())';
        }

        if (search) {
            query += ' AND (pi.policyNumber LIKE ? OR pi.memberId LIKE ? OR p.firstName LIKE ? OR p.lastName LIKE ? OR ip.providerName LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY pi.coverageStartDate DESC, pi.createdAt DESC';

        const [rows] = await pool.execute(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching insurance policies:', error);
        res.status(500).json({ message: 'Error fetching insurance policies', error: error.message });
    }
});

/**
 * @route GET /api/insurance/policies/:id
 * @description Get a single insurance policy by ID
 */
router.get('/policies/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(`
            SELECT pi.*,
                   p.patientNumber, p.firstName, p.lastName, p.phone as patientPhone,
                   ip.providerName, ip.providerCode
            FROM patient_insurance pi
            LEFT JOIN patients p ON pi.patientId = p.patientId
            LEFT JOIN insurance_providers ip ON pi.providerId = ip.providerId
            WHERE pi.patientInsuranceId = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Insurance policy not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching insurance policy:', error);
        res.status(500).json({ message: 'Error fetching insurance policy', error: error.message });
    }
});

/**
 * @route POST /api/insurance/policies
 * @description Create a new patient insurance policy
 */
router.post('/policies', async (req, res) => {
    try {
        const {
            patientId,
            providerId,
            packageId,
            policyNumber,
            memberId,
            memberName,
            relationship,
            coverageStartDate,
            coverageEndDate,
            isActive = true,
            notes
        } = req.body;

        if (!patientId || !providerId || !policyNumber || !coverageStartDate) {
            return res.status(400).json({ error: 'Patient ID, provider ID, policy number, and coverage start date are required' });
        }

        const [result] = await pool.execute(
            `INSERT INTO patient_insurance (
                patientId, providerId, packageId, policyNumber, memberId, memberName, relationship,
                coverageStartDate, coverageEndDate, isActive, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                providerId,
                packageId || null,
                policyNumber,
                memberId || null,
                memberName || null,
                relationship || 'self',
                coverageStartDate,
                coverageEndDate || null,
                isActive,
                notes || null
            ]
        );

        const [newPolicy] = await pool.execute(`
            SELECT pi.*,
                   p.patientNumber, p.firstName, p.lastName,
                   ip.providerName, ip.providerCode
            FROM patient_insurance pi
            LEFT JOIN patients p ON pi.patientId = p.patientId
            LEFT JOIN insurance_providers ip ON pi.providerId = ip.providerId
            WHERE pi.patientInsuranceId = ?
        `, [result.insertId]);

        res.status(201).json(newPolicy[0]);
    } catch (error) {
        console.error('Error creating insurance policy:', error);
        res.status(500).json({ message: 'Error creating insurance policy', error: error.message });
    }
});

/**
 * @route PUT /api/insurance/policies/:id
 * @description Update an insurance policy
 */
router.put('/policies/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if policy exists
        const [existing] = await pool.execute('SELECT patientInsuranceId FROM patient_insurance WHERE patientInsuranceId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Insurance policy not found' });
        }

        const {
            providerId,
            packageId,
            policyNumber,
            memberId,
            memberName,
            relationship,
            coverageStartDate,
            coverageEndDate,
            isActive,
            notes
        } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (providerId !== undefined) { updates.push('providerId = ?'); values.push(providerId); }
        if (packageId !== undefined) { updates.push('packageId = ?'); values.push(packageId); }
        if (policyNumber !== undefined) { updates.push('policyNumber = ?'); values.push(policyNumber); }
        if (memberId !== undefined) { updates.push('memberId = ?'); values.push(memberId); }
        if (memberName !== undefined) { updates.push('memberName = ?'); values.push(memberName); }
        if (relationship !== undefined) { updates.push('relationship = ?'); values.push(relationship); }
        if (coverageStartDate !== undefined) { updates.push('coverageStartDate = ?'); values.push(coverageStartDate); }
        if (coverageEndDate !== undefined) { updates.push('coverageEndDate = ?'); values.push(coverageEndDate); }
        if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE patient_insurance SET ${updates.join(', ')}, updatedAt = NOW() WHERE patientInsuranceId = ?`,
            values
        );

        const [updated] = await pool.execute(`
            SELECT pi.*,
                   p.patientNumber, p.firstName, p.lastName,
                   ip.providerName, ip.providerCode
            FROM patient_insurance pi
            LEFT JOIN patients p ON pi.patientId = p.patientId
            LEFT JOIN insurance_providers ip ON pi.providerId = ip.providerId
            WHERE pi.patientInsuranceId = ?
        `, [id]);

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating insurance policy:', error);
        res.status(500).json({ message: 'Error updating insurance policy', error: error.message });
    }
});

/**
 * @route DELETE /api/insurance/policies/:id
 * @description Delete an insurance policy
 */
router.delete('/policies/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if policy exists
        const [existing] = await pool.execute('SELECT patientInsuranceId FROM patient_insurance WHERE patientInsuranceId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Insurance policy not found' });
        }

        await pool.execute('DELETE FROM patient_insurance WHERE patientInsuranceId = ?', [id]);

        res.status(200).json({ message: 'Insurance policy deleted successfully' });
    } catch (error) {
        console.error('Error deleting insurance policy:', error);
        res.status(500).json({ message: 'Error deleting insurance policy', error: error.message });
    }
});

/**
 * @route GET /api/insurance/stats/summary
 * @description Get summary statistics for insurance
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT
                (SELECT COUNT(*) FROM insurance_providers WHERE isActive = 1) as activeProviders,
                (SELECT COUNT(*) FROM patient_insurance WHERE isActive = 1 AND (coverageEndDate IS NULL OR coverageEndDate >= CURDATE())) as activePolicies,
                (SELECT COUNT(*) FROM insurance_claims WHERE status IN ('draft', 'submitted', 'under_review')) as pendingClaims,
                (SELECT COUNT(*) FROM insurance_claims WHERE status IN ('approved', 'partially_approved', 'paid')) as approvedClaims,
                (SELECT COALESCE(SUM(claimAmount), 0) FROM insurance_claims WHERE status IN ('approved', 'partially_approved', 'paid')) as totalClaimedAmount,
                (SELECT COALESCE(SUM(approvedAmount), 0) FROM insurance_claims WHERE status IN ('approved', 'partially_approved', 'paid')) as totalApprovedAmount
            FROM dual
        `);

        res.status(200).json(stats[0] || {
            activeProviders: 0,
            activePolicies: 0,
            pendingClaims: 0,
            approvedClaims: 0,
            totalClaimedAmount: 0,
            totalApprovedAmount: 0
        });
    } catch (error) {
        console.error('Error fetching insurance stats:', error);
        res.status(500).json({ message: 'Error fetching insurance stats', error: error.message });
    }
});

// ============================================
// INSURANCE CLAIMS
// ============================================

/**
 * @route GET /api/insurance/claims
 * @description Get all insurance claims with optional filters
 */
router.get('/claims', async (req, res) => {
    try {
        const { status, providerId, patientId, search } = req.query;

        let query = `
            SELECT ic.*,
                   i.invoiceNumber, i.totalAmount as invoiceAmount,
                   pi.policyNumber, pi.memberId,
                   p.patientNumber, p.firstName, p.lastName,
                   ip.providerName, ip.providerCode,
                   u.firstName as createdByFirstName, u.lastName as createdByLastName
            FROM insurance_claims ic
            LEFT JOIN invoices i ON ic.invoiceId = i.invoiceId
            LEFT JOIN patient_insurance pi ON ic.patientInsuranceId = pi.patientInsuranceId
            LEFT JOIN patients p ON pi.patientId = p.patientId
            LEFT JOIN insurance_providers ip ON pi.providerId = ip.providerId
            LEFT JOIN users u ON ic.createdBy = u.userId
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND ic.status = ?';
            params.push(status);
        }

        if (providerId) {
            query += ' AND pi.providerId = ?';
            params.push(providerId);
        }

        if (patientId) {
            query += ' AND pi.patientId = ?';
            params.push(patientId);
        }

        if (search) {
            query += ' AND (ic.claimNumber LIKE ? OR p.firstName LIKE ? OR p.lastName LIKE ? OR i.invoiceNumber LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY ic.claimDate DESC, ic.createdAt DESC';

        const [rows] = await pool.execute(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching insurance claims:', error);
        res.status(500).json({ message: 'Error fetching insurance claims', error: error.message });
    }
});

/**
 * @route GET /api/insurance/claims/:id
 * @description Get a single insurance claim by ID with requirements
 */
router.get('/claims/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get claim details
        const [claims] = await pool.execute(`
            SELECT ic.*,
                   i.invoiceNumber, i.totalAmount as invoiceAmount, i.invoiceDate,
                   pi.policyNumber, pi.memberId, pi.memberName,
                   p.patientNumber, p.firstName, p.lastName, p.dateOfBirth, p.gender,
                   ip.providerName, ip.providerCode, ip.providerId,
                   u.firstName as createdByFirstName, u.lastName as createdByLastName
            FROM insurance_claims ic
            LEFT JOIN invoices i ON ic.invoiceId = i.invoiceId
            LEFT JOIN patient_insurance pi ON ic.patientInsuranceId = pi.patientInsuranceId
            LEFT JOIN patients p ON pi.patientId = p.patientId
            LEFT JOIN insurance_providers ip ON pi.providerId = ip.providerId
            LEFT JOIN users u ON ic.createdBy = u.userId
            WHERE ic.claimId = ?
        `, [id]);

        if (claims.length === 0) {
            return res.status(404).json({ message: 'Claim not found' });
        }

        const claim = claims[0];

        // Get requirements for this claim's provider
        const [requirements] = await pool.execute(`
            SELECT cr.*, crc.completionId, crc.isCompleted, crc.completionDate,
                   crc.documentPath, crc.documentName, crc.notes as completionNotes,
                   crc.verificationStatus, crc.verifiedBy, crc.verifiedDate, crc.verificationNotes,
                   u1.firstName as completedByFirstName, u1.lastName as completedByLastName,
                   u2.firstName as verifiedByFirstName, u2.lastName as verifiedByLastName
            FROM claim_requirements cr
            INNER JOIN claim_requirement_templates crt ON cr.templateId = crt.templateId
            LEFT JOIN claim_requirement_completions crc ON cr.requirementId = crc.requirementId AND crc.claimId = ?
            LEFT JOIN users u1 ON crc.completedBy = u1.userId
            LEFT JOIN users u2 ON crc.verifiedBy = u2.userId
            WHERE crt.providerId = ? AND cr.isActive = 1 AND crt.isActive = 1
            ORDER BY cr.displayOrder ASC, cr.requirementId ASC
        `, [id, claim.providerId]);

        // Calculate requirements completion status
        const totalRequirements = requirements.length;
        const completedRequirements = requirements.filter(r => r.isCompleted).length;
        const requiredRequirements = requirements.filter(r => r.isRequired);
        const completedRequired = requiredRequirements.filter(r => r.isCompleted).length;
        const allRequiredMet = requiredRequirements.length === 0 || completedRequired === requiredRequirements.length;

        claim.requirements = requirements;
        claim.requirementsSummary = {
            total: totalRequirements,
            completed: completedRequirements,
            required: requiredRequirements.length,
            completedRequired: completedRequired,
            allRequiredMet: allRequiredMet,
            completionPercentage: totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 100
        };

        res.status(200).json(claim);
    } catch (error) {
        console.error('Error fetching insurance claim:', error);
        res.status(500).json({ message: 'Error fetching insurance claim', error: error.message });
    }
});

/**
 * @route POST /api/insurance/claims
 * @description Create a new insurance claim
 */
router.post('/claims', async (req, res) => {
    const connection = await pool.getConnection();
    const userId = req.user?.id;

    try {
        await connection.beginTransaction();

        const {
            invoiceId,
            patientInsuranceId,
            authorizationId,
            claimDate,
            claimAmount,
            notes
        } = req.body;

        if (!invoiceId || !patientInsuranceId || !claimDate || !claimAmount) {
            await connection.rollback();
            return res.status(400).json({ error: 'Invoice ID, patient insurance ID, claim date, and claim amount are required' });
        }

        // Generate claim number
        const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
        let claimNumber = '';
        let attempts = 0;
        let foundAvailable = false;

        while (!foundAvailable && attempts < 100) {
            const num = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            claimNumber = `CLM-${datePrefix}-${num}`;

            const [existing] = await connection.execute(
                'SELECT claimId FROM insurance_claims WHERE claimNumber = ?',
                [claimNumber]
            );

            if (existing.length === 0) {
                foundAvailable = true;
            } else {
                attempts++;
            }
        }

        if (!foundAvailable) {
            await connection.rollback();
            return res.status(500).json({ error: 'Failed to generate unique claim number' });
        }

        const [result] = await connection.execute(
            `INSERT INTO insurance_claims (
                claimNumber, invoiceId, patientInsuranceId, authorizationId, claimDate, claimAmount, status, notes, createdBy
            )
            VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
            [
                claimNumber,
                invoiceId,
                patientInsuranceId,
                authorizationId || null,
                claimDate,
                claimAmount,
                notes || null,
                userId || null
            ]
        );

        const claimId = result.insertId;

        // Get provider ID for this claim
        const [patientInsurance] = await connection.execute(
            'SELECT providerId FROM patient_insurance WHERE patientInsuranceId = ?',
            [patientInsuranceId]
        );

        if (patientInsurance.length > 0) {
            const providerId = patientInsurance[0].providerId;

            // Get requirements template for this provider
            const [templates] = await connection.execute(
                'SELECT templateId FROM claim_requirement_templates WHERE providerId = ? AND isActive = 1',
                [providerId]
            );

            if (templates.length > 0) {
                const templateId = templates[0].templateId;

                // Get all requirements for this template
                const [requirements] = await connection.execute(
                    'SELECT requirementId FROM claim_requirements WHERE templateId = ? AND isActive = 1',
                    [templateId]
                );

                // Initialize requirement completions (all false)
                for (const req of requirements) {
                    await connection.execute(
                        `INSERT INTO claim_requirement_completions (claimId, requirementId, isCompleted)
                         VALUES (?, ?, 0)`,
                        [claimId, req.requirementId]
                    );
                }
            }
        }

        await connection.commit();

        // Fetch the created claim with all details
        const [newClaim] = await pool.execute(`
            SELECT ic.*,
                   i.invoiceNumber, i.totalAmount as invoiceAmount,
                   pi.policyNumber, pi.memberId,
                   p.patientNumber, p.firstName, p.lastName,
                   ip.providerName, ip.providerCode
            FROM insurance_claims ic
            LEFT JOIN invoices i ON ic.invoiceId = i.invoiceId
            LEFT JOIN patient_insurance pi ON ic.patientInsuranceId = pi.patientInsuranceId
            LEFT JOIN patients p ON pi.patientId = p.patientId
            LEFT JOIN insurance_providers ip ON pi.providerId = ip.providerId
            WHERE ic.claimId = ?
        `, [claimId]);

        res.status(201).json(newClaim[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating insurance claim:', error);
        res.status(500).json({ message: 'Error creating insurance claim', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/insurance/claims/:id
 * @description Update an insurance claim
 */
router.put('/claims/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            authorizationId,
            claimDate,
            claimAmount,
            status,
            submissionDate,
            responseDate,
            approvedAmount,
            rejectedAmount,
            rejectionReason,
            paymentDate,
            paymentReference,
            notes
        } = req.body;

        // Check if claim exists
        const [existing] = await pool.execute('SELECT claimId FROM insurance_claims WHERE claimId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Claim not found' });
        }

        const updates = [];
        const values = [];

        if (authorizationId !== undefined) { updates.push('authorizationId = ?'); values.push(authorizationId); }
        if (claimDate !== undefined) { updates.push('claimDate = ?'); values.push(claimDate); }
        if (claimAmount !== undefined) { updates.push('claimAmount = ?'); values.push(claimAmount); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (submissionDate !== undefined) { updates.push('submissionDate = ?'); values.push(submissionDate); }
        if (responseDate !== undefined) { updates.push('responseDate = ?'); values.push(responseDate); }
        if (approvedAmount !== undefined) { updates.push('approvedAmount = ?'); values.push(approvedAmount); }
        if (rejectedAmount !== undefined) { updates.push('rejectedAmount = ?'); values.push(rejectedAmount); }
        if (rejectionReason !== undefined) { updates.push('rejectionReason = ?'); values.push(rejectionReason); }
        if (paymentDate !== undefined) { updates.push('paymentDate = ?'); values.push(paymentDate); }
        if (paymentReference !== undefined) { updates.push('paymentReference = ?'); values.push(paymentReference); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

        // Check requirements if submitting
        if (status === 'submitted') {
            const [claim] = await pool.execute(`
                SELECT ic.*, pi.providerId
                FROM insurance_claims ic
                LEFT JOIN patient_insurance pi ON ic.patientInsuranceId = pi.patientInsuranceId
                WHERE ic.claimId = ?
            `, [id]);

            if (claim.length > 0) {
                const providerId = claim[0].providerId;
                const [requirements] = await pool.execute(`
                    SELECT cr.requirementId, cr.isRequired, crc.isCompleted
                    FROM claim_requirements cr
                    INNER JOIN claim_requirement_templates crt ON cr.templateId = crt.templateId
                    LEFT JOIN claim_requirement_completions crc ON cr.requirementId = crc.requirementId AND crc.claimId = ?
                    WHERE crt.providerId = ? AND cr.isActive = 1 AND crt.isActive = 1
                `, [id, providerId]);

                const incompleteRequired = requirements.filter(r => r.isRequired && !r.isCompleted);
                if (incompleteRequired.length > 0) {
                    return res.status(400).json({
                        error: 'Cannot submit claim: Required requirements are not completed',
                        incompleteRequirements: incompleteRequired.map(r => r.requirementId)
                    });
                }

                // Update requirementsMet flag
                updates.push('requirementsMet = 1');
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE insurance_claims SET ${updates.join(', ')}, updatedAt = NOW() WHERE claimId = ?`,
            values
        );

        const [updated] = await pool.execute(`
            SELECT ic.*,
                   i.invoiceNumber, i.totalAmount as invoiceAmount,
                   pi.policyNumber, pi.memberId,
                   p.patientNumber, p.firstName, p.lastName, p.patientId,
                   ip.providerName, ip.providerCode
            FROM insurance_claims ic
            LEFT JOIN invoices i ON ic.invoiceId = i.invoiceId
            LEFT JOIN patient_insurance pi ON ic.patientInsuranceId = pi.patientInsuranceId
            LEFT JOIN patients p ON pi.patientId = p.patientId
            LEFT JOIN insurance_providers ip ON pi.providerId = ip.providerId
            WHERE ic.claimId = ?
        `, [id]);

        if (status === 'submitted' && updated[0]) {
            try {
                await enqueueOutboxEvent(pool, {
                    eventType: 'claim.ready',
                    aggregateType: 'insurance_claim',
                    aggregateId: id,
                    payload: {
                        claimId: Number(id),
                        claimNumber: updated[0].claimNumber,
                        patientId: updated[0].patientId,
                        patientNumber: updated[0].patientNumber,
                        providerCode: updated[0].providerCode,
                        providerName: updated[0].providerName,
                        claimAmount: updated[0].claimAmount,
                        invoiceNumber: updated[0].invoiceNumber,
                        status: updated[0].status,
                    },
                });
            } catch (outboxErr) {
                console.warn('[insurance] claim.ready outbox skipped:', outboxErr.message || outboxErr);
            }

            try {
                if (await shouldAutoSubmitSha(pool)) {
                    await submitShaClaim(pool, Number(id));
                }
            } catch (shaErr) {
                console.warn('[insurance] SHA submit skipped:', shaErr.message || shaErr);
            }
        }

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating insurance claim:', error);
        res.status(500).json({ message: 'Error updating insurance claim', error: error.message });
    }
});

// ============================================
// CLAIM REQUIREMENTS
// ============================================

/**
 * @route GET /api/insurance/claims/:id/requirements
 * @description Get requirements for a specific claim
 */
router.get('/claims/:id/requirements', async (req, res) => {
    try {
        const { id } = req.params;

        const [requirements] = await pool.execute(`
            SELECT cr.*, crc.completionId, crc.isCompleted, crc.completionDate,
                   crc.documentPath, crc.documentName, crc.notes as completionNotes,
                   crc.verificationStatus, crc.verifiedBy, crc.verifiedDate, crc.verificationNotes,
                   u1.firstName as completedByFirstName, u1.lastName as completedByLastName,
                   u2.firstName as verifiedByFirstName, u2.lastName as verifiedByLastName
            FROM claim_requirements cr
            INNER JOIN claim_requirement_templates crt ON cr.templateId = crt.templateId
            INNER JOIN insurance_claims ic ON ic.claimId = ?
            INNER JOIN patient_insurance pi ON ic.patientInsuranceId = pi.patientInsuranceId
            LEFT JOIN claim_requirement_completions crc ON cr.requirementId = crc.requirementId AND crc.claimId = ?
            LEFT JOIN users u1 ON crc.completedBy = u1.userId
            LEFT JOIN users u2 ON crc.verifiedBy = u2.userId
            WHERE crt.providerId = pi.providerId AND cr.isActive = 1 AND crt.isActive = 1
            ORDER BY cr.displayOrder ASC, cr.requirementId ASC
        `, [id, id]);

        res.status(200).json(requirements);
    } catch (error) {
        console.error('Error fetching claim requirements:', error);
        res.status(500).json({ message: 'Error fetching claim requirements', error: error.message });
    }
});

/**
 * @route PUT /api/insurance/claims/:id/requirements/:requirementId
 * @description Update requirement completion status for a claim
 */
router.put('/claims/:id/requirements/:requirementId', async (req, res) => {
    try {
        const { id, requirementId } = req.params;
        const userId = req.user?.id;
        const {
            isCompleted,
            documentPath,
            documentName,
            notes
        } = req.body;

        // Check if completion record exists
        const [existing] = await pool.execute(
            'SELECT completionId FROM claim_requirement_completions WHERE claimId = ? AND requirementId = ?',
            [id, requirementId]
        );

        if (existing.length > 0) {
            // Update existing
            await pool.execute(
                `UPDATE claim_requirement_completions
                 SET isCompleted = ?, completionDate = ?, completedBy = ?, documentPath = ?, documentName = ?, notes = ?, updatedAt = NOW()
                 WHERE claimId = ? AND requirementId = ?`,
                [
                    isCompleted ? 1 : 0,
                    isCompleted ? new Date() : null,
                    isCompleted ? userId : null,
                    documentPath || null,
                    documentName || null,
                    notes || null,
                    id,
                    requirementId
                ]
            );
        } else {
            // Create new
            await pool.execute(
                `INSERT INTO claim_requirement_completions (claimId, requirementId, isCompleted, completionDate, completedBy, documentPath, documentName, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    requirementId,
                    isCompleted ? 1 : 0,
                    isCompleted ? new Date() : null,
                    isCompleted ? userId : null,
                    documentPath || null,
                    documentName || null,
                    notes || null
                ]
            );
        }

        // Check if all required requirements are now met
        const [claim] = await pool.execute(`
            SELECT ic.*, pi.providerId
            FROM insurance_claims ic
            LEFT JOIN patient_insurance pi ON ic.patientInsuranceId = pi.patientInsuranceId
            WHERE ic.claimId = ?
        `, [id]);

        if (claim.length > 0) {
            const providerId = claim[0].providerId;
            const [requirements] = await pool.execute(`
                SELECT cr.requirementId, cr.isRequired, crc.isCompleted
                FROM claim_requirements cr
                INNER JOIN claim_requirement_templates crt ON cr.templateId = crt.templateId
                LEFT JOIN claim_requirement_completions crc ON cr.requirementId = crc.requirementId AND crc.claimId = ?
                WHERE crt.providerId = ? AND cr.isActive = 1 AND crt.isActive = 1
            `, [id, providerId]);

            const allRequiredMet = requirements
                .filter(r => r.isRequired)
                .every(r => r.isCompleted);

            // Update requirementsMet flag
            await pool.execute(
                'UPDATE insurance_claims SET requirementsMet = ? WHERE claimId = ?',
                [allRequiredMet ? 1 : 0, id]
            );
        }

        // Return updated requirement
        const [updated] = await pool.execute(`
            SELECT cr.*, crc.completionId, crc.isCompleted, crc.completionDate,
                   crc.documentPath, crc.documentName, crc.notes as completionNotes,
                   u1.firstName as completedByFirstName, u1.lastName as completedByLastName
            FROM claim_requirements cr
            LEFT JOIN claim_requirement_completions crc ON cr.requirementId = crc.requirementId AND crc.claimId = ?
            LEFT JOIN users u1 ON crc.completedBy = u1.userId
            WHERE cr.requirementId = ?
        `, [id, requirementId]);

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating claim requirement:', error);
        res.status(500).json({ message: 'Error updating claim requirement', error: error.message });
    }
});

/**
 * @route GET /api/insurance/providers/:id/requirements
 * @description Get requirement templates for a specific provider
 */
router.get('/providers/:id/requirements', async (req, res) => {
    try {
        const { id } = req.params;

        const [templates] = await pool.execute(
            'SELECT * FROM claim_requirement_templates WHERE providerId = ? AND isActive = 1',
            [id]
        );

        if (templates.length === 0) {
            return res.status(200).json([]);
        }

        const templateId = templates[0].templateId;

        const [requirements] = await pool.execute(
            'SELECT * FROM claim_requirements WHERE templateId = ? AND isActive = 1 ORDER BY displayOrder ASC',
            [templateId]
        );

        res.status(200).json({
            template: templates[0],
            requirements: requirements
        });
    } catch (error) {
        console.error('Error fetching provider requirements:', error);
        res.status(500).json({ message: 'Error fetching provider requirements', error: error.message });
    }
});

/**
 * @route POST /api/insurance/providers/:id/requirements/template
 * @description Create a requirement template for a provider
 */
router.post('/providers/:id/requirements/template', async (req, res) => {
    try {
        const { id } = req.params;
        const { templateName, description, isRequired = true } = req.body;
        const userId = req.user?.id;

        if (!templateName) {
            return res.status(400).json({ error: 'Template name is required' });
        }

        // Check if provider exists
        const [provider] = await pool.execute(
            'SELECT providerId FROM insurance_providers WHERE providerId = ?',
            [id]
        );

        if (provider.length === 0) {
            return res.status(404).json({ error: 'Insurance provider not found' });
        }

        // Check if template already exists
        const [existing] = await pool.execute(
            'SELECT templateId FROM claim_requirement_templates WHERE providerId = ? AND isActive = 1',
            [id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'A requirement template already exists for this provider. Update the existing template instead.' });
        }

        // Create template
        const [result] = await pool.execute(
            `INSERT INTO claim_requirement_templates (providerId, templateName, description, isActive, isRequired, createdBy)
             VALUES (?, ?, ?, TRUE, ?, ?)`,
            [id, templateName, description || null, isRequired, userId || null]
        );

        const [newTemplate] = await pool.execute(
            'SELECT * FROM claim_requirement_templates WHERE templateId = ?',
            [result.insertId]
        );

        res.status(201).json(newTemplate[0]);
    } catch (error) {
        console.error('Error creating requirement template:', error);
        res.status(500).json({ message: 'Error creating requirement template', error: error.message });
    }
});

/**
 * @route POST /api/insurance/providers/:id/requirements
 * @description Add a requirement to a provider's template
 */
router.post('/providers/:id/requirements', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            requirementCode,
            requirementName,
            description,
            requirementType = 'document',
            isRequired = true,
            displayOrder = 0
        } = req.body;

        if (!requirementName) {
            return res.status(400).json({ error: 'Requirement name is required' });
        }

        // Get template for this provider
        const [templates] = await pool.execute(
            'SELECT templateId FROM claim_requirement_templates WHERE providerId = ? AND isActive = 1',
            [id]
        );

        if (templates.length === 0) {
            return res.status(404).json({ error: 'No requirement template found for this provider. Create a template first.' });
        }

        const templateId = templates[0].templateId;

        // Insert requirement
        const [result] = await pool.execute(
            `INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [templateId, requirementCode || null, requirementName, description || null, requirementType, isRequired, displayOrder]
        );

        const [newRequirement] = await pool.execute(
            'SELECT * FROM claim_requirements WHERE requirementId = ?',
            [result.insertId]
        );

        res.status(201).json(newRequirement[0]);
    } catch (error) {
        console.error('Error creating requirement:', error);
        res.status(500).json({ message: 'Error creating requirement', error: error.message });
    }
});

/**
 * @route PUT /api/insurance/providers/:id/requirements/:requirementId
 * @description Update a requirement
 */
router.put('/providers/:id/requirements/:requirementId', async (req, res) => {
    try {
        const { requirementId } = req.params;
        const {
            requirementCode,
            requirementName,
            description,
            requirementType,
            isRequired,
            displayOrder,
            isActive
        } = req.body;

        // Update requirement
        const updateFields = [];
        const updateValues = [];

        if (requirementCode !== undefined) {
            updateFields.push('requirementCode = ?');
            updateValues.push(requirementCode);
        }
        if (requirementName !== undefined) {
            updateFields.push('requirementName = ?');
            updateValues.push(requirementName);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        if (requirementType !== undefined) {
            updateFields.push('requirementType = ?');
            updateValues.push(requirementType);
        }
        if (isRequired !== undefined) {
            updateFields.push('isRequired = ?');
            updateValues.push(isRequired);
        }
        if (displayOrder !== undefined) {
            updateFields.push('displayOrder = ?');
            updateValues.push(displayOrder);
        }
        if (isActive !== undefined) {
            updateFields.push('isActive = ?');
            updateValues.push(isActive);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updateValues.push(requirementId);

        await pool.execute(
            `UPDATE claim_requirements SET ${updateFields.join(', ')} WHERE requirementId = ?`,
            updateValues
        );

        const [updated] = await pool.execute(
            'SELECT * FROM claim_requirements WHERE requirementId = ?',
            [requirementId]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating requirement:', error);
        res.status(500).json({ message: 'Error updating requirement', error: error.message });
    }
});

/**
 * @route DELETE /api/insurance/providers/:id/requirements/:requirementId
 * @description Delete (deactivate) a requirement
 */
router.delete('/providers/:id/requirements/:requirementId', async (req, res) => {
    try {
        const { requirementId } = req.params;

        // Soft delete by setting isActive = FALSE
        await pool.execute(
            'UPDATE claim_requirements SET isActive = FALSE WHERE requirementId = ?',
            [requirementId]
        );

        res.status(200).json({ message: 'Requirement deactivated successfully' });
    } catch (error) {
        console.error('Error deleting requirement:', error);
        res.status(500).json({ message: 'Error deleting requirement', error: error.message });
    }
});

module.exports = router;

