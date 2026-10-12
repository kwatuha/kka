// Payable invoices routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/payables
 * @description Get all payable invoices with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { status, vendorId, search, startDate, endDate } = req.query;
        
        // First, update overdue status for invoices past due date
        await pool.query(`
            UPDATE payables 
            SET status = 'overdue', updatedAt = NOW()
            WHERE status IN ('pending', 'partial')
                AND dueDate IS NOT NULL
                AND dueDate < CURDATE()
                AND outstandingAmount > 0
        `);

        let query = `
            SELECT 
                p.*,
                v.vendorName,
                v.contactPerson,
                v.phone as vendorPhone,
                v.email as vendorEmail,
                po.poNumber as purchaseOrderNumber
            FROM payables p
            LEFT JOIN vendors v ON p.vendorId = v.vendorId
            LEFT JOIN purchase_orders po ON p.purchaseOrderId = po.purchaseOrderId
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }

        if (vendorId) {
            query += ' AND p.vendorId = ?';
            params.push(vendorId);
        }

        if (search) {
            query += ' AND (p.invoiceNumber LIKE ? OR v.vendorName LIKE ? OR p.notes LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (startDate) {
            query += ' AND p.invoiceDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND p.invoiceDate <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY p.invoiceDate DESC, p.createdAt DESC';
        
        const [rows] = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching payables:', error);
        res.status(500).json({ message: 'Error fetching payables', error: error.message });
    }
});

/**
 * @route GET /api/payables/:id
 * @description Get a single payable invoice by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT 
                p.*,
                v.vendorName,
                v.contactPerson,
                v.phone as vendorPhone,
                v.email as vendorEmail,
                v.address as vendorAddress,
                po.poNumber as purchaseOrderNumber,
                po.orderDate as purchaseOrderDate
            FROM payables p
            LEFT JOIN vendors v ON p.vendorId = v.vendorId
            LEFT JOIN purchase_orders po ON p.purchaseOrderId = po.purchaseOrderId
            WHERE p.payableId = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Payable invoice not found' });
        }
        
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching payable:', error);
        res.status(500).json({ message: 'Error fetching payable', error: error.message });
    }
});

/**
 * @route POST /api/payables
 * @description Create a new payable invoice
 */
router.post('/', async (req, res) => {
    try {
        const { vendorId, purchaseOrderId, invoiceNumber, invoiceDate, dueDate, totalAmount, notes } = req.body;
        
        if (!vendorId || !invoiceNumber || !invoiceDate || !totalAmount) {
            return res.status(400).json({ error: 'Vendor, invoice number, invoice date, and total amount are required' });
        }

        // Check if invoice number already exists
        const [existing] = await pool.query(
            'SELECT payableId FROM payables WHERE invoiceNumber = ?',
            [invoiceNumber]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Invoice number already exists' });
        }

        // Calculate outstanding amount (initially same as total)
        const outstandingAmount = parseFloat(totalAmount) || 0;
        const status = outstandingAmount > 0 ? 'pending' : 'paid';

        const [result] = await pool.query(
            `INSERT INTO payables 
                (vendorId, purchaseOrderId, invoiceNumber, invoiceDate, dueDate, totalAmount, paidAmount, outstandingAmount, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
            [vendorId, purchaseOrderId || null, invoiceNumber, invoiceDate, dueDate || null, totalAmount, outstandingAmount, status, notes || null]
        );
        
        const [newPayable] = await pool.query(`
            SELECT 
                p.*,
                v.vendorName,
                v.contactPerson,
                po.poNumber as purchaseOrderNumber
            FROM payables p
            LEFT JOIN vendors v ON p.vendorId = v.vendorId
            LEFT JOIN purchase_orders po ON p.purchaseOrderId = po.purchaseOrderId
            WHERE p.payableId = ?
        `, [result.insertId]);
        
        res.status(201).json(newPayable[0]);
    } catch (error) {
        console.error('Error creating payable:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Invoice number already exists' });
        }
        res.status(500).json({ message: 'Error creating payable', error: error.message });
    }
});

/**
 * @route PUT /api/payables/:id
 * @description Update a payable invoice
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId, purchaseOrderId, invoiceNumber, invoiceDate, dueDate, totalAmount, notes, status } = req.body;

        // Check if payable exists
        const [existing] = await pool.query(
            'SELECT payableId FROM payables WHERE payableId = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Payable invoice not found' });
        }

        // Check for duplicate invoice number if it's being changed
        if (invoiceNumber) {
            const [duplicate] = await pool.query(
                'SELECT payableId FROM payables WHERE invoiceNumber = ? AND payableId != ?',
                [invoiceNumber, id]
            );
            if (duplicate.length > 0) {
                return res.status(400).json({ error: 'Invoice number already exists' });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (vendorId !== undefined) { updates.push('vendorId = ?'); values.push(vendorId); }
        if (purchaseOrderId !== undefined) { updates.push('purchaseOrderId = ?'); values.push(purchaseOrderId); }
        if (invoiceNumber !== undefined) { updates.push('invoiceNumber = ?'); values.push(invoiceNumber); }
        if (invoiceDate !== undefined) { updates.push('invoiceDate = ?'); values.push(invoiceDate); }
        if (dueDate !== undefined) { updates.push('dueDate = ?'); values.push(dueDate); }
        if (totalAmount !== undefined) {
            updates.push('totalAmount = ?');
            values.push(totalAmount);
            // Recalculate outstanding amount
            const [current] = await pool.query('SELECT paidAmount FROM payables WHERE payableId = ?', [id]);
            const paidAmount = parseFloat(current[0]?.paidAmount || 0);
            const newOutstanding = parseFloat(totalAmount) - paidAmount;
            updates.push('outstandingAmount = ?');
            values.push(newOutstanding);
        }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.query(
            `UPDATE payables SET ${updates.join(', ')}, updatedAt = NOW() WHERE payableId = ?`,
            values
        );

        const [updated] = await pool.query(`
            SELECT 
                p.*,
                v.vendorName,
                v.contactPerson,
                po.poNumber as purchaseOrderNumber
            FROM payables p
            LEFT JOIN vendors v ON p.vendorId = v.vendorId
            LEFT JOIN purchase_orders po ON p.purchaseOrderId = po.purchaseOrderId
            WHERE p.payableId = ?
        `, [id]);
        
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating payable:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Invoice number already exists' });
        }
        res.status(500).json({ message: 'Error updating payable', error: error.message });
    }
});

/**
 * @route DELETE /api/payables/:id
 * @description Delete (cancel) a payable invoice
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if payable exists
        const [existing] = await pool.query(
            'SELECT payableId, status FROM payables WHERE payableId = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Payable invoice not found' });
        }

        // If already paid, don't allow deletion - mark as cancelled instead
        if (existing[0].status === 'paid') {
            await pool.query(
                'UPDATE payables SET status = "cancelled", updatedAt = NOW() WHERE payableId = ?',
                [id]
            );
            return res.status(200).json({ message: 'Payable invoice cancelled (was already paid)' });
        }

        // Otherwise, delete it
        await pool.query('DELETE FROM payables WHERE payableId = ?', [id]);
        
        res.status(200).json({ message: 'Payable invoice deleted successfully' });
    } catch (error) {
        console.error('Error deleting payable:', error);
        res.status(500).json({ message: 'Error deleting payable', error: error.message });
    }
});

/**
 * @route POST /api/payables/:id/payment
 * @description Record a payment against a payable invoice
 */
router.post('/:id/payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentAmount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;

        if (!paymentAmount || paymentAmount <= 0) {
            return res.status(400).json({ error: 'Payment amount is required and must be greater than 0' });
        }

        // Get current payable
        const [payables] = await pool.query('SELECT * FROM payables WHERE payableId = ?', [id]);
        
        if (payables.length === 0) {
            return res.status(404).json({ message: 'Payable invoice not found' });
        }

        const payable = payables[0];
        const currentPaid = parseFloat(payable.paidAmount || 0);
        const newPaid = currentPaid + parseFloat(paymentAmount);
        const outstanding = parseFloat(payable.totalAmount) - newPaid;

        // Determine new status
        let newStatus = payable.status;
        if (outstanding <= 0) {
            newStatus = 'paid';
        } else if (newPaid > 0) {
            newStatus = 'partial';
        }

        // Update payable
        await pool.query(
            `UPDATE payables 
            SET paidAmount = ?, outstandingAmount = ?, status = ?, lastPaymentDate = ?, updatedAt = NOW()
            WHERE payableId = ?`,
            [newPaid, outstanding, newStatus, paymentDate || new Date().toISOString().split('T')[0], id]
        );

        // Get updated payable
        const [updated] = await pool.query(`
            SELECT 
                p.*,
                v.vendorName,
                v.contactPerson,
                po.poNumber as purchaseOrderNumber
            FROM payables p
            LEFT JOIN vendors v ON p.vendorId = v.vendorId
            LEFT JOIN purchase_orders po ON p.purchaseOrderId = po.purchaseOrderId
            WHERE p.payableId = ?
        `, [id]);
        
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Error recording payment', error: error.message });
    }
});

/**
 * @route GET /api/payables/stats/summary
 * @description Get summary statistics for payables
 */
router.get('/stats/summary', async (req, res) => {
    try {
        // Update overdue status before calculating stats
        await pool.query(`
            UPDATE payables 
            SET status = 'overdue', updatedAt = NOW()
            WHERE status IN ('pending', 'partial')
                AND dueDate IS NOT NULL
                AND dueDate < CURDATE()
                AND outstandingAmount > 0
        `);

        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as totalPayables,
                SUM(CASE WHEN status = 'pending' THEN outstandingAmount ELSE 0 END) as pendingAmount,
                SUM(CASE WHEN status = 'overdue' THEN outstandingAmount ELSE 0 END) as overdueAmount,
                SUM(CASE WHEN status = 'paid' THEN totalAmount ELSE 0 END) as paidAmount,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdueCount,
                COUNT(CASE WHEN status = 'paid' AND MONTH(lastPaymentDate) = MONTH(CURDATE()) AND YEAR(lastPaymentDate) = YEAR(CURDATE()) THEN 1 END) as paidThisMonthCount,
                SUM(CASE WHEN status = 'paid' AND MONTH(lastPaymentDate) = MONTH(CURDATE()) AND YEAR(lastPaymentDate) = YEAR(CURDATE()) THEN totalAmount ELSE 0 END) as paidThisMonthAmount
            FROM payables
            WHERE status != 'cancelled'
        `);
        
        res.status(200).json(stats[0] || {
            totalPayables: 0,
            pendingAmount: 0,
            overdueAmount: 0,
            paidAmount: 0,
            pendingCount: 0,
            overdueCount: 0,
            paidThisMonthCount: 0,
            paidThisMonthAmount: 0,
        });
    } catch (error) {
        console.error('Error fetching payable stats:', error);
        res.status(500).json({ message: 'Error fetching payable stats', error: error.message });
    }
});

module.exports = router;

