// Inventory Transaction routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/inventory/transactions
 * @description Get all inventory transactions with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { itemId, transactionType, startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        
        console.log('=== FETCHING INVENTORY TRANSACTIONS ===');
        console.log('Query params received:', { itemId, transactionType, startDate, endDate, page, limit });
        
        let query = `SELECT 
                it.*,
                ii.name as itemName,
                ii.itemCode,
                u.firstName as performedByFirstName,
                u.lastName as performedByLastName
            FROM inventory_transactions it
            LEFT JOIN inventory_items ii ON it.itemId = ii.itemId
            LEFT JOIN users u ON it.performedBy = u.userId
            WHERE 1=1`;
        const params = [];

        if (itemId) {
            const itemIdInt = parseInt(itemId);
            if (isNaN(itemIdInt)) {
                console.error('Invalid itemId provided:', itemId);
                return res.status(400).json({ message: 'Invalid itemId parameter' });
            }
            query += ' AND it.itemId = ?';
            params.push(itemIdInt);
            console.log('Filtering transactions by itemId:', itemIdInt);
        }

        if (transactionType) {
            query += ' AND it.transactionType = ?';
            params.push(transactionType);
            console.log('Filtering by transactionType:', transactionType);
        }

        if (startDate) {
            query += ' AND it.transactionDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND it.transactionDate <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY it.transactionDate DESC, it.createdAt DESC';
        const offsetInt = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        // Ensure limit and offset are integers
        params.push(Number(limit), Number(offsetInt));

        console.log('Final SQL Query:', query.replace(/\s+/g, ' ').trim());
        console.log('Query parameters:', params);
        console.log('Parameter types:', params.map(p => typeof p));
        console.log('Number of placeholders in query:', (query.match(/\?/g) || []).length);
        console.log('Number of parameters:', params.length);
        
        // Use query instead of execute to avoid prepared statement issues
        const [rows] = await pool.query(query, params);
        
        console.log(`Found ${rows.length} transactions`);
        if (rows.length > 0) {
            console.log('Sample transaction:', {
                transactionId: rows[0].transactionId,
                itemId: rows[0].itemId,
                transactionType: rows[0].transactionType,
                transactionNumber: rows[0].transactionNumber
            });
        }
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching inventory transactions:', error);
        res.status(500).json({ message: 'Error fetching inventory transactions', error: error.message });
    }
});

/**
 * @route GET /api/inventory/transactions/:id
 * @description Get a single inventory transaction by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                it.*,
                ii.name as itemName,
                ii.itemCode,
                u.firstName as performedByFirstName,
                u.lastName as performedByLastName
            FROM inventory_transactions it
            LEFT JOIN inventory_items ii ON it.itemId = ii.itemId
            LEFT JOIN users u ON it.performedBy = u.userId
            WHERE it.transactionId = ?
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching inventory transaction:', error);
        res.status(500).json({ message: 'Error fetching inventory transaction', error: error.message });
    }
});

/**
 * @route POST /api/inventory/transactions
 * @description Create a new inventory transaction (adjustment)
 */
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const transactionData = req.body;
        const userId = req.user?.id || 1; // Default to user 1 if not authenticated

        // Generate transaction number
        const [lastTransaction] = await connection.execute(
            'SELECT transactionNumber FROM inventory_transactions WHERE transactionNumber LIKE ? ORDER BY transactionId DESC LIMIT 1',
            ['TXN-%']
        );
        
        let transactionNumber;
        if (lastTransaction.length > 0) {
            const lastNum = parseInt(lastTransaction[0].transactionNumber.split('-')[1]) || 0;
            transactionNumber = `TXN-${String(lastNum + 1).padStart(6, '0')}`;
        } else {
            transactionNumber = 'TXN-000001';
        }

        // Determine quantity (positive for add, negative for subtract)
        const quantity = transactionData.adjustmentType === 'add' 
            ? Math.abs(parseInt(transactionData.quantity))
            : -Math.abs(parseInt(transactionData.quantity));

        // Map adjustment reasons to transaction types
        const reasonToType = {
            'purchase': 'receipt',
            'return': 'return',
            'damage': 'wastage',
            'expiry': 'expiry',
            'correction': 'adjustment',
            'use': 'issue',
            'transfer': 'transfer',
            'other': 'adjustment'
        };

        const transactionType = transactionData.transactionType || reasonToType[transactionData.reason] || 'adjustment';

        // Insert transaction
        const itemIdInt = parseInt(transactionData.itemId);
        if (isNaN(itemIdInt)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid itemId provided' });
        }
        
        console.log('=== CREATING INVENTORY TRANSACTION ===');
        console.log('Transaction data:', {
            transactionNumber,
            itemId: itemIdInt,
            transactionType,
            quantity,
            reason: transactionData.reason,
            date: transactionData.date || new Date().toISOString().split('T')[0],
            performedBy: userId
        });
        
        const [result] = await connection.execute(
            `INSERT INTO inventory_transactions 
            (transactionNumber, itemId, transactionType, transactionDate, quantity, unitPrice, totalValue, 
             batchNumber, expiryDate, fromLocation, toLocation, referenceNumber, referenceType, reason, performedBy, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transactionNumber,
                itemIdInt,
                transactionType,
                transactionData.date || new Date().toISOString().split('T')[0],
                quantity,
                transactionData.unitPrice || null,
                transactionData.totalValue || null,
                transactionData.batchNumber || null,
                transactionData.expiryDate || null,
                transactionData.fromLocation || null,
                transactionData.toLocation || null,
                transactionData.referenceNumber || null,
                transactionData.referenceType || null,
                transactionData.reason || null,
                userId,
                transactionData.notes || null
            ]
        );
        
        console.log('Transaction created successfully with ID:', result.insertId);
        
        // Verify the transaction was saved correctly
        const [verify] = await connection.execute(
            'SELECT transactionId, itemId, transactionType, quantity, reason FROM inventory_transactions WHERE transactionId = ?',
            [result.insertId]
        );
        console.log('Verified saved transaction:', verify[0]);

        // Update inventory item quantity
        const [itemUpdate] = await connection.execute(
            'UPDATE inventory_items SET quantity = quantity + ? WHERE itemId = ?',
            [quantity, transactionData.itemId]
        );

        if (itemUpdate.affectedRows === 0) {
            throw new Error('Inventory item not found');
        }

        await connection.commit();

        // Fetch the created transaction
        const [newTransaction] = await connection.execute(`
            SELECT 
                it.*,
                ii.name as itemName,
                ii.itemCode,
                u.firstName as performedByFirstName,
                u.lastName as performedByLastName
            FROM inventory_transactions it
            LEFT JOIN inventory_items ii ON it.itemId = ii.itemId
            LEFT JOIN users u ON it.performedBy = u.userId
            WHERE it.transactionId = ?
        `, [result.insertId]);

        res.status(201).json(newTransaction[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating inventory transaction:', error);
        res.status(500).json({ message: 'Error creating inventory transaction', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/inventory/transactions/:id
 * @description Update an inventory transaction (only if it hasn't affected stock yet)
 */
router.put('/:id', async (req, res) => {
    try {
        const transactionData = req.body;
        const transactionId = req.params.id;

        // Check if transaction exists
        const [existing] = await pool.execute('SELECT * FROM inventory_transactions WHERE transactionId = ?', [transactionId]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Update transaction (note: updating transactions that have already affected stock is complex)
        // For now, we'll only allow updating notes and reference fields
        const [result] = await pool.execute(
            `UPDATE inventory_transactions 
             SET notes = ?, referenceNumber = ?, referenceType = ?
             WHERE transactionId = ?`,
            [
                transactionData.notes || null,
                transactionData.referenceNumber || null,
                transactionData.referenceType || null,
                transactionId
            ]
        );

        const [updatedTransaction] = await pool.execute(`
            SELECT 
                it.*,
                ii.name as itemName,
                ii.itemCode,
                u.firstName as performedByFirstName,
                u.lastName as performedByLastName
            FROM inventory_transactions it
            LEFT JOIN inventory_items ii ON it.itemId = ii.itemId
            LEFT JOIN users u ON it.performedBy = u.userId
            WHERE it.transactionId = ?
        `, [transactionId]);

        res.status(200).json(updatedTransaction[0]);
    } catch (error) {
        console.error('Error updating inventory transaction:', error);
        res.status(500).json({ message: 'Error updating inventory transaction', error: error.message });
    }
});

/**
 * @route DELETE /api/inventory/transactions/:id
 * @description Delete (reverse) an inventory transaction
 */
router.delete('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get the transaction
        const [transaction] = await connection.execute(
            'SELECT * FROM inventory_transactions WHERE transactionId = ?',
            [req.params.id]
        );

        if (transaction.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const trans = transaction[0];

        // Reverse the quantity adjustment
        await connection.execute(
            'UPDATE inventory_items SET quantity = quantity - ? WHERE itemId = ?',
            [trans.quantity, trans.itemId]
        );

        // Delete the transaction
        await connection.execute(
            'DELETE FROM inventory_transactions WHERE transactionId = ?',
            [req.params.id]
        );

        await connection.commit();

        res.status(200).json({ message: 'Transaction deleted and stock reversed successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting inventory transaction:', error);
        res.status(500).json({ message: 'Error deleting inventory transaction', error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;


