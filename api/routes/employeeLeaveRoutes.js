// Employee Leave routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/employees/:employeeId/leave
 * @description Get all leave records for an employee
 */
router.get('/:employeeId/leave', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { status, leaveType, startDate, endDate } = req.query;

        let query = `
            SELECT 
                el.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                e.employeeNumber,
                CONCAT(u.firstName, ' ', u.lastName) as approvedByName
            FROM employee_leave el
            JOIN employees e ON el.employeeId = e.employeeId
            LEFT JOIN users u ON el.approvedBy = u.userId
            WHERE el.employeeId = ?
        `;
        const params = [parseInt(employeeId)];

        if (status) {
            query += ' AND el.status = ?';
            params.push(status);
        }

        if (leaveType) {
            query += ' AND el.leaveType = ?';
            params.push(leaveType);
        }

        if (startDate) {
            query += ' AND el.startDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND el.endDate <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY el.startDate DESC, el.requestedDate DESC';

        const [rows] = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching leave records:', error);
        res.status(500).json({ message: 'Error fetching leave records', error: error.message });
    }
});

/**
 * @route GET /api/employees/leave
 * @description Get all leave records (for admin/HR view)
 */
router.get('/leave', async (req, res) => {
    try {
        const { status, leaveType, employeeId, startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                el.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                e.employeeNumber,
                d.departmentName,
                CONCAT(u.firstName, ' ', u.lastName) as approvedByName
            FROM employee_leave el
            JOIN employees e ON el.employeeId = e.employeeId
            LEFT JOIN departments d ON e.departmentId = d.departmentId
            LEFT JOIN users u ON el.approvedBy = u.userId
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND el.status = ?';
            params.push(status);
        }

        if (leaveType) {
            query += ' AND el.leaveType = ?';
            params.push(leaveType);
        }

        if (employeeId) {
            query += ' AND el.employeeId = ?';
            params.push(parseInt(employeeId));
        }

        if (startDate) {
            query += ' AND el.startDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND el.endDate <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY el.startDate DESC, el.requestedDate DESC';
        query += ' LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const [rows] = await pool.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM employee_leave el
            WHERE 1=1
        `;
        const countParams = [];

        if (status) countParams.push(status) && (countQuery += ' AND status = ?');
        if (leaveType) countParams.push(leaveType) && (countQuery += ' AND leaveType = ?');
        if (employeeId) countParams.push(parseInt(employeeId)) && (countQuery += ' AND employeeId = ?');
        if (startDate) countParams.push(startDate) && (countQuery += ' AND startDate >= ?');
        if (endDate) countParams.push(endDate) && (countQuery += ' AND endDate <= ?');

        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0]?.total || 0;

        res.status(200).json({
            leaves: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching leave records:', error);
        res.status(500).json({ message: 'Error fetching leave records', error: error.message });
    }
});

/**
 * @route POST /api/employees/:employeeId/leave
 * @description Create a new leave request
 */
router.post('/:employeeId/leave', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const {
            leaveType,
            startDate,
            endDate,
            daysRequested,
            notes
        } = req.body;

        if (!leaveType || !startDate || !endDate || !daysRequested) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Calculate days if not provided
        const start = new Date(startDate);
        const end = new Date(endDate);
        const calculatedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        const [result] = await pool.execute(`
            INSERT INTO employee_leave (
                employeeId, leaveType, startDate, endDate, daysRequested,
                status, requestedDate, notes
            ) VALUES (?, ?, ?, ?, ?, 'pending', CURDATE(), ?)
        `, [
            parseInt(employeeId),
            leaveType,
            startDate,
            endDate,
            daysRequested || calculatedDays,
            notes || null
        ]);

        // Fetch the created leave
        const [newLeave] = await pool.execute(`
            SELECT 
                el.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                e.employeeNumber
            FROM employee_leave el
            JOIN employees e ON el.employeeId = e.employeeId
            WHERE el.leaveId = ?
        `, [result.insertId]);

        res.status(201).json(newLeave[0]);
    } catch (error) {
        console.error('Error creating leave request:', error);
        res.status(500).json({ message: 'Error creating leave request', error: error.message });
    }
});

/**
 * @route PUT /api/employees/leave/:leaveId
 * @description Update leave request (approve/reject/cancel)
 */
router.put('/leave/:leaveId', async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { status, approvedBy, rejectionReason, notes } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const updateData = {
            status,
            notes: notes || null
        };

        if (status === 'approved' && approvedBy) {
            updateData.approvedBy = approvedBy;
            updateData.approvedDate = new Date().toISOString().split('T')[0];
        }

        if (status === 'rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }

        await pool.execute(`
            UPDATE employee_leave SET
                status = ?,
                approvedBy = ?,
                approvedDate = ?,
                rejectionReason = ?,
                notes = ?
            WHERE leaveId = ?
        `, [
            status,
            updateData.approvedBy || null,
            updateData.approvedDate || null,
            rejectionReason || null,
            updateData.notes,
            parseInt(leaveId)
        ]);

        // Fetch updated leave
        const [updatedLeave] = await pool.execute(`
            SELECT 
                el.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                e.employeeNumber,
                CONCAT(u.firstName, ' ', u.lastName) as approvedByName
            FROM employee_leave el
            JOIN employees e ON el.employeeId = e.employeeId
            LEFT JOIN users u ON el.approvedBy = u.userId
            WHERE el.leaveId = ?
        `, [leaveId]);

        res.status(200).json(updatedLeave[0]);
    } catch (error) {
        console.error('Error updating leave request:', error);
        res.status(500).json({ message: 'Error updating leave request', error: error.message });
    }
});

/**
 * @route DELETE /api/employees/leave/:leaveId
 * @description Delete a leave record
 */
router.delete('/leave/:leaveId', async (req, res) => {
    try {
        const { leaveId } = req.params;

        // Check if leave exists
        const [existing] = await pool.execute(
            'SELECT leaveId FROM employee_leave WHERE leaveId = ?',
            [parseInt(leaveId)]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Leave record not found' });
        }

        // Only allow deletion of cancelled or rejected leaves
        const [leave] = await pool.execute(
            'SELECT status FROM employee_leave WHERE leaveId = ?',
            [parseInt(leaveId)]
        );

        if (leave.length > 0 && !['cancelled', 'rejected'].includes(leave[0].status)) {
            return res.status(400).json({ 
                message: 'Cannot delete leave that is not cancelled or rejected' 
            });
        }

        await pool.execute(
            'DELETE FROM employee_leave WHERE leaveId = ?',
            [parseInt(leaveId)]
        );

        res.status(200).json({ message: 'Leave record deleted successfully' });
    } catch (error) {
        console.error('Error deleting leave record:', error);
        res.status(500).json({ message: 'Error deleting leave record', error: error.message });
    }
});

/**
 * @route GET /api/employees/:employeeId/leave/balance
 * @description Get leave balance for an employee
 */
router.get('/:employeeId/leave/balance', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const [rows] = await pool.execute(`
            SELECT * FROM employee_leave_balance
            WHERE employeeId = ? AND year = ?
        `, [parseInt(employeeId), year]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching leave balance:', error);
        res.status(500).json({ message: 'Error fetching leave balance', error: error.message });
    }
});

module.exports = router;

