// Inventory routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/inventory
 * @description Get all inventory items with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { category, status, search, lowStock } = req.query;
        let query = 'SELECT * FROM inventory_items WHERE 1=1';
        const params = [];

        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        } else {
            query += ' AND status != "Expired"';
        }

        if (category && category !== 'all') {
            query += ' AND category = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (name LIKE ? OR itemCode LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (lowStock === 'true') {
            query += ' AND quantity <= reorderLevel';
        }

        query += ' ORDER BY name';

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Error fetching inventory', error: error.message });
    }
});

/**
 * @route GET /api/inventory/summary
 * @description Get inventory summary statistics
 */
router.get('/summary', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as totalItems,
                SUM(quantity * unitPrice) as totalValue,
                SUM(CASE WHEN quantity <= reorderLevel THEN 1 ELSE 0 END) as lowStockItems,
                SUM(CASE WHEN expiryDate IS NOT NULL AND expiryDate <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) as expiringItems,
                COUNT(DISTINCT category) as categories,
                COUNT(DISTINCT location) as locations
            FROM inventory_items
            WHERE status != 'Expired'
        `);

        const [categoryCounts] = await pool.execute(`
            SELECT category, COUNT(*) as count
            FROM inventory_items
            WHERE status != 'Expired'
            GROUP BY category
        `);

        res.status(200).json({
            ...stats[0],
            categoryCounts: categoryCounts
        });
    } catch (error) {
        console.error('Error fetching inventory summary:', error);
        res.status(500).json({ message: 'Error fetching inventory summary', error: error.message });
    }
});

/**
 * @route GET /api/inventory/analytics
 * @description Get inventory analytics data
 */
router.get('/analytics', async (req, res) => {
    try {
        const { timeRange = '6months' } = req.query;
        
        // Calculate date range
        let monthsBack = 6;
        if (timeRange === '30days') monthsBack = 1;
        else if (timeRange === '3months') monthsBack = 3;
        else if (timeRange === '6months') monthsBack = 6;
        else if (timeRange === '1year') monthsBack = 12;

        // Stock value by category
        const [stockValueByCategory] = await pool.query(`
            SELECT 
                COALESCE(category, 'Uncategorized') as name,
                SUM(COALESCE(quantity, 0) * COALESCE(unitPrice, 0)) as value
            FROM inventory_items
            WHERE status = 'Active'
            GROUP BY category
            ORDER BY SUM(COALESCE(quantity, 0) * COALESCE(unitPrice, 0)) DESC
        `);

        // Stock movement data (monthly)
        const [stockMovementData] = await pool.query(`
            SELECT 
                DATE_FORMAT(transactionDate, '%b') as name,
                SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) as stockIn,
                SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END) as stockOut
            FROM inventory_transactions
            WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(transactionDate, '%Y-%m'), DATE_FORMAT(transactionDate, '%b')
            ORDER BY MIN(DATE_FORMAT(transactionDate, '%Y-%m'))
        `, [monthsBack]);

        // Top moving items
        const [topMovingItems] = await pool.query(`
            SELECT 
                MAX(ii.name) as name,
                SUM(ABS(it.quantity)) as value
            FROM inventory_transactions it
            JOIN inventory_items ii ON it.itemId = ii.itemId
            WHERE it.transactionDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY it.itemId
            ORDER BY SUM(ABS(it.quantity)) DESC
            LIMIT 10
        `, [monthsBack]);

        // Expiry analysis
        const [expiryData] = await pool.query(`
            SELECT 
                name,
                value
            FROM (
                SELECT 
                    CASE 
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 0 AND 30 THEN '0-30 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 31 AND 60 THEN '31-60 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 61 AND 90 THEN '61-90 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 91 AND 180 THEN '91-180 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 181 AND 365 THEN '181-365 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) > 365 THEN '>365 days'
                        ELSE 'Expired'
                    END as name,
                    COUNT(*) as value
                FROM inventory_items
                WHERE expiryDate IS NOT NULL
                GROUP BY 
                    CASE 
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 0 AND 30 THEN '0-30 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 31 AND 60 THEN '31-60 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 61 AND 90 THEN '61-90 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 91 AND 180 THEN '91-180 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) BETWEEN 181 AND 365 THEN '181-365 days'
                        WHEN DATEDIFF(expiryDate, CURDATE()) > 365 THEN '>365 days'
                        ELSE 'Expired'
                    END
            ) as expiry_groups
            ORDER BY 
                CASE name
                    WHEN '0-30 days' THEN 1
                    WHEN '31-60 days' THEN 2
                    WHEN '61-90 days' THEN 3
                    WHEN '91-180 days' THEN 4
                    WHEN '181-365 days' THEN 5
                    WHEN '>365 days' THEN 6
                    ELSE 7
                END
        `);

        // Category detailed breakdown
        const [categoryBreakdown] = await pool.query(`
            SELECT 
                COALESCE(category, 'Uncategorized') as category,
                itemId,
                itemCode,
                name,
                quantity,
                unitPrice,
                (quantity * COALESCE(unitPrice, 0)) as totalValue,
                unit,
                location,
                status,
                reorderLevel,
                CASE 
                    WHEN quantity <= reorderLevel THEN 'Low Stock'
                    WHEN quantity <= (reorderLevel * 1.5) THEN 'Warning'
                    ELSE 'In Stock'
                END as stockStatus
            FROM inventory_items
            WHERE status = 'Active'
            ORDER BY category, name
        `);

        // Group items by category
        const categoryDetails = {};
        categoryBreakdown.forEach((item) => {
            const cat = item.category || 'Uncategorized';
            if (!categoryDetails[cat]) {
                categoryDetails[cat] = {
                    category: cat,
                    items: [],
                    totalItems: 0,
                    totalQuantity: 0,
                    totalValue: 0
                };
            }
            categoryDetails[cat].items.push({
                itemId: item.itemId,
                itemCode: item.itemCode,
                name: item.name,
                quantity: item.quantity,
                unitPrice: parseFloat(item.unitPrice) || 0,
                totalValue: parseFloat(item.totalValue) || 0,
                unit: item.unit,
                location: item.location,
                stockStatus: item.stockStatus,
                reorderLevel: item.reorderLevel
            });
            categoryDetails[cat].totalItems += 1;
            categoryDetails[cat].totalQuantity += parseInt(item.quantity) || 0;
            categoryDetails[cat].totalValue += parseFloat(item.totalValue) || 0;
        });

        res.status(200).json({
            stockValueByCategory: stockValueByCategory || [],
            stockMovementData: stockMovementData || [],
            topMovingItems: topMovingItems || [],
            expiryData: expiryData || [],
            categoryBreakdown: Object.values(categoryDetails) || []
        });
    } catch (error) {
        console.error('Error fetching inventory analytics:', error);
        res.status(500).json({ message: 'Error fetching inventory analytics', error: error.message });
    }
});

/**
 * @route GET /api/inventory/:id
 * @description Get a single inventory item by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM inventory_items WHERE itemId = ?', [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ message: 'Error fetching inventory item', error: error.message });
    }
});

/**
 * @route POST /api/inventory
 * @description Create a new inventory item
 */
router.post('/', async (req, res) => {
    try {
        const itemData = req.body;
        const userId = req.user?.id || 1; // Default to user 1 if not authenticated

        // Generate itemCode if not provided
        let itemCode = itemData.itemCode;
        if (!itemCode) {
            const [lastItem] = await pool.execute('SELECT itemCode FROM inventory_items WHERE itemCode LIKE ? ORDER BY itemId DESC LIMIT 1', ['INV-%']);
            if (lastItem.length > 0) {
                const lastNum = parseInt(lastItem[0].itemCode.split('-')[1]) || 0;
                itemCode = `INV-${String(lastNum + 1).padStart(6, '0')}`;
            } else {
                itemCode = 'INV-000001';
            }
        }

        const [result] = await pool.execute(
            'INSERT INTO inventory_items (itemCode, name, category, unit, quantity, reorderLevel, unitPrice, supplier, expiryDate, location, description, status, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                itemCode,
                itemData.name,
                itemData.category,
                itemData.unit,
                itemData.quantity || 0,
                itemData.reorderLevel || 0,
                itemData.unitPrice,
                itemData.supplier,
                itemData.expiryDate || null,
                itemData.location,
                itemData.description,
                itemData.status || 'Active',
                userId
            ]
        );

        const [newItem] = await pool.execute('SELECT * FROM inventory_items WHERE itemId = ?', [result.insertId]);
        res.status(201).json(newItem[0]);
    } catch (error) {
        console.error('Error creating inventory item:', error);
        res.status(500).json({ message: 'Error creating inventory item', error: error.message });
    }
});

/**
 * @route PUT /api/inventory/:id
 * @description Update an inventory item
 */
router.put('/:id', async (req, res) => {
    try {
        const itemData = req.body;
        const itemId = req.params.id;

        // Check if item exists
        const [existing] = await pool.execute('SELECT * FROM inventory_items WHERE itemId = ?', [itemId]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        const [result] = await pool.execute(
            `UPDATE inventory_items 
             SET name = ?, category = ?, unit = ?, quantity = ?, reorderLevel = ?, 
                 unitPrice = ?, supplier = ?, expiryDate = ?, location = ?, 
                 description = ?, status = ?
             WHERE itemId = ?`,
            [
                itemData.name,
                itemData.category,
                itemData.unit,
                itemData.quantity,
                itemData.reorderLevel,
                itemData.unitPrice,
                itemData.supplier,
                itemData.expiryDate || null,
                itemData.location,
                itemData.description,
                itemData.status || 'Active',
                itemId
            ]
        );

        const [updatedItem] = await pool.execute('SELECT * FROM inventory_items WHERE itemId = ?', [itemId]);
        res.status(200).json(updatedItem[0]);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ message: 'Error updating inventory item', error: error.message });
    }
});

/**
 * @route DELETE /api/inventory/:id
 * @description Delete (soft delete) an inventory item
 */
router.delete('/:id', async (req, res) => {
    try {
        const itemId = req.params.id;

        // Check if item exists
        const [existing] = await pool.execute('SELECT * FROM inventory_items WHERE itemId = ?', [itemId]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        // Soft delete by setting status to Inactive
        await pool.execute('UPDATE inventory_items SET status = "Inactive" WHERE itemId = ?', [itemId]);

        res.status(200).json({ message: 'Inventory item deleted successfully' });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ message: 'Error deleting inventory item', error: error.message });
    }
});

module.exports = router;

