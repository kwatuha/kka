// Vendor Products routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/procurement/vendors/:vendorId/products
 * @description Get all products for a vendor
 */
router.get('/:vendorId/products', async (req, res) => {
    try {
        // Check if table exists first
        const [tables] = await pool.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vendor_products'",
            [process.env.DB_NAME || 'kiplombe_hmis']
        );
        
        if (tables.length === 0) {
            // Table doesn't exist yet, return empty array
            return res.status(200).json([]);
        }
        
        const [rows] = await pool.execute(
            'SELECT * FROM vendor_products WHERE vendorId = ? AND isActive = TRUE ORDER BY productName',
            [req.params.vendorId]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching vendor products:', error);
        // Return empty array instead of error to prevent app-wide crashes
        res.status(200).json([]);
    }
});

/**
 * @route POST /api/procurement/vendors/:vendorId/products
 * @description Create a new vendor product
 */
router.post('/:vendorId/products', async (req, res) => {
    try {
        // Check if table exists first
        const [tables] = await pool.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vendor_products'",
            [process.env.DB_NAME || 'kiplombe_hmis']
        );
        
        if (tables.length === 0) {
            return res.status(503).json({ message: 'Vendor products table not yet created. Please run the database migration.' });
        }
        
        const { productCode, productName, category, unit, unitPrice, description, isActive = true } = req.body;

        if (!productName || !unitPrice) {
            return res.status(400).json({ message: 'Product name and unit price are required' });
        }

        const [result] = await pool.execute(
            `INSERT INTO vendor_products (
                vendorId, productCode, productName, category, unit, unitPrice, description, isActive
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.vendorId, productCode || null, productName, category || null, unit || null, unitPrice, description || null, isActive]
        );

        const [newProduct] = await pool.execute(
            'SELECT * FROM vendor_products WHERE productId = ?',
            [result.insertId]
        );

        res.status(201).json(newProduct[0]);
    } catch (error) {
        console.error('Error creating vendor product:', error);
        res.status(500).json({ message: 'Error creating vendor product', error: error.message });
    }
});

/**
 * @route PUT /api/procurement/vendors/:vendorId/products/:id
 * @description Update a vendor product
 */
router.put('/:vendorId/products/:id', async (req, res) => {
    try {
        const { productCode, productName, category, unit, unitPrice, description, isActive } = req.body;

        // Check if product exists
        const [existing] = await pool.execute(
            'SELECT * FROM vendor_products WHERE productId = ? AND vendorId = ?',
            [req.params.id, req.params.vendorId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await pool.execute(
            `UPDATE vendor_products SET
                productCode = ?,
                productName = ?,
                category = ?,
                unit = ?,
                unitPrice = ?,
                description = ?,
                isActive = ?
            WHERE productId = ? AND vendorId = ?`,
            [
                productCode !== undefined ? productCode : existing[0].productCode,
                productName !== undefined ? productName : existing[0].productName,
                category !== undefined ? category : existing[0].category,
                unit !== undefined ? unit : existing[0].unit,
                unitPrice !== undefined ? unitPrice : existing[0].unitPrice,
                description !== undefined ? description : existing[0].description,
                isActive !== undefined ? isActive : existing[0].isActive,
                req.params.id,
                req.params.vendorId
            ]
        );

        const [updatedProduct] = await pool.execute(
            'SELECT * FROM vendor_products WHERE productId = ?',
            [req.params.id]
        );

        res.status(200).json(updatedProduct[0]);
    } catch (error) {
        console.error('Error updating vendor product:', error);
        res.status(500).json({ message: 'Error updating vendor product', error: error.message });
    }
});

/**
 * @route DELETE /api/procurement/vendors/:vendorId/products/:id
 * @description Soft delete a vendor product (set isActive to false)
 */
router.delete('/:vendorId/products/:id', async (req, res) => {
    try {
        const [existing] = await pool.execute(
            'SELECT * FROM vendor_products WHERE productId = ? AND vendorId = ?',
            [req.params.id, req.params.vendorId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await pool.execute(
            'UPDATE vendor_products SET isActive = FALSE WHERE productId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor product:', error);
        res.status(500).json({ message: 'Error deleting vendor product', error: error.message });
    }
});

module.exports = router;

