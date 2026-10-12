// Cash management routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/cash/transactions
 * @description Get all cash transactions with optional filters
 */
router.get('/transactions', async (req, res) => {
    try {
        const { transactionType, startDate, endDate, search } = req.query;
        
        let query = `
            SELECT ct.*,
                   u.firstName, u.lastName
            FROM cash_transactions ct
            LEFT JOIN users u ON ct.handledBy = u.userId
            WHERE 1=1
        `;
        const params = [];

        if (transactionType) {
            query += ' AND ct.transactionType = ?';
            params.push(transactionType);
        }

        if (startDate) {
            query += ' AND ct.transactionDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND ct.transactionDate <= ?';
            params.push(endDate);
        }

        if (search) {
            query += ' AND (ct.transactionNumber LIKE ? OR ct.referenceNumber LIKE ? OR ct.notes LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY ct.transactionDate DESC, ct.createdAt DESC';
        
        const [rows] = await pool.execute(query, params);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching cash transactions:', error);
        res.status(500).json({ message: 'Error fetching cash transactions', error: error.message });
    }
});

/**
 * @route GET /api/cash/transactions/:id
 * @description Get a single cash transaction by ID
 */
router.get('/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute(`
            SELECT ct.*,
                   u.firstName, u.lastName
            FROM cash_transactions ct
            LEFT JOIN users u ON ct.handledBy = u.userId
            WHERE ct.cashTransactionId = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Cash transaction not found' });
        }
        
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching cash transaction:', error);
        res.status(500).json({ message: 'Error fetching cash transaction', error: error.message });
    }
});

/**
 * @route POST /api/cash/transactions
 * @description Create a new cash transaction
 */
router.post('/transactions', async (req, res) => {
    try {
        const { transactionDate, transactionType, amount, referenceNumber, referenceType, cashRegister, notes, handledBy } = req.body;
        const userId = req.user?.id || handledBy;

        if (!transactionDate || !transactionType || !amount || !userId) {
            return res.status(400).json({ error: 'Transaction date, type, amount, and handledBy are required' });
        }

        // Generate transaction number if not provided
        const [count] = await pool.execute(
            'SELECT COUNT(*) as count FROM cash_transactions WHERE DATE(createdAt) = CURDATE()'
        );
        const transNum = count[0].count + 1;
        const transactionNumber = `CASH-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(transNum).padStart(4, '0')}`;

        const [result] = await pool.execute(
            `INSERT INTO cash_transactions (transactionNumber, transactionDate, transactionType, amount, referenceNumber, referenceType, cashRegister, handledBy, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transactionNumber,
                transactionDate,
                transactionType,
                amount,
                referenceNumber || null,
                referenceType || null,
                cashRegister || null,
                userId,
                notes || null
            ]
        );
        
        const [newTransaction] = await pool.execute(`
            SELECT ct.*,
                   u.firstName, u.lastName
            FROM cash_transactions ct
            LEFT JOIN users u ON ct.handledBy = u.userId
            WHERE ct.cashTransactionId = ?
        `, [result.insertId]);
        
        res.status(201).json(newTransaction[0]);
    } catch (error) {
        console.error('Error creating cash transaction:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Transaction number already exists' });
        }
        res.status(500).json({ message: 'Error creating cash transaction', error: error.message });
    }
});

/**
 * @route PUT /api/cash/transactions/:id
 * @description Update a cash transaction
 */
router.put('/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionDate, transactionType, amount, referenceNumber, referenceType, cashRegister, notes } = req.body;

        // Check if transaction exists
        const [existing] = await pool.execute('SELECT cashTransactionId FROM cash_transactions WHERE cashTransactionId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Cash transaction not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (transactionDate !== undefined) { updates.push('transactionDate = ?'); values.push(transactionDate); }
        if (transactionType !== undefined) { updates.push('transactionType = ?'); values.push(transactionType); }
        if (amount !== undefined) { updates.push('amount = ?'); values.push(amount); }
        if (referenceNumber !== undefined) { updates.push('referenceNumber = ?'); values.push(referenceNumber); }
        if (referenceType !== undefined) { updates.push('referenceType = ?'); values.push(referenceType); }
        if (cashRegister !== undefined) { updates.push('cashRegister = ?'); values.push(cashRegister); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE cash_transactions SET ${updates.join(', ')} WHERE cashTransactionId = ?`,
            values
        );

        const [updated] = await pool.execute(`
            SELECT ct.*,
                   u.firstName, u.lastName
            FROM cash_transactions ct
            LEFT JOIN users u ON ct.handledBy = u.userId
            WHERE ct.cashTransactionId = ?
        `, [id]);
        
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating cash transaction:', error);
        res.status(500).json({ message: 'Error updating cash transaction', error: error.message });
    }
});

/**
 * @route DELETE /api/cash/transactions/:id
 * @description Delete a cash transaction
 */
router.delete('/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if transaction exists
        const [existing] = await pool.execute('SELECT cashTransactionId FROM cash_transactions WHERE cashTransactionId = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Cash transaction not found' });
        }

        await pool.execute('DELETE FROM cash_transactions WHERE cashTransactionId = ?', [id]);
        
        res.status(200).json({ message: 'Cash transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting cash transaction:', error);
        res.status(500).json({ message: 'Error deleting cash transaction', error: error.message });
    }
});

/**
 * @route GET /api/cash/accounts
 * @description Get all cash/bank accounts (Asset accounts from chart of accounts)
 */
router.get('/accounts', async (req, res) => {
    try {
        const { status, search } = req.query;
        
        let query = `
            SELECT accountId, accountCode, accountName, accountType, isActive, description, createdAt
            FROM accounts
            WHERE accountType = 'Asset'
        `;
        const params = [];

        if (status === 'active') {
            query += ' AND isActive = 1';
        } else if (status === 'inactive') {
            query += ' AND isActive = 0';
        }

        if (search) {
            query += ' AND (accountName LIKE ? OR accountCode LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY accountName ASC';
        
        const [rows] = await pool.execute(query, params);
        
        // Calculate balances for each account (simplified - would need actual balance tracking)
        // For now, return accounts with placeholder balance
        const accounts = rows.map(account => ({
            ...account,
            balance: 0, // This would be calculated from transactions in a real system
            lastTransaction: null
        }));
        
        res.status(200).json(accounts);
    } catch (error) {
        console.error('Error fetching cash accounts:', error);
        res.status(500).json({ message: 'Error fetching cash accounts', error: error.message });
    }
});

/**
 * @route GET /api/cash/stats/summary
 * @description Get summary statistics for cash management
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as totalTransactions,
                SUM(CASE WHEN transactionType = 'receipt' THEN amount ELSE 0 END) as totalReceipts,
                SUM(CASE WHEN transactionType = 'payment' THEN amount ELSE 0 END) as totalPayments,
                SUM(CASE WHEN transactionType = 'receipt' THEN amount ELSE -amount END) as netCashFlow,
                COUNT(DISTINCT DATE(transactionDate)) as activeDays
            FROM cash_transactions
            WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);
        
        res.status(200).json(stats[0] || {
            totalTransactions: 0,
            totalReceipts: 0,
            totalPayments: 0,
            netCashFlow: 0,
            activeDays: 0
        });
    } catch (error) {
        console.error('Error fetching cash stats:', error);
        res.status(500).json({ message: 'Error fetching cash stats', error: error.message });
    }
});

module.exports = router;

