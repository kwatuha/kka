// Budget routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/budgets
 * @description Get all budgets with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { status, departmentId, budgetPeriod, search } = req.query;
        
        let query = `
            SELECT b.*,
                   d.departmentName,
                   a.accountName, a.accountCode
            FROM budgets b
            LEFT JOIN departments d ON b.departmentId = d.departmentId
            LEFT JOIN accounts a ON b.accountId = a.accountId
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }

        if (departmentId) {
            query += ' AND b.departmentId = ?';
            params.push(departmentId);
        }

        if (budgetPeriod) {
            query += ' AND b.budgetPeriod = ?';
            params.push(budgetPeriod);
        }

        if (search) {
            query += ' AND (b.budgetName LIKE ? OR b.budgetCode LIKE ? OR d.departmentName LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY b.startDate DESC, b.createdAt DESC';
        
        const [rows] = await pool.execute(query, params);
        
        // Calculate remaining amount for each budget
        const budgets = rows.map(budget => ({
            ...budget,
            remainingAmount: parseFloat(budget.allocatedAmount) - parseFloat(budget.spentAmount || 0)
        }));
        
        res.status(200).json(budgets);
    } catch (error) {
        console.error('Error fetching budgets:', error);
        res.status(500).json({ message: 'Error fetching budgets', error: error.message });
    }
});

/**
 * @route GET /api/budgets/:id
 * @description Get a single budget by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute(`
            SELECT b.*,
                   d.departmentName,
                   a.accountName, a.accountCode
            FROM budgets b
            LEFT JOIN departments d ON b.departmentId = d.departmentId
            LEFT JOIN accounts a ON b.accountId = a.accountId
            WHERE b.budgetId = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Budget not found' });
        }
        
        const budget = rows[0];
        budget.remainingAmount = parseFloat(budget.allocatedAmount) - parseFloat(budget.spentAmount || 0);
        
        res.status(200).json(budget);
    } catch (error) {
        console.error('Error fetching budget:', error);
        res.status(500).json({ message: 'Error fetching budget', error: error.message });
    }
});

/**
 * @route POST /api/budgets
 * @description Create a new budget
 */
router.post('/', async (req, res) => {
    try {
        const { budgetCode, budgetName, departmentId, accountId, budgetPeriod, startDate, endDate, allocatedAmount, notes, status = 'draft' } = req.body;
        const userId = req.user?.id;

        if (!budgetName || !startDate || !endDate || !allocatedAmount) {
            return res.status(400).json({ error: 'Budget name, start date, end date, and allocated amount are required' });
        }

        // Generate budget code if not provided
        let finalBudgetCode = budgetCode;
        if (!finalBudgetCode) {
            const [count] = await pool.execute('SELECT COUNT(*) as count FROM budgets WHERE budgetPeriod = ?', [budgetPeriod || new Date().getFullYear().toString()]);
            const budgetNum = count[0].count + 1;
            finalBudgetCode = `BUD-${budgetPeriod || new Date().getFullYear()}-${String(budgetNum).padStart(4, '0')}`;
        } else {
            // Check if code already exists
            const [existing] = await pool.execute('SELECT budgetId FROM budgets WHERE budgetCode = ?', [finalBudgetCode]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Budget code already exists' });
            }
        }

        const [result] = await pool.execute(
            `INSERT INTO budgets (budgetCode, budgetName, departmentId, accountId, budgetPeriod, startDate, endDate, allocatedAmount, status, notes, createdBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalBudgetCode,
                budgetName,
                departmentId || null,
                accountId || null,
                budgetPeriod || null,
                startDate,
                endDate,
                allocatedAmount,
                status,
                notes || null,
                userId || null
            ]
        );
        
        const [newBudget] = await pool.execute(`
            SELECT b.*,
                   d.departmentName,
                   a.accountName, a.accountCode
            FROM budgets b
            LEFT JOIN departments d ON b.departmentId = d.departmentId
            LEFT JOIN accounts a ON b.accountId = a.accountId
            WHERE b.budgetId = ?
        `, [result.insertId]);
        
        const budget = newBudget[0];
        budget.remainingAmount = parseFloat(budget.allocatedAmount) - parseFloat(budget.spentAmount || 0);
        
        res.status(201).json(budget);
    } catch (error) {
        console.error('Error creating budget:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Budget code already exists' });
        }
        res.status(500).json({ message: 'Error creating budget', error: error.message });
    }
});

/**
 * @route PUT /api/budgets/:id
 * @description Update a budget
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { budgetCode, budgetName, departmentId, accountId, budgetPeriod, startDate, endDate, allocatedAmount, spentAmount, status, notes, approvedBy, approvedDate } = req.body;

        // Check if budget exists
        const [existing] = await pool.execute('SELECT budgetId FROM budgets WHERE budgetId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Budget not found' });
        }

        // Check for duplicate budget code if it's being changed
        if (budgetCode) {
            const [duplicate] = await pool.execute(
                'SELECT budgetId FROM budgets WHERE budgetCode = ? AND budgetId != ?',
                [budgetCode, id]
            );
            if (duplicate.length > 0) {
                return res.status(400).json({ error: 'Budget code already exists' });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (budgetCode !== undefined) { updates.push('budgetCode = ?'); values.push(budgetCode); }
        if (budgetName !== undefined) { updates.push('budgetName = ?'); values.push(budgetName); }
        if (departmentId !== undefined) { updates.push('departmentId = ?'); values.push(departmentId); }
        if (accountId !== undefined) { updates.push('accountId = ?'); values.push(accountId); }
        if (budgetPeriod !== undefined) { updates.push('budgetPeriod = ?'); values.push(budgetPeriod); }
        if (startDate !== undefined) { updates.push('startDate = ?'); values.push(startDate); }
        if (endDate !== undefined) { updates.push('endDate = ?'); values.push(endDate); }
        if (allocatedAmount !== undefined) { updates.push('allocatedAmount = ?'); values.push(allocatedAmount); }
        if (spentAmount !== undefined) { updates.push('spentAmount = ?'); values.push(spentAmount); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
        if (approvedBy !== undefined) { updates.push('approvedBy = ?'); values.push(approvedBy); }
        if (approvedDate !== undefined) { updates.push('approvedDate = ?'); values.push(approvedDate); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE budgets SET ${updates.join(', ')}, updatedAt = NOW() WHERE budgetId = ?`,
            values
        );

        const [updated] = await pool.execute(`
            SELECT b.*,
                   d.departmentName,
                   a.accountName, a.accountCode
            FROM budgets b
            LEFT JOIN departments d ON b.departmentId = d.departmentId
            LEFT JOIN accounts a ON b.accountId = a.accountId
            WHERE b.budgetId = ?
        `, [id]);
        
        const budget = updated[0];
        budget.remainingAmount = parseFloat(budget.allocatedAmount) - parseFloat(budget.spentAmount || 0);
        
        res.status(200).json(budget);
    } catch (error) {
        console.error('Error updating budget:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Budget code already exists' });
        }
        res.status(500).json({ message: 'Error updating budget', error: error.message });
    }
});

/**
 * @route DELETE /api/budgets/:id
 * @description Delete a budget
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if budget exists
        const [existing] = await pool.execute('SELECT budgetId, status FROM budgets WHERE budgetId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Budget not found' });
        }

        // Only allow deletion of draft budgets
        if (existing[0].status !== 'draft') {
            return res.status(400).json({ error: 'Only draft budgets can be deleted' });
        }

        await pool.execute('DELETE FROM budgets WHERE budgetId = ?', [id]);
        
        res.status(200).json({ message: 'Budget deleted successfully' });
    } catch (error) {
        console.error('Error deleting budget:', error);
        res.status(500).json({ message: 'Error deleting budget', error: error.message });
    }
});

/**
 * @route GET /api/budgets/stats/summary
 * @description Get summary statistics for budgets
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as totalBudgets,
                SUM(allocatedAmount) as totalAllocated,
                SUM(spentAmount) as totalSpent,
                SUM(allocatedAmount - COALESCE(spentAmount, 0)) as totalRemaining,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as activeCount,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draftCount,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedCount,
                COUNT(CASE WHEN status = 'closed' THEN 1 END) as closedCount,
                SUM(CASE WHEN status = 'active' THEN allocatedAmount ELSE 0 END) as activeAllocated,
                SUM(CASE WHEN status = 'active' THEN spentAmount ELSE 0 END) as activeSpent
            FROM budgets
        `);
        
        res.status(200).json(stats[0] || {
            totalBudgets: 0,
            totalAllocated: 0,
            totalSpent: 0,
            totalRemaining: 0,
            activeCount: 0,
            draftCount: 0,
            approvedCount: 0,
            closedCount: 0,
            activeAllocated: 0,
            activeSpent: 0,
        });
    } catch (error) {
        console.error('Error fetching budget stats:', error);
        res.status(500).json({ message: 'Error fetching budget stats', error: error.message });
    }
});

module.exports = router;

