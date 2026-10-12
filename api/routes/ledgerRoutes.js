// Ledger routes - Chart of Accounts and Journal Entries
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { toDateOnly } = require('../lib/dateOnly');

// ============================================
// CHART OF ACCOUNTS
// ============================================

/**
 * @route GET /api/ledger/accounts
 * @description Get all accounts (chart of accounts)
 */
router.get('/accounts', async (req, res) => {
    try {
        const { search, accountType, asOfDate, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        const reportDate = asOfDate || new Date().toISOString().split('T')[0];

        let query = `
            SELECT
                a.*,
                COALESCE(SUM(CASE
                    WHEN t.debitAccountId = a.accountId AND t.transactionDate <= ? THEN t.amount
                    ELSE 0
                END), 0) -
                COALESCE(SUM(CASE
                    WHEN t.creditAccountId = a.accountId AND t.transactionDate <= ? THEN t.amount
                    ELSE 0
                END), 0) as balance,
                COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId AND t.transactionDate <= ? THEN t.amount ELSE 0 END), 0) as totalDebits,
                COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId AND t.transactionDate <= ? THEN t.amount ELSE 0 END), 0) as totalCredits,
                MAX(t.transactionDate) as lastTransaction
            FROM accounts a
            LEFT JOIN transactions t ON (
                (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
                AND t.transactionDate <= ?
            )
            WHERE a.isActive = 1
        `;
        const params = [reportDate, reportDate, reportDate, reportDate, reportDate];

        if (search) {
            query += ` AND (
                a.accountCode LIKE ? OR
                a.accountName LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (accountType) {
            query += ` AND a.accountType = ?`;
            params.push(accountType);
        }

        query += ` GROUP BY a.accountId ORDER BY a.accountCode LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ message: 'Error fetching accounts', error: error.message });
    }
});

/**
 * @route GET /api/ledger/accounts/:id
 * @description Get a single account with balance as of a specific date
 */
router.get('/accounts/:id', async (req, res) => {
    try {
        const { asOfDate } = req.query;
        const reportDate = asOfDate || new Date().toISOString().split('T')[0];

        const [rows] = await pool.execute(
            `SELECT
                a.*,
                COALESCE(SUM(CASE
                    WHEN t.debitAccountId = a.accountId AND t.transactionDate <= ? THEN t.amount
                    ELSE 0
                END), 0) -
                COALESCE(SUM(CASE
                    WHEN t.creditAccountId = a.accountId AND t.transactionDate <= ? THEN t.amount
                    ELSE 0
                END), 0) as balance,
                COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId AND t.transactionDate <= ? THEN t.amount ELSE 0 END), 0) as totalDebits,
                COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId AND t.transactionDate <= ? THEN t.amount ELSE 0 END), 0) as totalCredits,
                MAX(t.transactionDate) as lastTransaction
            FROM accounts a
            LEFT JOIN transactions t ON (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
            WHERE a.accountId = ? AND a.isActive = 1
            GROUP BY a.accountId`,
            [reportDate, reportDate, reportDate, reportDate, req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.status(200).json({ ...rows[0], asOfDate: reportDate });
    } catch (error) {
        console.error('Error fetching account:', error);
        res.status(500).json({ message: 'Error fetching account', error: error.message });
    }
});

/**
 * @route GET /api/ledger/accounts/:id/transactions
 * @description Get transactions for a specific account with date filter
 */
router.get('/accounts/:id/transactions', async (req, res) => {
    try {
        const { startDate, endDate, asOfDate, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT
                t.*,
                da.accountCode as debitAccountCode,
                da.accountName as debitAccountName,
                ca.accountCode as creditAccountCode,
                ca.accountName as creditAccountName,
                u.firstName as postedByFirstName,
                u.lastName as postedByLastName
            FROM transactions t
            LEFT JOIN accounts da ON t.debitAccountId = da.accountId
            LEFT JOIN accounts ca ON t.creditAccountId = ca.accountId
            LEFT JOIN users u ON t.postedBy = u.userId
            WHERE (t.debitAccountId = ? OR t.creditAccountId = ?)
        `;
        const params = [req.params.id, req.params.id];

        if (asOfDate) {
            query += ` AND t.transactionDate <= ?`;
            params.push(asOfDate);
        } else {
            if (startDate) {
                query += ` AND t.transactionDate >= ?`;
                params.push(startDate);
            }
            if (endDate) {
                query += ` AND t.transactionDate <= ?`;
                params.push(endDate);
            }
        }

        query += ` ORDER BY t.transactionDate DESC, t.createdAt DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching account transactions:', error);
        res.status(500).json({ message: 'Error fetching account transactions', error: error.message });
    }
});

/**
 * @route POST /api/ledger/accounts
 * @description Create a new account
 */
router.post('/accounts', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            accountCode,
            accountName,
            accountType,
            parentAccountId,
            description
        } = req.body;

        if (!accountCode || !accountName || !accountType) {
            return res.status(400).json({ message: 'Account code, name, and type are required' });
        }

        const [result] = await connection.execute(
            `INSERT INTO accounts (
                accountCode, accountName, accountType, parentAccountId, description
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                accountCode,
                accountName,
                accountType,
                parentAccountId || null,
                description || null
            ]
        );

        const [newAccount] = await connection.execute(
            'SELECT * FROM accounts WHERE accountId = ?',
            [result.insertId]
        );

        await connection.commit();
        res.status(201).json(newAccount[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating account:', error);
        res.status(500).json({ message: 'Error creating account', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/ledger/accounts/:id
 * @description Update an account
 */
router.put('/accounts/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            accountCode,
            accountName,
            accountType,
            parentAccountId,
            description,
            isActive
        } = req.body;

        // Check if account exists
        const [existing] = await connection.execute(
            'SELECT * FROM accounts WHERE accountId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Account not found' });
        }

        await connection.execute(
            `UPDATE accounts SET
                accountCode = ?,
                accountName = ?,
                accountType = ?,
                parentAccountId = ?,
                description = ?,
                isActive = ?
            WHERE accountId = ?`,
            [
                accountCode !== undefined ? accountCode : existing[0].accountCode,
                accountName !== undefined ? accountName : existing[0].accountName,
                accountType !== undefined ? accountType : existing[0].accountType,
                parentAccountId !== undefined ? parentAccountId : existing[0].parentAccountId,
                description !== undefined ? description : existing[0].description,
                isActive !== undefined ? isActive : existing[0].isActive,
                req.params.id
            ]
        );

        const [updatedAccount] = await connection.execute(
            'SELECT * FROM accounts WHERE accountId = ?',
            [req.params.id]
        );

        await connection.commit();
        res.status(200).json(updatedAccount[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating account:', error);
        res.status(500).json({ message: 'Error updating account', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/ledger/accounts/:id
 * @description Delete an account (only if it has no transactions or sub-accounts)
 */
router.delete('/accounts/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if account exists
        const [existing] = await connection.execute(
            'SELECT * FROM accounts WHERE accountId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Account not found' });
        }

        // Check if account has any transactions
        const [transactions] = await connection.execute(
            'SELECT COUNT(*) as count FROM transactions WHERE debitAccountId = ? OR creditAccountId = ?',
            [req.params.id, req.params.id]
        );

        if (transactions[0].count > 0) {
            await connection.rollback();
            return res.status(400).json({
                message: 'Cannot delete account with existing transactions. Use deactivate instead.',
                transactionCount: transactions[0].count,
                suggestion: 'Set isActive = false to deactivate the account'
            });
        }

        // Check if account has child accounts
        const [childAccounts] = await connection.execute(
            'SELECT COUNT(*) as count FROM accounts WHERE parentAccountId = ? AND isActive = 1',
            [req.params.id]
        );

        if (childAccounts[0].count > 0) {
            await connection.rollback();
            return res.status(400).json({
                message: 'Cannot delete account with active sub-accounts. Please delete or reassign sub-accounts first.',
                subAccountCount: childAccounts[0].count
            });
        }

        // Hard delete (since no transactions or sub-accounts exist)
        await connection.execute(
            'DELETE FROM accounts WHERE accountId = ?',
            [req.params.id]
        );

        await connection.commit();
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Error deleting account', error: error.message });
    } finally {
        connection.release();
    }
});

// ============================================
// JOURNAL ENTRIES (TRANSACTIONS)
// ============================================

/**
 * @route GET /api/ledger/transactions
 * @description Get all transactions (journal entries)
 */
router.get('/transactions', async (req, res) => {
    try {
        const { search, startDate, endDate, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT
                t.*,
                da.accountCode as debitAccountCode,
                da.accountName as debitAccountName,
                ca.accountCode as creditAccountCode,
                ca.accountName as creditAccountName,
                u.firstName as postedByFirstName,
                u.lastName as postedByLastName
            FROM transactions t
            LEFT JOIN accounts da ON t.debitAccountId = da.accountId
            LEFT JOIN accounts ca ON t.creditAccountId = ca.accountId
            LEFT JOIN users u ON t.postedBy = u.userId
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (
                t.transactionNumber LIKE ? OR
                t.description LIKE ? OR
                t.referenceNumber LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (startDate) {
            query += ` AND t.transactionDate >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND t.transactionDate <= ?`;
            params.push(endDate);
        }

        query += ` ORDER BY t.transactionDate DESC, t.createdAt DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
});

/**
 * @route GET /api/ledger/transactions/:id
 * @description Get a single transaction
 */
router.get('/transactions/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                t.*,
                da.accountCode as debitAccountCode,
                da.accountName as debitAccountName,
                ca.accountCode as creditAccountCode,
                ca.accountName as creditAccountName,
                u.firstName as postedByFirstName,
                u.lastName as postedByLastName
            FROM transactions t
            LEFT JOIN accounts da ON t.debitAccountId = da.accountId
            LEFT JOIN accounts ca ON t.creditAccountId = ca.accountId
            LEFT JOIN users u ON t.postedBy = u.userId
            WHERE t.transactionId = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ message: 'Error fetching transaction', error: error.message });
    }
});

/**
 * @route POST /api/ledger/transactions
 * @description Create a new transaction (journal entry)
 */
router.post('/transactions', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            transactionDate,
            description,
            referenceNumber,
            referenceType,
            debitAccountId,
            creditAccountId,
            amount,
            notes,
            postedBy
        } = req.body;

        if (!transactionDate || !description || !debitAccountId || !creditAccountId || !amount) {
            return res.status(400).json({ message: 'Transaction date, description, accounts, and amount are required' });
        }

        if (debitAccountId === creditAccountId) {
            return res.status(400).json({ message: 'Debit and credit accounts cannot be the same' });
        }

        // Generate transaction number
        const [lastTrans] = await connection.execute(
            'SELECT transactionNumber FROM transactions ORDER BY transactionId DESC LIMIT 1'
        );
        let transactionNumber = 'TRX-000001';
        if (lastTrans.length > 0) {
            const lastNum = parseInt(lastTrans[0].transactionNumber.split('-')[1]);
            transactionNumber = `TRX-${String(lastNum + 1).padStart(6, '0')}`;
        }

        const [result] = await connection.execute(
            `INSERT INTO transactions (
                transactionNumber, transactionDate, description, referenceNumber, referenceType,
                debitAccountId, creditAccountId, amount, notes, postedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transactionNumber,
                transactionDate,
                description,
                referenceNumber || null,
                referenceType || null,
                debitAccountId,
                creditAccountId,
                amount,
                notes || null,
                postedBy || null
            ]
        );

        const [newTransaction] = await connection.execute(
            `SELECT
                t.*,
                da.accountCode as debitAccountCode,
                da.accountName as debitAccountName,
                ca.accountCode as creditAccountCode,
                ca.accountName as creditAccountName
            FROM transactions t
            LEFT JOIN accounts da ON t.debitAccountId = da.accountId
            LEFT JOIN accounts ca ON t.creditAccountId = ca.accountId
            WHERE t.transactionId = ?`,
            [result.insertId]
        );

        await connection.commit();
        res.status(201).json(newTransaction[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating transaction:', error);
        res.status(500).json({ message: 'Error creating transaction', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/ledger/transactions/:id
 * @description Update a transaction
 */
router.put('/transactions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            transactionDate,
            description,
            referenceNumber,
            referenceType,
            debitAccountId,
            creditAccountId,
            amount,
            notes
        } = req.body;

        // Check if transaction exists
        const [existing] = await connection.execute(
            'SELECT * FROM transactions WHERE transactionId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (debitAccountId === creditAccountId) {
            await connection.rollback();
            return res.status(400).json({ message: 'Debit and credit accounts cannot be the same' });
        }

        await connection.execute(
            `UPDATE transactions SET
                transactionDate = ?,
                description = ?,
                referenceNumber = ?,
                referenceType = ?,
                debitAccountId = ?,
                creditAccountId = ?,
                amount = ?,
                notes = ?
            WHERE transactionId = ?`,
            [
                transactionDate !== undefined ? transactionDate : existing[0].transactionDate,
                description !== undefined ? description : existing[0].description,
                referenceNumber !== undefined ? referenceNumber : existing[0].referenceNumber,
                referenceType !== undefined ? referenceType : existing[0].referenceType,
                debitAccountId !== undefined ? debitAccountId : existing[0].debitAccountId,
                creditAccountId !== undefined ? creditAccountId : existing[0].creditAccountId,
                amount !== undefined ? amount : existing[0].amount,
                notes !== undefined ? notes : existing[0].notes,
                req.params.id
            ]
        );

        const [updatedTransaction] = await connection.execute(
            `SELECT
                t.*,
                da.accountCode as debitAccountCode,
                da.accountName as debitAccountName,
                ca.accountCode as creditAccountCode,
                ca.accountName as creditAccountName
            FROM transactions t
            LEFT JOIN accounts da ON t.debitAccountId = da.accountId
            LEFT JOIN accounts ca ON t.creditAccountId = ca.accountId
            WHERE t.transactionId = ?`,
            [req.params.id]
        );

        await connection.commit();
        res.status(200).json(updatedTransaction[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating transaction:', error);
        res.status(500).json({ message: 'Error updating transaction', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/ledger/transactions/:id
 * @description Delete a transaction
 */
router.delete('/transactions/:id', async (req, res) => {
    try {
        // Check if transaction exists
        const [existing] = await pool.execute(
            'SELECT * FROM transactions WHERE transactionId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Hard delete (transactions are typically not deleted, but we'll allow it)
        await pool.execute(
            'DELETE FROM transactions WHERE transactionId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ message: 'Error deleting transaction', error: error.message });
    }
});

// ============================================
// FINANCIAL REPORTS
// ============================================

/**
 * @route GET /api/ledger/reports/trial-balance
 * @description Get trial balance report
 */
router.get('/reports/trial-balance', async (req, res) => {
    try {
        const { asOfDate } = req.query;
        const reportDate = asOfDate || new Date().toISOString().split('T')[0];

        const query = `
            SELECT
                a.accountId,
                a.accountCode,
                a.accountName,
                a.accountType,
                COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId THEN t.amount ELSE 0 END), 0) as totalDebits,
                COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId THEN t.amount ELSE 0 END), 0) as totalCredits,
                COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId THEN t.amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId THEN t.amount ELSE 0 END), 0) as balance
            FROM accounts a
            LEFT JOIN transactions t ON (
                (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
                AND t.transactionDate <= ?
            )
            WHERE a.isActive = 1
            GROUP BY a.accountId, a.accountCode, a.accountName, a.accountType
            HAVING totalDebits > 0 OR totalCredits > 0
            ORDER BY a.accountType, a.accountCode
        `;

        const [rows] = await pool.execute(query, [reportDate]);

        // Calculate totals
        const totals = rows.reduce((acc, row) => {
            acc.totalDebits += parseFloat(row.totalDebits) || 0;
            acc.totalCredits += parseFloat(row.totalCredits) || 0;
            return acc;
        }, { totalDebits: 0, totalCredits: 0 });

        res.status(200).json({
            reportDate,
            accounts: rows,
            totals,
            isBalanced: Math.abs(totals.totalDebits - totals.totalCredits) < 0.01
        });
    } catch (error) {
        console.error('Error generating trial balance:', error);
        res.status(500).json({ message: 'Error generating trial balance', error: error.message });
    }
});

/**
 * @route GET /api/ledger/reports/income-statement
 * @description Get income statement (Profit & Loss) report
 */
router.get('/reports/income-statement', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Default to current year if not provided
        const start = startDate || `${new Date().getFullYear()}-01-01`;
        const end = endDate || new Date().toISOString().split('T')[0];

        // Revenue accounts
        const [revenueAccounts] = await pool.execute(
            `SELECT
                a.accountId,
                a.accountCode,
                a.accountName,
                COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId THEN t.amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId THEN t.amount ELSE 0 END), 0) as amount
            FROM accounts a
            LEFT JOIN transactions t ON (
                (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
                AND t.transactionDate >= ? AND t.transactionDate <= ?
            )
            WHERE a.isActive = 1 AND a.accountType = 'Revenue'
            GROUP BY a.accountId, a.accountCode, a.accountName
            HAVING amount != 0
            ORDER BY a.accountCode`,
            [start, end]
        );

        // Expense accounts
        const [expenseAccounts] = await pool.execute(
            `SELECT
                a.accountId,
                a.accountCode,
                a.accountName,
                COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId THEN t.amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId THEN t.amount ELSE 0 END), 0) as amount
            FROM accounts a
            LEFT JOIN transactions t ON (
                (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
                AND t.transactionDate >= ? AND t.transactionDate <= ?
            )
            WHERE a.isActive = 1 AND a.accountType = 'Expense'
            GROUP BY a.accountId, a.accountCode, a.accountName
            HAVING amount != 0
            ORDER BY a.accountCode`,
            [start, end]
        );

        const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + (parseFloat(acc.amount) || 0), 0);
        const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + (parseFloat(acc.amount) || 0), 0);
        const netIncome = totalRevenue - totalExpenses;

        res.status(200).json({
            startDate: start,
            endDate: end,
            revenue: {
                accounts: revenueAccounts,
                total: totalRevenue
            },
            expenses: {
                accounts: expenseAccounts,
                total: totalExpenses
            },
            netIncome: netIncome
        });
    } catch (error) {
        console.error('Error generating income statement:', error);
        res.status(500).json({ message: 'Error generating income statement', error: error.message });
    }
});

/**
 * @route GET /api/ledger/reports/balance-sheet
 * @description Get statement of financial position (Balance Sheet) report
 */
router.get('/reports/balance-sheet', async (req, res) => {
    try {
        const { asOfDate } = req.query;
        const reportDate = asOfDate || new Date().toISOString().split('T')[0];

        // Assets
        const [assetAccounts] = await pool.execute(
            `SELECT
                a.accountId,
                a.accountCode,
                a.accountName,
                COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId THEN t.amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId THEN t.amount ELSE 0 END), 0) as balance
            FROM accounts a
            LEFT JOIN transactions t ON (
                (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
                AND t.transactionDate <= ?
            )
            WHERE a.isActive = 1 AND a.accountType = 'Asset'
            GROUP BY a.accountId, a.accountCode, a.accountName
            HAVING balance != 0
            ORDER BY a.accountCode`,
            [reportDate]
        );

        // Liabilities
        const [liabilityAccounts] = await pool.execute(
            `SELECT
                a.accountId,
                a.accountCode,
                a.accountName,
                COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId THEN t.amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId THEN t.amount ELSE 0 END), 0) as balance
            FROM accounts a
            LEFT JOIN transactions t ON (
                (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
                AND t.transactionDate <= ?
            )
            WHERE a.isActive = 1 AND a.accountType = 'Liability'
            GROUP BY a.accountId, a.accountCode, a.accountName
            HAVING balance != 0
            ORDER BY a.accountCode`,
            [reportDate]
        );

        // Equity
        const [equityAccounts] = await pool.execute(
            `SELECT
                a.accountId,
                a.accountCode,
                a.accountName,
                COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId THEN t.amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId THEN t.amount ELSE 0 END), 0) as balance
            FROM accounts a
            LEFT JOIN transactions t ON (
                (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
                AND t.transactionDate <= ?
            )
            WHERE a.isActive = 1 AND a.accountType = 'Equity'
            GROUP BY a.accountId, a.accountCode, a.accountName
            HAVING balance != 0
            ORDER BY a.accountCode`,
            [reportDate]
        );

        // Calculate retained earnings (net income from beginning to report date)
        const [retainedEarnings] = await pool.execute(
            `SELECT
                COALESCE(SUM(CASE
                    WHEN t.creditAccountId IN (SELECT accountId FROM accounts WHERE accountType = 'Revenue') THEN t.amount
                    WHEN t.debitAccountId IN (SELECT accountId FROM accounts WHERE accountType = 'Expense') THEN -t.amount
                    ELSE 0
                END), 0) as netIncome
            FROM transactions t
            WHERE t.transactionDate <= ?`,
            [reportDate]
        );

        const totalAssets = assetAccounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
        const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
        const totalEquity = equityAccounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0) + (parseFloat(retainedEarnings[0]?.netIncome) || 0);
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        res.status(200).json({
            reportDate,
            assets: {
                accounts: assetAccounts,
                total: totalAssets
            },
            liabilities: {
                accounts: liabilityAccounts,
                total: totalLiabilities
            },
            equity: {
                accounts: equityAccounts,
                retainedEarnings: parseFloat(retainedEarnings[0]?.netIncome) || 0,
                total: totalEquity
            },
            totalLiabilitiesAndEquity: totalLiabilitiesAndEquity,
            isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01
        });
    } catch (error) {
        console.error('Error generating balance sheet:', error);
        res.status(500).json({ message: 'Error generating balance sheet', error: error.message });
    }
});

// ============================================
// PATIENT & STAFF FINANCIAL STATEMENTS
// ============================================

/**
 * @route GET /api/ledger/reports/patient-statement/:patientId
 * @description Get patient financial statement (debits, credits, balances)
 */
router.get('/reports/patient-statement/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { startDate, endDate, asOfDate } = req.query;

        // Get patient info
        const [patientRows] = await pool.execute(
            'SELECT patientId, patientNumber, firstName, lastName, dateOfBirth, gender, phone FROM patients WHERE patientId = ?',
            [patientId]
        );

        if (patientRows.length === 0) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const patient = patientRows[0];

        // Get all invoices for this patient with details
        const [invoices] = await pool.execute(
            `SELECT
                invoiceId,
                invoiceNumber,
                invoiceDate,
                totalAmount,
                paidAmount,
                balance,
                status,
                notes
             FROM invoices
             WHERE patientId = ?
             ORDER BY invoiceDate DESC, invoiceId DESC`,
            [patientId]
        );

        const invoiceNumbers = invoices.map(inv => inv.invoiceNumber);

        if (invoiceNumbers.length === 0) {
            return res.status(200).json({
                patient,
                statementDate: asOfDate || new Date().toISOString().split('T')[0],
                startDate: startDate || null,
                endDate: endDate || null,
                openingBalance: 0,
                closingBalance: 0,
                transactions: [],
                summary: {
                    totalDebits: 0,
                    totalCredits: 0,
                    netBalance: 0
                }
            });
        }

        // Get Patient Accounts Receivable account
        const [receivableAccountRows] = await pool.execute(
            `SELECT accountId FROM accounts
             WHERE (accountCode LIKE '1021%' OR accountName LIKE '%Patient%Receivable%')
             AND accountType = 'Asset'
             LIMIT 1`
        );

        const receivableAccountId = receivableAccountRows[0]?.accountId;

        // Build query for transactions linked to patient invoices
        // Show all transactions related to patient invoices, not just receivable account ones
        let query = `
            SELECT
                t.transactionId,
                t.transactionNumber,
                t.transactionDate,
                t.description,
                t.referenceNumber,
                t.referenceType,
                t.amount,
                t.notes,
                t.postedAt,
                CASE
                    WHEN t.debitAccountId = ? THEN t.amount
                    ELSE 0
                END as debit,
                CASE
                    WHEN t.creditAccountId = ? THEN t.amount
                    ELSE 0
                END as credit,
                da.accountCode as debitAccountCode,
                da.accountName as debitAccountName,
                ca.accountCode as creditAccountCode,
                ca.accountName as creditAccountName,
                t.debitAccountId,
                t.creditAccountId
            FROM transactions t
            LEFT JOIN accounts da ON t.debitAccountId = da.accountId
            LEFT JOIN accounts ca ON t.creditAccountId = ca.accountId
            WHERE t.referenceNumber IN (${invoiceNumbers.map(() => '?').join(',')})
        `;

        const params = [
            receivableAccountId || 0,
            receivableAccountId || 0,
            ...invoiceNumbers
        ];

        if (asOfDate) {
            query += ` AND t.transactionDate <= ?`;
            params.push(asOfDate);
        } else if (startDate && endDate) {
            query += ` AND t.transactionDate >= ? AND t.transactionDate <= ?`;
            params.push(startDate, endDate);
        }

        query += ` ORDER BY t.transactionDate, t.transactionId`;

        const [transactions] = await pool.execute(query, params);

        // Get payments for these invoices
        const invoiceIds = invoices.map(inv => inv.invoiceId);
        let payments = [];
        if (invoiceIds.length > 0) {
            const [paymentRows] = await pool.execute(
                `SELECT
                    p.paymentId,
                    p.paymentNumber,
                    p.invoiceId,
                    p.paymentDate,
                    p.amount,
                    p.referenceNumber,
                    p.notes,
                    pm.methodName as paymentMethod,
                    i.invoiceNumber
                FROM payments p
                LEFT JOIN payment_methods pm ON p.paymentMethodId = pm.methodId
                LEFT JOIN invoices i ON p.invoiceId = i.invoiceId
                WHERE p.invoiceId IN (${invoiceIds.map(() => '?').join(',')})
                ${asOfDate ? 'AND p.paymentDate <= ?' : ''}
                ${startDate && endDate ? 'AND p.paymentDate >= ? AND p.paymentDate <= ?' : ''}
                ORDER BY p.paymentDate, p.paymentId`,
                asOfDate
                    ? [...invoiceIds, asOfDate]
                    : startDate && endDate
                        ? [...invoiceIds, startDate, endDate]
                        : invoiceIds
            );
            payments = paymentRows;
        }

        // Create transaction entries from invoices (debits) and payments (credits)
        // Always create entries from invoices and payments, merging with existing transactions
        let allTransactions = [...transactions];

        const asOfNorm = asOfDate ? toDateOnly(asOfDate) : null;
        const startNorm = startDate ? toDateOnly(startDate) : null;
        const endNorm = endDate ? toDateOnly(endDate) : null;

        const isDateInRange = (dateStr) => {
            const d = toDateOnly(dateStr);
            if (!d) return false;
            if (asOfNorm) return d <= asOfNorm;
            if (startNorm && endNorm) return d >= startNorm && d <= endNorm;
            return true;
        };

        // Add invoice entries as debits - ALWAYS show invoices as debits
        invoices.forEach(inv => {
            if (inv.totalAmount > 0) {
                const invoiceDate = toDateOnly(inv.invoiceDate) || toDateOnly(new Date());

                // Check if this invoice is already represented as a debit in existing transactions
                const existsAsDebit = transactions.some(t => {
                    const matchesInvoice = t.referenceNumber === inv.invoiceNumber;
                    const isDebit = parseFloat(t.debit) > 0;
                    const isInvoiceEntry = t.referenceType === 'invoice' ||
                        (t.description?.toLowerCase().includes(`invoice ${inv.invoiceNumber.toLowerCase()}`) &&
                         !t.description?.toLowerCase().includes('payment'));
                    return matchesInvoice && isDebit && isInvoiceEntry;
                });

                // Check if we've already added it to allTransactions
                const alreadyAdded = allTransactions.some(t =>
                    t.transactionId === `inv-${inv.invoiceId}` ||
                    (t.referenceNumber === inv.invoiceNumber && t.referenceType === 'invoice' && parseFloat(t.debit) > 0)
                );

                // Always add invoice as debit if it doesn't exist as a debit entry
                if (!existsAsDebit && !alreadyAdded && isDateInRange(invoiceDate)) {
                    allTransactions.push({
                        transactionId: `inv-${inv.invoiceId}`,
                        transactionNumber: inv.invoiceNumber,
                        transactionDate: invoiceDate,
                        description: `Invoice ${inv.invoiceNumber}${inv.notes ? ` - ${inv.notes}` : ''}`,
                        referenceNumber: inv.invoiceNumber,
                        referenceType: 'invoice',
                        amount: parseFloat(inv.totalAmount),
                        notes: inv.notes || null,
                        postedAt: invoiceDate,
                        debit: parseFloat(inv.totalAmount),
                        credit: 0,
                        debitAccountCode: receivableAccountRows[0]?.accountCode || '1021',
                        debitAccountName: receivableAccountRows[0]?.accountName || 'Patient Accounts Receivable',
                        creditAccountCode: null,
                        creditAccountName: null
                    });
                }
            }
        });

        // Add payment entries as credits
        payments.forEach(pay => {
            if (pay.amount > 0) {
                const paymentDate = toDateOnly(pay.paymentDate) || toDateOnly(new Date());
                // Check if this payment is already represented in transactions
                const exists = transactions.some(t =>
                    (t.referenceNumber === pay.invoiceNumber && t.referenceType === 'payment') ||
                    (t.description?.includes(`Payment for Invoice ${pay.invoiceNumber}`) &&
                     Math.abs(parseFloat(t.amount || t.credit || 0) - parseFloat(pay.amount)) < 0.01)
                );
                if (!exists && isDateInRange(paymentDate)) {
                    allTransactions.push({
                        transactionId: `pay-${pay.paymentId}`,
                        transactionNumber: pay.paymentNumber || `PAY-${pay.paymentId}`,
                        transactionDate: paymentDate,
                        description: `Payment for Invoice ${pay.invoiceNumber}${pay.paymentMethod ? ` - ${pay.paymentMethod}` : ''}`,
                        referenceNumber: pay.invoiceNumber,
                        referenceType: 'payment',
                        amount: parseFloat(pay.amount),
                        notes: pay.notes || null,
                        postedAt: paymentDate,
                        debit: 0,
                        credit: parseFloat(pay.amount),
                        debitAccountCode: null,
                        debitAccountName: null,
                        creditAccountCode: receivableAccountRows[0]?.accountCode || '1021',
                        creditAccountName: receivableAccountRows[0]?.accountName || 'Patient Accounts Receivable'
                    });
                }
            }
        });

        // Sort all transactions by date
        allTransactions.sort((a, b) => {
            const dateA = new Date(a.transactionDate);
            const dateB = new Date(b.transactionDate);
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA.getTime() - dateB.getTime();
            }
            // If same date, invoices before payments
            if (a.referenceType === 'invoice' && b.referenceType === 'payment') return -1;
            if (a.referenceType === 'payment' && b.referenceType === 'invoice') return 1;
            return 0;
        });

        // Calculate opening balance (transactions before startDate if provided)
        // Use receivables table if available, otherwise calculate from transactions
        let openingBalance = 0;

        // First, try to get balance from receivables table
        const [receivablesRows] = await pool.execute(
            `SELECT SUM(outstandingAmount) as totalOutstanding
             FROM receivables
             WHERE patientId = ? AND status != 'paid'`,
            [patientId]
        );

        if (receivablesRows[0]?.totalOutstanding) {
            openingBalance = parseFloat(receivablesRows[0].totalOutstanding) || 0;
        }

        // If no receivables, calculate from transactions
        if (openingBalance === 0 && receivableAccountId) {
            if (startDate) {
                const [openingRows] = await pool.execute(
                    `SELECT
                        COALESCE(SUM(CASE WHEN t.debitAccountId = ? THEN t.amount ELSE 0 END), 0) -
                        COALESCE(SUM(CASE WHEN t.creditAccountId = ? THEN t.amount ELSE 0 END), 0) as balance
                    FROM transactions t
                    WHERE t.referenceNumber IN (${invoiceNumbers.map(() => '?').join(',')})
                    AND t.transactionDate < ?`,
                    [
                        receivableAccountId,
                        receivableAccountId,
                        ...invoiceNumbers,
                        startDate
                    ]
                );
                openingBalance = parseFloat(openingRows[0]?.balance || 0);
            } else if (asOfDate) {
                // Calculate balance as of date
                const [openingRows] = await pool.execute(
                    `SELECT
                        COALESCE(SUM(CASE WHEN t.debitAccountId = ? THEN t.amount ELSE 0 END), 0) -
                        COALESCE(SUM(CASE WHEN t.creditAccountId = ? THEN t.amount ELSE 0 END), 0) as balance
                    FROM transactions t
                    WHERE t.referenceNumber IN (${invoiceNumbers.map(() => '?').join(',')})
                    AND t.transactionDate <= ?`,
                    [
                        receivableAccountId,
                        receivableAccountId,
                        ...invoiceNumbers,
                        asOfDate
                    ]
                );
                openingBalance = parseFloat(openingRows[0]?.balance || 0);
            }
        }

        // If still no balance, calculate from invoices and payments before the date range
        if (openingBalance === 0 && invoices.length > 0) {
            if (startDate) {
                // Calculate balance from invoices created and payments made before startDate
                const invoicesBefore = invoices.filter(inv => {
                    const invDate = toDateOnly(inv.invoiceDate);
                    return invDate && startNorm && invDate < startNorm;
                });
                const paymentsBefore = payments.filter(pay => {
                    const payDate = toDateOnly(pay.paymentDate);
                    return payDate && startNorm && payDate < startNorm;
                });

                const totalInvoicedBefore = invoicesBefore.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) || 0), 0);
                const totalPaidBefore = paymentsBefore.reduce((sum, pay) => sum + (parseFloat(pay.amount) || 0), 0);
                openingBalance = totalInvoicedBefore - totalPaidBefore;
            } else {
                // Use current invoice balance
                const [invoiceBalanceRows] = await pool.execute(
                    `SELECT SUM(balance) as totalBalance
                     FROM invoices
                     WHERE patientId = ? AND status != 'paid'`,
                    [patientId]
                );
                openingBalance = parseFloat(invoiceBalanceRows[0]?.totalBalance || 0);
            }
        }

        // Fix debit/credit values for existing transactions if they're not set correctly
        allTransactions = allTransactions.map(t => {
            const currentDebit = parseFloat(t.debit) || 0;
            const currentCredit = parseFloat(t.credit) || 0;
            const amount = parseFloat(t.amount) || 0;

            // If debit/credit are both 0 but we have an amount, calculate them
            if (currentDebit === 0 && currentCredit === 0 && amount > 0) {
                // Check if this transaction involves the receivable account
                if (receivableAccountId) {
                    const debitAccId = parseInt(t.debitAccountId) || 0;
                    const creditAccId = parseInt(t.creditAccountId) || 0;
                    const recAccId = parseInt(receivableAccountId) || 0;

                    if (debitAccId === recAccId) {
                        t.debit = amount;
                        t.credit = 0;
                    } else if (creditAccId === recAccId) {
                        t.debit = 0;
                        t.credit = amount;
                    } else {
                        // Transaction doesn't involve receivable account directly
                        // Check description to determine if it's a payment or invoice
                        const desc = (t.description || '').toLowerCase();
                        if (desc.includes('payment') && desc.includes('invoice')) {
                            // Payment transaction - credit to receivables
                            t.debit = 0;
                            t.credit = amount;
                        } else if (desc.includes('invoice') && !desc.includes('payment')) {
                            // Invoice transaction - debit to receivables
                            t.debit = amount;
                            t.credit = 0;
                        }
                    }
                } else {
                    // No receivable account found, use description to determine
                    const desc = (t.description || '').toLowerCase();
                    if (desc.includes('payment') && desc.includes('invoice')) {
                        // Payment transaction - credit
                        t.debit = 0;
                        t.credit = amount;
                    } else if (desc.includes('invoice') && !desc.includes('payment')) {
                        // Invoice transaction - debit
                        t.debit = amount;
                        t.credit = 0;
                    }
                }
            }

            // Ensure debit and credit are numbers
            t.debit = parseFloat(t.debit) || 0;
            t.credit = parseFloat(t.credit) || 0;

            return t;
        });

        const txSummary = allTransactions.reduce((acc, t) => {
            acc.totalDebits += parseFloat(t.debit) || 0;
            acc.totalCredits += parseFloat(t.credit) || 0;
            return acc;
        }, { totalDebits: 0, totalCredits: 0 });

        const hasDateFilter = Boolean(asOfNorm || (startNorm && endNorm));
        const invoicesForSummary = hasDateFilter
            ? invoices.filter((inv) => isDateInRange(inv.invoiceDate))
            : invoices;

        const invoiceSummary = invoices.reduce((acc, inv) => {
            acc.totalInvoiced += parseFloat(inv.totalAmount) || 0;
            acc.totalPaid += parseFloat(inv.paidAmount) || 0;
            acc.totalBalance += parseFloat(inv.balance) || 0;
            return acc;
        }, { totalInvoiced: 0, totalPaid: 0, totalBalance: 0 });

        const scopedInvoiceSummary = invoicesForSummary.reduce((acc, inv) => {
            acc.totalInvoiced += parseFloat(inv.totalAmount) || 0;
            acc.totalPaid += parseFloat(inv.paidAmount) || 0;
            return acc;
        }, { totalInvoiced: 0, totalPaid: 0 });

        const paymentsTotal = payments.reduce((sum, pay) => sum + (parseFloat(pay.amount) || 0), 0);

        const summary = { ...txSummary };
        if (allTransactions.length > 0) {
            summary.totalDebits = txSummary.totalDebits;
            summary.totalCredits = txSummary.totalCredits;
        } else {
            summary.totalDebits = scopedInvoiceSummary.totalInvoiced;
            summary.totalCredits = paymentsTotal > 0 ? paymentsTotal : scopedInvoiceSummary.totalPaid;
        }

        // If still no opening balance, use invoice balance
        if (openingBalance === 0 && invoices.length > 0) {
            openingBalance = invoiceSummary.totalBalance;
        }

        const closingBalance = openingBalance + summary.totalDebits - summary.totalCredits;
        summary.netBalance = closingBalance;

        res.status(200).json({
            patient,
            statementDate: asOfDate || endDate || new Date().toISOString().split('T')[0],
            startDate: startDate || null,
            endDate: endDate || null,
            openingBalance,
            closingBalance,
            transactions: allTransactions, // Include both journal entries and invoice/payment entries
            invoices, // Include invoice details
            payments, // Include payment details
            summary: {
                ...summary,
                totalInvoiced: hasDateFilter ? scopedInvoiceSummary.totalInvoiced : invoiceSummary.totalInvoiced,
                totalPaid: hasDateFilter
                    ? (paymentsTotal > 0 ? paymentsTotal : scopedInvoiceSummary.totalPaid)
                    : invoiceSummary.totalPaid,
                totalOutstanding: invoiceSummary.totalBalance
            },
            receivableAccountId: receivableAccountId || null
        });
    } catch (error) {
        console.error('Error generating patient statement:', error);
        res.status(500).json({ message: 'Error generating patient statement', error: error.message });
    }
});

/**
 * @route GET /api/ledger/reports/staff-statement/:staffId
 * @description Get staff financial statement (debits, credits, balances)
 */
router.get('/reports/staff-statement/:staffId', async (req, res) => {
    try {
        const { staffId } = req.params;
        const { startDate, endDate, asOfDate } = req.query;

        // Get staff info
        const [staffRows] = await pool.execute(
            'SELECT userId, username, firstName, lastName, email, department, roleId FROM users WHERE userId = ?',
            [staffId]
        );

        if (staffRows.length === 0) {
            return res.status(404).json({ message: 'Staff member not found' });
        }

        const staff = staffRows[0];

        // Get role name
        const [roleRows] = await pool.execute(
            'SELECT roleName FROM roles WHERE roleId = ?',
            [staff.roleId]
        );
        staff.roleName = roleRows[0]?.roleName || 'Unknown';

        // Find staff-related accounts (could be payables, revenue share, etc.)
        // For now, we'll look for transactions where:
        // 1. Reference includes staff ID or username
        // 2. Account name includes staff name or "Staff" or "Doctor"
        // 3. Notes mention the staff member

        let query = `
            SELECT
                t.transactionId,
                t.transactionNumber,
                t.transactionDate,
                t.description,
                t.referenceNumber,
                t.referenceType,
                t.amount,
                t.notes,
                t.postedAt,
                CASE
                    WHEN t.debitAccountId = a.accountId THEN t.amount
                    ELSE 0
                END as debit,
                CASE
                    WHEN t.creditAccountId = a.accountId THEN t.amount
                    ELSE 0
                END as credit,
                da.accountCode as debitAccountCode,
                da.accountName as debitAccountName,
                ca.accountCode as creditAccountCode,
                ca.accountName as creditAccountName
            FROM transactions t
            LEFT JOIN accounts da ON t.debitAccountId = da.accountId
            LEFT JOIN accounts ca ON t.creditAccountId = ca.accountId
            LEFT JOIN accounts a ON (
                (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
                AND (
                    a.accountName LIKE ? OR
                    a.accountName LIKE ? OR
                    a.accountCode LIKE '2023%' OR  -- Accrued Professional Fees
                    a.accountCode LIKE '5011%' OR  -- Salaries - Medical Staff
                    a.accountCode LIKE '5012%' OR  -- Salaries - Nursing Staff
                    a.accountCode LIKE '5401%'     -- Doctor Fees - Consultants
                )
            )
            WHERE (
                t.notes LIKE ? OR
                t.description LIKE ? OR
                t.referenceNumber LIKE ?
            )
        `;

        const searchPattern = `%${staff.username}%`;
        const namePattern = `%${staff.firstName}%${staff.lastName}%`;
        const params = [
            `%${staff.firstName}%`,
            `%${staff.lastName}%`,
            searchPattern,
            searchPattern,
            searchPattern
        ];

        if (asOfDate) {
            query += ` AND t.transactionDate <= ?`;
            params.push(asOfDate);
        } else if (startDate && endDate) {
            query += ` AND t.transactionDate >= ? AND t.transactionDate <= ?`;
            params.push(startDate, endDate);
        }

        query += ` ORDER BY t.transactionDate, t.transactionId`;

        const [transactions] = await pool.execute(query, params);

        // Calculate opening balance
        let openingBalance = 0;
        if (startDate) {
            const [openingRows] = await pool.execute(
                `SELECT
                    COALESCE(SUM(CASE WHEN t.debitAccountId = a.accountId THEN t.amount ELSE 0 END), 0) -
                    COALESCE(SUM(CASE WHEN t.creditAccountId = a.accountId THEN t.amount ELSE 0 END), 0) as balance
                FROM transactions t
                LEFT JOIN accounts a ON (
                    (t.debitAccountId = a.accountId OR t.creditAccountId = a.accountId)
                    AND (
                        a.accountName LIKE ? OR
                        a.accountName LIKE ? OR
                        a.accountCode LIKE '2023%' OR
                        a.accountCode LIKE '5011%' OR
                        a.accountCode LIKE '5012%' OR
                        a.accountCode LIKE '5401%'
                    )
                )
                WHERE (
                    t.notes LIKE ? OR
                    t.description LIKE ? OR
                    t.referenceNumber LIKE ?
                )
                AND t.transactionDate < ?`,
                [
                    `%${staff.firstName}%`,
                    `%${staff.lastName}%`,
                    searchPattern,
                    searchPattern,
                    searchPattern,
                    startDate
                ]
            );
            openingBalance = parseFloat(openingRows[0]?.balance || 0);
        }

        // Calculate summary
        const summary = transactions.reduce((acc, t) => {
            acc.totalDebits += parseFloat(t.debit) || 0;
            acc.totalCredits += parseFloat(t.credit) || 0;
            return acc;
        }, { totalDebits: 0, totalCredits: 0 });

        const closingBalance = openingBalance + summary.totalDebits - summary.totalCredits;
        summary.netBalance = closingBalance;

        res.status(200).json({
            staff,
            statementDate: asOfDate || endDate || new Date().toISOString().split('T')[0],
            startDate: startDate || null,
            endDate: endDate || null,
            openingBalance,
            closingBalance,
            transactions,
            summary
        });
    } catch (error) {
        console.error('Error generating staff statement:', error);
        res.status(500).json({ message: 'Error generating staff statement', error: error.message });
    }
});

module.exports = router;

