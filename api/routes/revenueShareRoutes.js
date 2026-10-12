// Revenue Share management routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ============================================
// REVENUE SHARE RULES
// ============================================

/**
 * @route GET /api/revenue-share/rules
 * @description Get all revenue share rules with optional filters
 */
router.get('/rules', async (req, res) => {
    try {
        const { ruleType, departmentId, status, search } = req.query;
        
        let query = `
            SELECT rsr.*,
                   d.departmentName
            FROM revenue_share_rules rsr
            LEFT JOIN departments d ON rsr.departmentId = d.departmentId
            WHERE 1=1
        `;
        const params = [];

        if (ruleType) {
            query += ' AND rsr.ruleType = ?';
            params.push(ruleType);
        }

        if (departmentId) {
            query += ' AND rsr.departmentId = ?';
            params.push(departmentId);
        }

        if (status === 'active') {
            query += ' AND rsr.isActive = 1 AND (rsr.effectiveTo IS NULL OR rsr.effectiveTo >= CURDATE())';
        } else if (status === 'inactive') {
            query += ' AND (rsr.isActive = 0 OR rsr.effectiveTo < CURDATE())';
        }

        if (search) {
            query += ' AND (rsr.ruleName LIKE ? OR rsr.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY rsr.effectiveFrom DESC, rsr.createdAt DESC';
        
        const [rows] = await pool.execute(query, params);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching revenue share rules:', error);
        res.status(500).json({ message: 'Error fetching revenue share rules', error: error.message });
    }
});

/**
 * @route GET /api/revenue-share/rules/:id
 * @description Get a single revenue share rule by ID
 */
router.get('/rules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute(`
            SELECT rsr.*,
                   d.departmentName
            FROM revenue_share_rules rsr
            LEFT JOIN departments d ON rsr.departmentId = d.departmentId
            WHERE rsr.ruleId = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Revenue share rule not found' });
        }
        
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching revenue share rule:', error);
        res.status(500).json({ message: 'Error fetching revenue share rule', error: error.message });
    }
});

/**
 * @route POST /api/revenue-share/rules
 * @description Create a new revenue share rule
 */
router.post('/rules', async (req, res) => {
    try {
        const {
            ruleName,
            ruleType,
            departmentId,
            serviceId,
            serviceCategory,
            allocationPercentage,
            effectiveFrom,
            effectiveTo,
            isActive = true,
            description,
            notes
        } = req.body;

        if (!ruleName || !allocationPercentage || !effectiveFrom) {
            return res.status(400).json({ error: 'Rule name, allocation percentage, and effective from date are required' });
        }

        if (allocationPercentage < 0 || allocationPercentage > 100) {
            return res.status(400).json({ error: 'Allocation percentage must be between 0 and 100' });
        }

        const [result] = await pool.execute(
            `INSERT INTO revenue_share_rules (
                ruleName, ruleType, departmentId, serviceId, serviceCategory,
                allocationPercentage, effectiveFrom, effectiveTo, isActive, description, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ruleName,
                ruleType || 'department',
                departmentId || null,
                serviceId || null,
                serviceCategory || null,
                allocationPercentage,
                effectiveFrom,
                effectiveTo || null,
                isActive,
                description || null,
                notes || null
            ]
        );
        
        const [newRule] = await pool.execute(`
            SELECT rsr.*,
                   d.departmentName
            FROM revenue_share_rules rsr
            LEFT JOIN departments d ON rsr.departmentId = d.departmentId
            WHERE rsr.ruleId = ?
        `, [result.insertId]);
        
        res.status(201).json(newRule[0]);
    } catch (error) {
        console.error('Error creating revenue share rule:', error);
        res.status(500).json({ message: 'Error creating revenue share rule', error: error.message });
    }
});

/**
 * @route PUT /api/revenue-share/rules/:id
 * @description Update a revenue share rule
 */
router.put('/rules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            ruleName,
            ruleType,
            departmentId,
            serviceId,
            serviceCategory,
            allocationPercentage,
            effectiveFrom,
            effectiveTo,
            isActive,
            description,
            notes
        } = req.body;

        // Check if rule exists
        const [existing] = await pool.execute('SELECT ruleId FROM revenue_share_rules WHERE ruleId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Revenue share rule not found' });
        }

        if (allocationPercentage !== undefined && (allocationPercentage < 0 || allocationPercentage > 100)) {
            return res.status(400).json({ error: 'Allocation percentage must be between 0 and 100' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (ruleName !== undefined) { updates.push('ruleName = ?'); values.push(ruleName); }
        if (ruleType !== undefined) { updates.push('ruleType = ?'); values.push(ruleType); }
        if (departmentId !== undefined) { updates.push('departmentId = ?'); values.push(departmentId); }
        if (serviceId !== undefined) { updates.push('serviceId = ?'); values.push(serviceId); }
        if (serviceCategory !== undefined) { updates.push('serviceCategory = ?'); values.push(serviceCategory); }
        if (allocationPercentage !== undefined) { updates.push('allocationPercentage = ?'); values.push(allocationPercentage); }
        if (effectiveFrom !== undefined) { updates.push('effectiveFrom = ?'); values.push(effectiveFrom); }
        if (effectiveTo !== undefined) { updates.push('effectiveTo = ?'); values.push(effectiveTo); }
        if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE revenue_share_rules SET ${updates.join(', ')}, updatedAt = NOW() WHERE ruleId = ?`,
            values
        );

        const [updated] = await pool.execute(`
            SELECT rsr.*,
                   d.departmentName
            FROM revenue_share_rules rsr
            LEFT JOIN departments d ON rsr.departmentId = d.departmentId
            WHERE rsr.ruleId = ?
        `, [id]);
        
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating revenue share rule:', error);
        res.status(500).json({ message: 'Error updating revenue share rule', error: error.message });
    }
});

/**
 * @route DELETE /api/revenue-share/rules/:id
 * @description Delete a revenue share rule
 */
router.delete('/rules/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if rule exists
        const [existing] = await pool.execute('SELECT ruleId FROM revenue_share_rules WHERE ruleId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Revenue share rule not found' });
        }

        await pool.execute('DELETE FROM revenue_share_rules WHERE ruleId = ?', [id]);
        
        res.status(200).json({ message: 'Revenue share rule deleted successfully' });
    } catch (error) {
        console.error('Error deleting revenue share rule:', error);
        res.status(500).json({ message: 'Error deleting revenue share rule', error: error.message });
    }
});

// ============================================
// REVENUE SHARE DISTRIBUTIONS
// ============================================

/**
 * @route GET /api/revenue-share/distributions
 * @description Get all revenue share distributions with optional filters
 */
router.get('/distributions', async (req, res) => {
    try {
        const { status, startDate, endDate, search } = req.query;
        
        let query = `
            SELECT rsd.*,
                   u1.firstName as createdByFirstName, u1.lastName as createdByLastName,
                   u2.firstName as approvedByFirstName, u2.lastName as approvedByLastName
            FROM revenue_share_distributions rsd
            LEFT JOIN users u1 ON rsd.createdBy = u1.userId
            LEFT JOIN users u2 ON rsd.approvedBy = u2.userId
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND rsd.status = ?';
            params.push(status);
        }

        if (startDate) {
            query += ' AND rsd.distributionDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND rsd.distributionDate <= ?';
            params.push(endDate);
        }

        if (search) {
            query += ' AND (rsd.distributionNumber LIKE ? OR rsd.notes LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY rsd.distributionDate DESC, rsd.createdAt DESC';
        
        const [rows] = await pool.execute(query, params);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching revenue share distributions:', error);
        res.status(500).json({ message: 'Error fetching revenue share distributions', error: error.message });
    }
});

/**
 * @route GET /api/revenue-share/distributions/:id
 * @description Get a single revenue share distribution by ID with items
 */
router.get('/distributions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [distribution] = await pool.execute(`
            SELECT rsd.*,
                   u1.firstName as createdByFirstName, u1.lastName as createdByLastName,
                   u2.firstName as approvedByFirstName, u2.lastName as approvedByLastName
            FROM revenue_share_distributions rsd
            LEFT JOIN users u1 ON rsd.createdBy = u1.userId
            LEFT JOIN users u2 ON rsd.approvedBy = u2.userId
            WHERE rsd.distributionId = ?
        `, [id]);
        
        if (distribution.length === 0) {
            return res.status(404).json({ message: 'Revenue share distribution not found' });
        }

        const [items] = await pool.execute(`
            SELECT rsdi.*,
                   d.departmentName
            FROM revenue_share_distribution_items rsdi
            LEFT JOIN departments d ON rsdi.departmentId = d.departmentId
            WHERE rsdi.distributionId = ?
            ORDER BY rsdi.distributedAmount DESC
        `, [id]);
        
        res.status(200).json({
            ...distribution[0],
            items: items
        });
    } catch (error) {
        console.error('Error fetching revenue share distribution:', error);
        res.status(500).json({ message: 'Error fetching revenue share distribution', error: error.message });
    }
});

/**
 * @route POST /api/revenue-share/distributions
 * @description Create a new revenue share distribution
 */
router.post('/distributions', async (req, res) => {
    try {
        const {
            distributionNumber,
            distributionDate,
            periodStart,
            periodEnd,
            totalRevenue,
            totalDistributed,
            status = 'draft',
            notes,
            items
        } = req.body;

        if (!distributionDate || !periodStart || !periodEnd || !totalRevenue) {
            return res.status(400).json({ error: 'Distribution date, period start, period end, and total revenue are required' });
        }

        // Generate distribution number if not provided
        let finalDistributionNumber = distributionNumber;
        if (!finalDistributionNumber) {
            const [count] = await pool.execute('SELECT COUNT(*) as count FROM revenue_share_distributions');
            const distNum = count[0].count + 1;
            finalDistributionNumber = `RSD-${String(distNum).padStart(6, '0')}`;
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [result] = await connection.execute(
                `INSERT INTO revenue_share_distributions (
                    distributionNumber, distributionDate, periodStart, periodEnd,
                    totalRevenue, totalDistributed, status, notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    finalDistributionNumber,
                    distributionDate,
                    periodStart,
                    periodEnd,
                    totalRevenue,
                    totalDistributed || totalRevenue,
                    status,
                    notes || null
                ]
            );

            const distributionId = result.insertId;

            // Insert distribution items if provided
            if (items && Array.isArray(items) && items.length > 0) {
                for (const item of items) {
                    await connection.execute(
                        `INSERT INTO revenue_share_distribution_items (
                            distributionId, departmentId, serviceCategory, ruleId,
                            revenueAmount, allocationPercentage, distributedAmount, notes
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            distributionId,
                            item.departmentId || null,
                            item.serviceCategory || null,
                            item.ruleId || null,
                            item.revenueAmount || 0,
                            item.allocationPercentage || 0,
                            item.distributedAmount || 0,
                            item.notes || null
                        ]
                    );
                }
            }

            await connection.commit();

            const [newDistribution] = await pool.execute(`
                SELECT rsd.*,
                       u1.firstName as createdByFirstName, u1.lastName as createdByLastName
                FROM revenue_share_distributions rsd
                LEFT JOIN users u1 ON rsd.createdBy = u1.userId
                WHERE rsd.distributionId = ?
            `, [distributionId]);
            
            res.status(201).json(newDistribution[0]);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error creating revenue share distribution:', error);
        res.status(500).json({ message: 'Error creating revenue share distribution', error: error.message });
    }
});

/**
 * @route PUT /api/revenue-share/distributions/:id
 * @description Update a revenue share distribution
 */
router.put('/distributions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            distributionDate,
            periodStart,
            periodEnd,
            totalRevenue,
            totalDistributed,
            status,
            approvedBy,
            approvedDate,
            distributedDate,
            notes
        } = req.body;

        // Check if distribution exists
        const [existing] = await pool.execute('SELECT distributionId FROM revenue_share_distributions WHERE distributionId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Revenue share distribution not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (distributionDate !== undefined) { updates.push('distributionDate = ?'); values.push(distributionDate); }
        if (periodStart !== undefined) { updates.push('periodStart = ?'); values.push(periodStart); }
        if (periodEnd !== undefined) { updates.push('periodEnd = ?'); values.push(periodEnd); }
        if (totalRevenue !== undefined) { updates.push('totalRevenue = ?'); values.push(totalRevenue); }
        if (totalDistributed !== undefined) { updates.push('totalDistributed = ?'); values.push(totalDistributed); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (approvedBy !== undefined) { updates.push('approvedBy = ?'); values.push(approvedBy); }
        if (approvedDate !== undefined) { updates.push('approvedDate = ?'); values.push(approvedDate); }
        if (distributedDate !== undefined) { updates.push('distributedDate = ?'); values.push(distributedDate); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE revenue_share_distributions SET ${updates.join(', ')}, updatedAt = NOW() WHERE distributionId = ?`,
            values
        );

        const [updated] = await pool.execute(`
            SELECT rsd.*,
                   u1.firstName as createdByFirstName, u1.lastName as createdByLastName,
                   u2.firstName as approvedByFirstName, u2.lastName as approvedByLastName
            FROM revenue_share_distributions rsd
            LEFT JOIN users u1 ON rsd.createdBy = u1.userId
            LEFT JOIN users u2 ON rsd.approvedBy = u2.userId
            WHERE rsd.distributionId = ?
        `, [id]);
        
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating revenue share distribution:', error);
        res.status(500).json({ message: 'Error updating revenue share distribution', error: error.message });
    }
});

/**
 * @route DELETE /api/revenue-share/distributions/:id
 * @description Delete a revenue share distribution
 */
router.delete('/distributions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if distribution exists
        const [existing] = await pool.execute('SELECT distributionId FROM revenue_share_distributions WHERE distributionId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Revenue share distribution not found' });
        }

        // Check if distribution is already distributed (cascade delete will handle items)
        if (existing[0].status === 'distributed') {
            return res.status(400).json({ error: 'Cannot delete a distributed revenue share. Cancel it instead.' });
        }

        await pool.execute('DELETE FROM revenue_share_distributions WHERE distributionId = ?', [id]);
        
        res.status(200).json({ message: 'Revenue share distribution deleted successfully' });
    } catch (error) {
        console.error('Error deleting revenue share distribution:', error);
        res.status(500).json({ message: 'Error deleting revenue share distribution', error: error.message });
    }
});

/**
 * @route GET /api/revenue-share/stats/summary
 * @description Get summary statistics for revenue share
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM revenue_share_rules WHERE isActive = 1 AND (effectiveTo IS NULL OR effectiveTo >= CURDATE())) as activeRules,
                (SELECT COUNT(*) FROM revenue_share_distributions WHERE status = 'draft') as draftDistributions,
                (SELECT COUNT(*) FROM revenue_share_distributions WHERE status = 'approved') as approvedDistributions,
                (SELECT COUNT(*) FROM revenue_share_distributions WHERE status = 'distributed') as distributedDistributions,
                (SELECT COALESCE(SUM(totalRevenue), 0) FROM revenue_share_distributions WHERE status IN ('approved', 'distributed')) as totalRevenue,
                (SELECT COALESCE(SUM(totalDistributed), 0) FROM revenue_share_distributions WHERE status IN ('approved', 'distributed')) as totalDistributed
            FROM dual
        `);
        
        res.status(200).json(stats[0] || {
            activeRules: 0,
            draftDistributions: 0,
            approvedDistributions: 0,
            distributedDistributions: 0,
            totalRevenue: 0,
            totalDistributed: 0
        });
    } catch (error) {
        console.error('Error fetching revenue share stats:', error);
        res.status(500).json({ message: 'Error fetching revenue share stats', error: error.message });
    }
});

module.exports = router;

