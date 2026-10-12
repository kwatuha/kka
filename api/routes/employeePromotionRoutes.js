// Employee Promotion/Position History routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/employees/:employeeId/promotions
 * @description Get position history for an employee
 */
router.get('/:employeeId/promotions', async (req, res) => {
    try {
        const { employeeId } = req.params;

        const [rows] = await pool.execute(`
            SELECT 
                eph.*,
                pp.positionTitle as previousPositionTitle,
                np.positionTitle as newPositionTitle,
                pd.departmentName as previousDepartmentName,
                nd.departmentName as newDepartmentName,
                CONCAT(u.firstName, ' ', u.lastName) as approvedByName
            FROM employee_position_history eph
            LEFT JOIN employee_positions pp ON eph.previousPositionId = pp.positionId
            LEFT JOIN employee_positions np ON eph.newPositionId = np.positionId
            LEFT JOIN departments pd ON eph.previousDepartmentId = pd.departmentId
            LEFT JOIN departments nd ON eph.newDepartmentId = nd.departmentId
            LEFT JOIN users u ON eph.approvedBy = u.userId
            WHERE eph.employeeId = ?
            ORDER BY eph.effectiveDate DESC, eph.createdAt DESC
        `, [parseInt(employeeId)]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching position history:', error);
        res.status(500).json({ message: 'Error fetching position history', error: error.message });
    }
});

/**
 * @route POST /api/employees/:employeeId/promotions
 * @description Create a new position change (promotion/transfer)
 */
router.post('/:employeeId/promotions', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { employeeId } = req.params;
        const {
            newPositionId,
            newDepartmentId,
            changeType,
            effectiveDate,
            reason,
            approvedBy,
            salaryChange,
            notes
        } = req.body;

        if (!newPositionId || !effectiveDate) {
            return res.status(400).json({ message: 'New position and effective date are required' });
        }

        // Get current employee position and department
        const [currentEmployee] = await connection.execute(`
            SELECT positionId, departmentId FROM employees WHERE employeeId = ?
        `, [parseInt(employeeId)]);

        if (currentEmployee.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const previousPositionId = currentEmployee[0].positionId;
        const previousDepartmentId = currentEmployee[0].departmentId;

        // Create position history record
        const [result] = await connection.execute(`
            INSERT INTO employee_position_history (
                employeeId, previousPositionId, newPositionId,
                previousDepartmentId, newDepartmentId, changeType,
                effectiveDate, reason, approvedBy, approvedDate, salaryChange, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            parseInt(employeeId),
            previousPositionId,
            parseInt(newPositionId),
            previousDepartmentId,
            newDepartmentId ? parseInt(newDepartmentId) : null,
            changeType || 'transfer',
            effectiveDate,
            reason || null,
            approvedBy ? parseInt(approvedBy) : null,
            approvedBy ? new Date().toISOString().split('T')[0] : null,
            salaryChange ? parseFloat(salaryChange) : null,
            notes || null
        ]);

        // Update employee's current position and department
        await connection.execute(`
            UPDATE employees SET
                positionId = ?,
                departmentId = ?
            WHERE employeeId = ?
        `, [
            parseInt(newPositionId),
            newDepartmentId ? parseInt(newDepartmentId) : previousDepartmentId,
            parseInt(employeeId)
        ]);

        await connection.commit();

        // Fetch the created history record
        const [newHistory] = await connection.execute(`
            SELECT 
                eph.*,
                pp.positionTitle as previousPositionTitle,
                np.positionTitle as newPositionTitle,
                pd.departmentName as previousDepartmentName,
                nd.departmentName as newDepartmentName,
                CONCAT(u.firstName, ' ', u.lastName) as approvedByName
            FROM employee_position_history eph
            LEFT JOIN employee_positions pp ON eph.previousPositionId = pp.positionId
            LEFT JOIN employee_positions np ON eph.newPositionId = np.positionId
            LEFT JOIN departments pd ON eph.previousDepartmentId = pd.departmentId
            LEFT JOIN departments nd ON eph.newDepartmentId = nd.departmentId
            LEFT JOIN users u ON eph.approvedBy = u.userId
            WHERE eph.historyId = ?
        `, [result.insertId]);

        res.status(201).json(newHistory[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating position change:', error);
        res.status(500).json({ message: 'Error creating position change', error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/employees/attendance/:employeeId
 * @description Get attendance records for an employee
 */
router.get('/attendance/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                ea.*,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                e.employeeNumber
            FROM employee_attendance ea
            JOIN employees e ON ea.employeeId = e.employeeId
            WHERE ea.employeeId = ?
        `;
        const params = [parseInt(employeeId)];

        if (startDate) {
            query += ' AND ea.attendanceDate >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND ea.attendanceDate <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY ea.attendanceDate DESC';

        const [rows] = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ message: 'Error fetching attendance', error: error.message });
    }
});

/**
 * @route POST /api/employees/attendance
 * @description Create or update attendance record
 */
router.post('/attendance', async (req, res) => {
    try {
        const {
            employeeId,
            attendanceDate,
            checkInTime,
            checkOutTime,
            hoursWorked,
            status,
            notes
        } = req.body;

        if (!employeeId || !attendanceDate) {
            return res.status(400).json({ message: 'Employee ID and attendance date are required' });
        }

        // Check if record exists
        const [existing] = await pool.execute(`
            SELECT attendanceId FROM employee_attendance
            WHERE employeeId = ? AND attendanceDate = ?
        `, [parseInt(employeeId), attendanceDate]);

        if (existing.length > 0) {
            // Update existing record
            await pool.execute(`
                UPDATE employee_attendance SET
                    checkInTime = ?,
                    checkOutTime = ?,
                    hoursWorked = ?,
                    status = ?,
                    notes = ?
                WHERE attendanceId = ?
            `, [
                checkInTime || null,
                checkOutTime || null,
                hoursWorked || null,
                status || 'present',
                notes || null,
                existing[0].attendanceId
            ]);

            const [updated] = await pool.execute(`
                SELECT 
                    ea.*,
                    CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                    e.employeeNumber
                FROM employee_attendance ea
                JOIN employees e ON ea.employeeId = e.employeeId
                WHERE ea.attendanceId = ?
            `, [existing[0].attendanceId]);

            return res.status(200).json(updated[0]);
        } else {
            // Create new record
            const [result] = await pool.execute(`
                INSERT INTO employee_attendance (
                    employeeId, attendanceDate, checkInTime, checkOutTime,
                    hoursWorked, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                parseInt(employeeId),
                attendanceDate,
                checkInTime || null,
                checkOutTime || null,
                hoursWorked || null,
                status || 'present',
                notes || null
            ]);

            const [newAttendance] = await pool.execute(`
                SELECT 
                    ea.*,
                    CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as employeeName,
                    e.employeeNumber
                FROM employee_attendance ea
                JOIN employees e ON ea.employeeId = e.employeeId
                WHERE ea.attendanceId = ?
            `, [result.insertId]);

            return res.status(201).json(newAttendance[0]);
        }
    } catch (error) {
        console.error('Error creating/updating attendance:', error);
        res.status(500).json({ message: 'Error creating/updating attendance', error: error.message });
    }
});

module.exports = router;

