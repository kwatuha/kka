// Purchase Order routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/procurement/purchase-orders
 * @description Get all purchase orders
 */
router.get('/', async (req, res) => {
    try {
        const { vendorId, status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                po.*,
                v.vendorName,
                v.vendorCode,
                u.firstName as createdByFirstName,
                u.lastName as createdByLastName
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendorId = v.vendorId
            LEFT JOIN users u ON po.createdBy = u.userId
            WHERE 1=1
        `;
        const params = [];

        if (vendorId) {
            query += ` AND po.vendorId = ?`;
            params.push(vendorId);
        }

        if (status) {
            query += ` AND po.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY po.orderDate DESC, po.createdAt DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({ message: 'Error fetching purchase orders', error: error.message });
    }
});

/**
 * @route GET /api/procurement/purchase-orders/:id
 * @description Get a single purchase order with items
 */
router.get('/:id', async (req, res) => {
    try {
        const [orders] = await pool.execute(
            `SELECT 
                po.*,
                v.vendorName,
                v.vendorCode,
                v.contactPerson,
                v.phone,
                v.email,
                v.address,
                u.firstName as createdByFirstName,
                u.lastName as createdByLastName
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendorId = v.vendorId
            LEFT JOIN users u ON po.createdBy = u.userId
            WHERE po.purchaseOrderId = ?`,
            [req.params.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }

        // Get order items
        const [items] = await pool.execute(
            `SELECT 
                poi.*,
                ii.name as inventoryItemName,
                ii.itemCode as inventoryItemCode
            FROM purchase_order_items poi
            LEFT JOIN inventory_items ii ON poi.inventoryItemId = ii.itemId
            WHERE poi.purchaseOrderId = ?
            ORDER BY poi.itemId`,
            [req.params.id]
        );

        res.status(200).json({
            ...orders[0],
            items: items
        });
    } catch (error) {
        console.error('Error fetching purchase order:', error);
        res.status(500).json({ message: 'Error fetching purchase order', error: error.message });
    }
});

/**
 * @route GET /api/procurement/vendors/:vendorId/purchase-orders
 * @description Get all purchase orders for a specific vendor
 */
router.get('/vendors/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                po.*,
                v.vendorName,
                v.vendorCode
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendorId = v.vendorId
            WHERE po.vendorId = ?
        `;
        const params = [vendorId];

        if (status) {
            query += ` AND po.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY po.orderDate DESC, po.createdAt DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching vendor purchase orders:', error);
        res.status(500).json({ message: 'Error fetching vendor purchase orders', error: error.message });
    }
});

/**
 * @route POST /api/procurement/purchase-orders
 * @description Create a new purchase order
 */
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            vendorId,
            requisitionId,
            orderDate,
            expectedDeliveryDate,
            status = 'draft',
            subtotal = 0,
            tax = 0,
            totalAmount = 0,
            currency = 'KES',
            notes,
            createdBy,
            items = []
        } = req.body;

        if (!vendorId || !orderDate) {
            await connection.rollback();
            return res.status(400).json({ message: 'Vendor ID and order date are required' });
        }

        // Generate PO number if not provided
        let poNumber = req.body.poNumber;
        if (!poNumber) {
            const [lastPO] = await connection.execute(
                'SELECT poNumber FROM purchase_orders ORDER BY purchaseOrderId DESC LIMIT 1'
            );
            let poNum = 1;
            if (lastPO.length > 0 && lastPO[0].poNumber) {
                const match = lastPO[0].poNumber.match(/\d+/);
                if (match) {
                    poNum = parseInt(match[0]) + 1;
                }
            }
            poNumber = `PO-${String(poNum).padStart(6, '0')}`;
        }

        // Insert purchase order
        const [result] = await connection.execute(
            `INSERT INTO purchase_orders (
                poNumber, vendorId, requisitionId, orderDate, expectedDeliveryDate,
                status, subtotal, tax, totalAmount, currency, notes, createdBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [poNumber, vendorId, requisitionId || null, orderDate, expectedDeliveryDate || null,
             status, subtotal, tax, totalAmount, currency, notes || null, createdBy || null]
        );

        const purchaseOrderId = result.insertId;

        // Insert order items
        if (items && items.length > 0) {
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO purchase_order_items (
                        purchaseOrderId, inventoryItemId, itemDescription, quantity,
                        unit, unitPrice, totalPrice, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        purchaseOrderId,
                        item.inventoryItemId || null,
                        item.itemDescription,
                        item.quantity,
                        item.unit || null,
                        item.unitPrice,
                        item.totalPrice || (item.quantity * item.unitPrice),
                        item.notes || null
                    ]
                );
            }
        }

        // Get the created order with items
        const [newOrder] = await connection.execute(
            `SELECT 
                po.*,
                v.vendorName,
                v.vendorCode
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendorId = v.vendorId
            WHERE po.purchaseOrderId = ?`,
            [purchaseOrderId]
        );

        const [orderItems] = await connection.execute(
            'SELECT * FROM purchase_order_items WHERE purchaseOrderId = ?',
            [purchaseOrderId]
        );

        await connection.commit();
        res.status(201).json({
            ...newOrder[0],
            items: orderItems
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating purchase order:', error);
        res.status(500).json({ message: 'Error creating purchase order', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/procurement/purchase-orders/:id
 * @description Update a purchase order
 */
router.put('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            orderDate,
            expectedDeliveryDate,
            status,
            subtotal,
            tax,
            totalAmount,
            notes,
            items
        } = req.body;

        // Check if order exists
        const [existing] = await connection.execute(
            'SELECT * FROM purchase_orders WHERE purchaseOrderId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Purchase order not found' });
        }

        // Update purchase order
        await connection.execute(
            `UPDATE purchase_orders SET
                orderDate = ?,
                expectedDeliveryDate = ?,
                status = ?,
                subtotal = ?,
                tax = ?,
                totalAmount = ?,
                notes = ?
            WHERE purchaseOrderId = ?`,
            [
                orderDate !== undefined ? orderDate : existing[0].orderDate,
                expectedDeliveryDate !== undefined ? expectedDeliveryDate : existing[0].expectedDeliveryDate,
                status !== undefined ? status : existing[0].status,
                subtotal !== undefined ? subtotal : existing[0].subtotal,
                tax !== undefined ? tax : existing[0].tax,
                totalAmount !== undefined ? totalAmount : existing[0].totalAmount,
                notes !== undefined ? notes : existing[0].notes,
                req.params.id
            ]
        );

        // Update items if provided
        if (items && Array.isArray(items)) {
            // Delete existing items
            await connection.execute(
                'DELETE FROM purchase_order_items WHERE purchaseOrderId = ?',
                [req.params.id]
            );

            // Insert new items
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO purchase_order_items (
                        purchaseOrderId, inventoryItemId, itemDescription, quantity,
                        unit, unitPrice, totalPrice, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        req.params.id,
                        item.inventoryItemId || null,
                        item.itemDescription,
                        item.quantity,
                        item.unit || null,
                        item.unitPrice,
                        item.totalPrice || (item.quantity * item.unitPrice),
                        item.notes || null
                    ]
                );
            }
        }

        // Get updated order
        const [updatedOrder] = await connection.execute(
            `SELECT 
                po.*,
                v.vendorName,
                v.vendorCode
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendorId = v.vendorId
            WHERE po.purchaseOrderId = ?`,
            [req.params.id]
        );

        const [orderItems] = await connection.execute(
            'SELECT * FROM purchase_order_items WHERE purchaseOrderId = ?',
            [req.params.id]
        );

        await connection.commit();
        res.status(200).json({
            ...updatedOrder[0],
            items: orderItems
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating purchase order:', error);
        res.status(500).json({ message: 'Error updating purchase order', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route DELETE /api/procurement/purchase-orders/:id
 * @description Delete a purchase order (only if in draft status)
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check if order exists and is in draft status
        const [existing] = await pool.execute(
            'SELECT * FROM purchase_orders WHERE purchaseOrderId = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }

        if (existing[0].status !== 'draft') {
            return res.status(400).json({ 
                message: 'Cannot delete purchase order. Only draft orders can be deleted.' 
            });
        }

        // Delete order (items will be deleted via CASCADE)
        await pool.execute(
            'DELETE FROM purchase_orders WHERE purchaseOrderId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        res.status(500).json({ message: 'Error deleting purchase order', error: error.message });
    }
});

module.exports = router;



