// Vendor Contracts routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/procurement/vendors/contracts
 * @description Get all contracts for all vendors (for listing page)
 * NOTE: This route must be defined BEFORE /:vendorId/contracts to avoid route conflicts
 */
router.get('/contracts', async (req, res) => {
    try {
        // Check if table exists first
        const [tables] = await pool.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vendor_contracts'",
            [process.env.DB_NAME || 'kiplombe_hmis']
        );
        
        if (tables.length === 0) {
            return res.status(200).json([]);
        }
        
        const [rows] = await pool.execute(
            `SELECT 
                c.*,
                v.vendorName,
                v.vendorCode,
                u.firstName as createdByFirstName,
                u.lastName as createdByLastName
            FROM vendor_contracts c
            LEFT JOIN vendors v ON c.vendorId = v.vendorId
            LEFT JOIN users u ON c.createdBy = u.userId
            ORDER BY c.startDate DESC`
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching all vendor contracts:', error);
        res.status(200).json([]);
    }
});

/**
 * @route GET /api/procurement/vendors/:vendorId/contracts
 * @description Get all contracts for a vendor
 */
router.get('/:vendorId/contracts', async (req, res) => {
    try {
        // Check if table exists first
        const [tables] = await pool.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vendor_contracts'",
            [process.env.DB_NAME || 'kiplombe_hmis']
        );
        
        if (tables.length === 0) {
            return res.status(200).json([]);
        }
        
        const [rows] = await pool.execute(
            `SELECT 
                c.*,
                u.firstName as createdByFirstName,
                u.lastName as createdByLastName
            FROM vendor_contracts c
            LEFT JOIN users u ON c.createdBy = u.userId
            WHERE c.vendorId = ?
            ORDER BY c.startDate DESC`,
            [req.params.vendorId]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching vendor contracts:', error);
        res.status(200).json([]);
    }
});

/**
 * @route POST /api/procurement/vendors/:vendorId/contracts
 * @description Create a new vendor contract
 */
router.post('/:vendorId/contracts', async (req, res) => {
    try {
        const {
            contractNumber,
            contractType,
            startDate,
            endDate,
            contractValue,
            currency = 'KES',
            status = 'draft',
            renewalOption = false,
            keyTerms,
            notes,
            createdBy
        } = req.body;

        if (!contractNumber || !startDate || !endDate) {
            return res.status(400).json({ message: 'Contract number, start date, and end date are required' });
        }

        const [result] = await pool.execute(
            `INSERT INTO vendor_contracts (
                vendorId, contractNumber, contractType, startDate, endDate,
                contractValue, currency, status, renewalOption, keyTerms, notes, createdBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.params.vendorId, contractNumber, contractType || null, startDate, endDate,
                contractValue || null, currency, status, renewalOption, keyTerms || null, notes || null, createdBy || null
            ]
        );

        const [newContract] = await pool.execute(
            'SELECT * FROM vendor_contracts WHERE contractId = ?',
            [result.insertId]
        );

        res.status(201).json(newContract[0]);
    } catch (error) {
        console.error('Error creating vendor contract:', error);
        res.status(500).json({ message: 'Error creating vendor contract', error: error.message });
    }
});

/**
 * @route PUT /api/procurement/vendors/:vendorId/contracts/:id
 * @description Update a vendor contract
 */
router.put('/:vendorId/contracts/:id', async (req, res) => {
    try {
        const {
            contractType,
            startDate,
            endDate,
            contractValue,
            currency,
            status,
            renewalOption,
            keyTerms,
            notes
        } = req.body;

        const [existing] = await pool.execute(
            'SELECT * FROM vendor_contracts WHERE contractId = ? AND vendorId = ?',
            [req.params.id, req.params.vendorId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        await pool.execute(
            `UPDATE vendor_contracts SET
                contractType = ?,
                startDate = ?,
                endDate = ?,
                contractValue = ?,
                currency = ?,
                status = ?,
                renewalOption = ?,
                keyTerms = ?,
                notes = ?
            WHERE contractId = ? AND vendorId = ?`,
            [
                contractType !== undefined ? contractType : existing[0].contractType,
                startDate !== undefined ? startDate : existing[0].startDate,
                endDate !== undefined ? endDate : existing[0].endDate,
                contractValue !== undefined ? contractValue : existing[0].contractValue,
                currency !== undefined ? currency : existing[0].currency,
                status !== undefined ? status : existing[0].status,
                renewalOption !== undefined ? renewalOption : existing[0].renewalOption,
                keyTerms !== undefined ? keyTerms : existing[0].keyTerms,
                notes !== undefined ? notes : existing[0].notes,
                req.params.id,
                req.params.vendorId
            ]
        );

        const [updatedContract] = await pool.execute(
            'SELECT * FROM vendor_contracts WHERE contractId = ?',
            [req.params.id]
        );

        res.status(200).json(updatedContract[0]);
    } catch (error) {
        console.error('Error updating vendor contract:', error);
        res.status(500).json({ message: 'Error updating vendor contract', error: error.message });
    }
});

/**
 * @route DELETE /api/procurement/vendors/:vendorId/contracts/:id
 * @description Delete a vendor contract
 */
router.delete('/:vendorId/contracts/:id', async (req, res) => {
    try {
        const [existing] = await pool.execute(
            'SELECT * FROM vendor_contracts WHERE contractId = ? AND vendorId = ?',
            [req.params.id, req.params.vendorId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        await pool.execute(
            'DELETE FROM vendor_contracts WHERE contractId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Contract deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor contract:', error);
        res.status(500).json({ message: 'Error deleting vendor contract', error: error.message });
    }
});

module.exports = router;

