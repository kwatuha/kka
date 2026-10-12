// Receivable invoices routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/receivables
 * @description Get all receivable invoices with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { status, patientId, search, startDate, endDate } = req.query;
        
        // First, update overdue status for receivables past due date
        await pool.query(`
            UPDATE receivables 
            SET status = 'overdue', updatedAt = NOW()
            WHERE status IN ('current')
                AND dueDate IS NOT NULL
                AND dueDate < CURDATE()
                AND outstandingAmount > 0
        `);

        let query = `
            SELECT 
                r.*,
                p.patientNumber,
                p.firstName,
                p.lastName,
                p.phone as patientPhone,
                p.email as patientEmail,
                i.invoiceNumber,
                i.invoiceDate,
                i.paymentMethod
            FROM receivables r
            LEFT JOIN patients p ON r.patientId = p.patientId
            LEFT JOIN invoices i ON r.invoiceId = i.invoiceId
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND r.status = ?';
            params.push(status);
        }

        if (patientId) {
            query += ' AND r.patientId = ?';
            params.push(patientId);
        }

        if (search) {
            query += ' AND (i.invoiceNumber LIKE ? OR p.firstName LIKE ? OR p.lastName LIKE ? OR p.patientNumber LIKE ? OR r.notes LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (startDate) {
            query += ' AND i.invoiceDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND i.invoiceDate <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY i.invoiceDate DESC, r.createdAt DESC';
        
        const [rows] = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching receivables:', error);
        res.status(500).json({ message: 'Error fetching receivables', error: error.message });
    }
});

/**
 * @route GET /api/receivables/:id
 * @description Get a single receivable invoice by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT 
                r.*,
                p.patientNumber,
                p.firstName,
                p.lastName,
                p.phone as patientPhone,
                p.email as patientEmail,
                p.address as patientAddress,
                p.dateOfBirth,
                p.gender,
                i.invoiceNumber,
                i.invoiceDate,
                i.paymentMethod,
                i.notes as invoiceNotes
            FROM receivables r
            LEFT JOIN patients p ON r.patientId = p.patientId
            LEFT JOIN invoices i ON r.invoiceId = i.invoiceId
            WHERE r.receivableId = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Receivable invoice not found' });
        }
        
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching receivable:', error);
        res.status(500).json({ message: 'Error fetching receivable', error: error.message });
    }
});

/**
 * @route POST /api/receivables
 * @description Create a new receivable invoice (usually created from an invoice)
 */
router.post('/', async (req, res) => {
    try {
        const { patientId, invoiceId, totalAmount, dueDate, notes } = req.body;
        
        if (!patientId || !invoiceId || !totalAmount) {
            return res.status(400).json({ error: 'Patient, invoice, and total amount are required' });
        }

        // Check if receivable already exists for this invoice
        const [existing] = await pool.query(
            'SELECT receivableId FROM receivables WHERE invoiceId = ?',
            [invoiceId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Receivable already exists for this invoice' });
        }

        // Calculate outstanding amount (initially same as total)
        const outstandingAmount = parseFloat(totalAmount) || 0;
        const status = outstandingAmount > 0 ? 'current' : 'paid';

        const [result] = await pool.query(
            `INSERT INTO receivables 
                (patientId, invoiceId, totalAmount, paidAmount, outstandingAmount, dueDate, status, notes)
            VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
            [patientId, invoiceId, totalAmount, outstandingAmount, dueDate || null, status, notes || null]
        );
        
        const [newReceivable] = await pool.query(`
            SELECT 
                r.*,
                p.patientNumber,
                p.firstName,
                p.lastName,
                i.invoiceNumber
            FROM receivables r
            LEFT JOIN patients p ON r.patientId = p.patientId
            LEFT JOIN invoices i ON r.invoiceId = i.invoiceId
            WHERE r.receivableId = ?
        `, [result.insertId]);
        
        res.status(201).json(newReceivable[0]);
    } catch (error) {
        console.error('Error creating receivable:', error);
        res.status(500).json({ message: 'Error creating receivable', error: error.message });
    }
});

/**
 * @route PUT /api/receivables/:id
 * @description Update a receivable invoice
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { totalAmount, dueDate, notes, status } = req.body;

        // Check if receivable exists
        const [existing] = await pool.query(
            'SELECT receivableId FROM receivables WHERE receivableId = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Receivable invoice not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (totalAmount !== undefined) {
            updates.push('totalAmount = ?');
            values.push(totalAmount);
            // Recalculate outstanding amount
            const [current] = await pool.query('SELECT paidAmount FROM receivables WHERE receivableId = ?', [id]);
            const paidAmount = parseFloat(current[0]?.paidAmount || 0);
            const newOutstanding = parseFloat(totalAmount) - paidAmount;
            updates.push('outstandingAmount = ?');
            values.push(newOutstanding);
        }
        if (dueDate !== undefined) { updates.push('dueDate = ?'); values.push(dueDate); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.query(
            `UPDATE receivables SET ${updates.join(', ')}, updatedAt = NOW() WHERE receivableId = ?`,
            values
        );

        const [updated] = await pool.query(`
            SELECT 
                r.*,
                p.patientNumber,
                p.firstName,
                p.lastName,
                i.invoiceNumber
            FROM receivables r
            LEFT JOIN patients p ON r.patientId = p.patientId
            LEFT JOIN invoices i ON r.invoiceId = i.invoiceId
            WHERE r.receivableId = ?
        `, [id]);
        
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating receivable:', error);
        res.status(500).json({ message: 'Error updating receivable', error: error.message });
    }
});

/**
 * @route DELETE /api/receivables/:id
 * @description Delete (write off) a receivable invoice
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if receivable exists
        const [existing] = await pool.query(
            'SELECT receivableId, status FROM receivables WHERE receivableId = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Receivable invoice not found' });
        }

        // If already paid, don't allow deletion - mark as written_off instead
        if (existing[0].status === 'paid') {
            await pool.query(
                'UPDATE receivables SET status = "written_off", updatedAt = NOW() WHERE receivableId = ?',
                [id]
            );
            return res.status(200).json({ message: 'Receivable written off (was already paid)' });
        }

        // Otherwise, delete it
        await pool.query('DELETE FROM receivables WHERE receivableId = ?', [id]);
        
        res.status(200).json({ message: 'Receivable invoice deleted successfully' });
    } catch (error) {
        console.error('Error deleting receivable:', error);
        res.status(500).json({ message: 'Error deleting receivable', error: error.message });
    }
});

/**
 * @route POST /api/receivables/:id/payment
 * @description Record a payment against a receivable invoice
 */
router.post('/:id/payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentAmount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;

        if (!paymentAmount || paymentAmount <= 0) {
            return res.status(400).json({ error: 'Payment amount is required and must be greater than 0' });
        }

        // Get current receivable
        const [receivables] = await pool.query('SELECT * FROM receivables WHERE receivableId = ?', [id]);
        
        if (receivables.length === 0) {
            return res.status(404).json({ message: 'Receivable invoice not found' });
        }

        const receivable = receivables[0];
        const currentPaid = parseFloat(receivable.paidAmount || 0);
        const newPaid = currentPaid + parseFloat(paymentAmount);
        const outstanding = parseFloat(receivable.totalAmount) - newPaid;

        // Determine new status
        let newStatus = receivable.status;
        if (outstanding <= 0) {
            newStatus = 'paid';
        } else if (newPaid > 0) {
            newStatus = 'current';
        }

        // Update receivable
        await pool.query(
            `UPDATE receivables 
            SET paidAmount = ?, outstandingAmount = ?, status = ?, lastPaymentDate = ?, updatedAt = NOW()
            WHERE receivableId = ?`,
            [newPaid, outstanding, newStatus, paymentDate || new Date().toISOString().split('T')[0], id]
        );

        // Also update the linked invoice
        await pool.query(
            `UPDATE invoices 
            SET paidAmount = ?, balance = ?, status = CASE 
                WHEN ? <= 0 THEN 'paid'
                WHEN ? > 0 AND paidAmount > 0 THEN 'partial'
                ELSE status
            END,
            updatedAt = NOW()
            WHERE invoiceId = ?`,
            [newPaid, outstanding, outstanding, newPaid, receivable.invoiceId]
        );

        // Get updated receivable
        const [updated] = await pool.query(`
            SELECT 
                r.*,
                p.patientNumber,
                p.firstName,
                p.lastName,
                i.invoiceNumber
            FROM receivables r
            LEFT JOIN patients p ON r.patientId = p.patientId
            LEFT JOIN invoices i ON r.invoiceId = i.invoiceId
            WHERE r.receivableId = ?
        `, [id]);
        
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Error recording payment', error: error.message });
    }
});

/**
 * @route GET /api/receivables/stats/summary
 * @description Get summary statistics for receivables
 */
router.get('/stats/summary', async (req, res) => {
    try {
        // Update overdue status before calculating stats
        await pool.query(`
            UPDATE receivables 
            SET status = 'overdue', updatedAt = NOW()
            WHERE status IN ('current')
                AND dueDate IS NOT NULL
                AND dueDate < CURDATE()
                AND outstandingAmount > 0
        `);

        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as totalReceivables,
                SUM(CASE WHEN status = 'current' THEN outstandingAmount ELSE 0 END) as currentAmount,
                SUM(CASE WHEN status = 'overdue' THEN outstandingAmount ELSE 0 END) as overdueAmount,
                SUM(CASE WHEN status = 'paid' THEN totalAmount ELSE 0 END) as paidAmount,
                COUNT(CASE WHEN status = 'current' THEN 1 END) as currentCount,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdueCount,
                COUNT(CASE WHEN status = 'paid' AND MONTH(lastPaymentDate) = MONTH(CURDATE()) AND YEAR(lastPaymentDate) = YEAR(CURDATE()) THEN 1 END) as paidThisMonthCount,
                SUM(CASE WHEN status = 'paid' AND MONTH(lastPaymentDate) = MONTH(CURDATE()) AND YEAR(lastPaymentDate) = YEAR(CURDATE()) THEN totalAmount ELSE 0 END) as paidThisMonthAmount
            FROM receivables
            WHERE status != 'written_off'
        `);
        
        res.status(200).json(stats[0] || {
            totalReceivables: 0,
            currentAmount: 0,
            overdueAmount: 0,
            paidAmount: 0,
            currentCount: 0,
            overdueCount: 0,
            paidThisMonthCount: 0,
            paidThisMonthAmount: 0,
        });
    } catch (error) {
        console.error('Error fetching receivable stats:', error);
        res.status(500).json({ message: 'Error fetching receivable stats', error: error.message });
    }
});

module.exports = router;

