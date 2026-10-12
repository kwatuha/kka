// Vendor Issues routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/procurement/vendors/:vendorId/issues
 * @description Get all issues for a vendor
 */
router.get('/:vendorId/issues', async (req, res) => {
    try {
        // Check if table exists first
        const [tables] = await pool.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vendor_issues'",
            [process.env.DB_NAME || 'kiplombe_hmis']
        );
        
        if (tables.length === 0) {
            return res.status(200).json([]);
        }
        
        const { status, priority } = req.query;
        let query = `
            SELECT 
                i.*,
                u1.firstName as reportedByFirstName,
                u1.lastName as reportedByLastName,
                u2.firstName as resolvedByFirstName,
                u2.lastName as resolvedByLastName
            FROM vendor_issues i
            LEFT JOIN users u1 ON i.reportedBy = u1.userId
            LEFT JOIN users u2 ON i.resolvedBy = u2.userId
            WHERE i.vendorId = ?
        `;
        const params = [req.params.vendorId];

        if (status) {
            query += ` AND i.status = ?`;
            params.push(status);
        }

        if (priority) {
            query += ` AND i.priority = ?`;
            params.push(priority);
        }

        query += ` ORDER BY i.issueDate DESC, i.createdAt DESC`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching vendor issues:', error);
        res.status(200).json([]);
    }
});

/**
 * @route POST /api/procurement/vendors/:vendorId/issues
 * @description Create a new vendor issue
 */
router.post('/:vendorId/issues', async (req, res) => {
    try {
        const {
            issueTitle,
            issueDate,
            description,
            status = 'open',
            priority = 'medium',
            reportedBy
        } = req.body;

        if (!issueTitle || !issueDate || !description) {
            return res.status(400).json({ message: 'Issue title, date, and description are required' });
        }

        const [result] = await pool.execute(
            `INSERT INTO vendor_issues (
                vendorId, issueTitle, issueDate, description, status, priority, reportedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.params.vendorId,
                issueTitle,
                issueDate,
                description,
                status,
                priority,
                reportedBy || null
            ]
        );

        const [newIssue] = await pool.execute(
            'SELECT * FROM vendor_issues WHERE issueId = ?',
            [result.insertId]
        );

        res.status(201).json(newIssue[0]);
    } catch (error) {
        console.error('Error creating vendor issue:', error);
        res.status(500).json({ message: 'Error creating vendor issue', error: error.message });
    }
});

/**
 * @route PUT /api/procurement/vendors/:vendorId/issues/:id
 * @description Update a vendor issue
 */
router.put('/:vendorId/issues/:id', async (req, res) => {
    try {
        const {
            issueTitle,
            issueDate,
            description,
            status,
            resolution,
            resolvedBy,
            resolvedDate,
            priority
        } = req.body;

        const [existing] = await pool.execute(
            'SELECT * FROM vendor_issues WHERE issueId = ? AND vendorId = ?',
            [req.params.id, req.params.vendorId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        await pool.execute(
            `UPDATE vendor_issues SET
                issueTitle = ?,
                issueDate = ?,
                description = ?,
                status = ?,
                resolution = ?,
                resolvedBy = ?,
                resolvedDate = ?,
                priority = ?
            WHERE issueId = ? AND vendorId = ?`,
            [
                issueTitle !== undefined ? issueTitle : existing[0].issueTitle,
                issueDate !== undefined ? issueDate : existing[0].issueDate,
                description !== undefined ? description : existing[0].description,
                status !== undefined ? status : existing[0].status,
                resolution !== undefined ? resolution : existing[0].resolution,
                resolvedBy !== undefined ? resolvedBy : existing[0].resolvedBy,
                resolvedDate !== undefined ? resolvedDate : existing[0].resolvedDate,
                priority !== undefined ? priority : existing[0].priority,
                req.params.id,
                req.params.vendorId
            ]
        );

        const [updatedIssue] = await pool.execute(
            'SELECT * FROM vendor_issues WHERE issueId = ?',
            [req.params.id]
        );

        res.status(200).json(updatedIssue[0]);
    } catch (error) {
        console.error('Error updating vendor issue:', error);
        res.status(500).json({ message: 'Error updating vendor issue', error: error.message });
    }
});

/**
 * @route DELETE /api/procurement/vendors/:vendorId/issues/:id
 * @description Delete a vendor issue
 */
router.delete('/:vendorId/issues/:id', async (req, res) => {
    try {
        const [existing] = await pool.execute(
            'SELECT * FROM vendor_issues WHERE issueId = ? AND vendorId = ?',
            [req.params.id, req.params.vendorId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        await pool.execute(
            'DELETE FROM vendor_issues WHERE issueId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Issue deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor issue:', error);
        res.status(500).json({ message: 'Error deleting vendor issue', error: error.message });
    }
});

module.exports = router;

