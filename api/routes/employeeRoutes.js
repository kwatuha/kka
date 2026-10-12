// Employee routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/employees
 * @description Get all employees with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { search, departmentId, status, positionId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                e.*,
                d.departmentName,
                d.departmentCode,
                p.positionTitle,
                p.positionCode,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as fullName
            FROM employees e
            LEFT JOIN departments d ON e.departmentId = d.departmentId
            LEFT JOIN employee_positions p ON e.positionId = p.positionId
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (
                e.firstName LIKE ? OR 
                e.lastName LIKE ? OR 
                e.employeeNumber LIKE ? OR 
                e.email LIKE ? OR
                e.phone LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (departmentId) {
            query += ' AND e.departmentId = ?';
            params.push(parseInt(departmentId));
        }

        if (status) {
            query += ' AND e.status = ?';
            params.push(status);
        }

        if (positionId) {
            query += ' AND e.positionId = ?';
            params.push(parseInt(positionId));
        }

        query += ' ORDER BY e.lastName, e.firstName';
        query += ' LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const [rows] = await pool.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM employees e
            WHERE 1=1
        `;
        const countParams = [];

        if (search) {
            countQuery += ` AND (
                e.firstName LIKE ? OR 
                e.lastName LIKE ? OR 
                e.employeeNumber LIKE ? OR 
                e.email LIKE ? OR
                e.phone LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (departmentId) {
            countQuery += ' AND e.departmentId = ?';
            countParams.push(parseInt(departmentId));
        }

        if (status) {
            countQuery += ' AND e.status = ?';
            countParams.push(status);
        }

        if (positionId) {
            countQuery += ' AND e.positionId = ?';
            countParams.push(parseInt(positionId));
        }

        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0].total;

        res.status(200).json({
            employees: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Error fetching employees', error: error.message });
    }
});

/**
 * @route GET /api/employees/:id
 * @description Get employee by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(`
            SELECT 
                e.*,
                d.departmentName,
                d.departmentCode,
                p.positionTitle,
                p.positionCode,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as fullName
            FROM employees e
            LEFT JOIN departments d ON e.departmentId = d.departmentId
            LEFT JOIN employee_positions p ON e.positionId = p.positionId
            WHERE e.employeeId = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ message: 'Error fetching employee', error: error.message });
    }
});

/**
 * @route POST /api/employees
 * @description Create a new employee
 */
router.post('/', async (req, res) => {
    try {
        const {
            employeeNumber,
            firstName,
            lastName,
            middleName,
            dateOfBirth,
            gender,
            phone,
            email,
            address,
            idNumber,
            hireDate,
            employmentType,
            departmentId,
            positionId,
            status,
            emergencyContactName,
            emergencyContactPhone,
            notes,
            userId
        } = req.body;

        // Validate required fields
        if (!employeeNumber || !firstName || !lastName || !hireDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if employee number already exists
        const [existing] = await pool.execute(
            'SELECT employeeId FROM employees WHERE employeeNumber = ?',
            [employeeNumber]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Employee number already exists' });
        }

        const [result] = await pool.execute(`
            INSERT INTO employees (
                employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
                phone, email, address, idNumber, hireDate, employmentType,
                departmentId, positionId, status, emergencyContactName,
                emergencyContactPhone, notes, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            employeeNumber, firstName, lastName, middleName || null, dateOfBirth || null,
            gender || null, phone || null, email || null, address || null, idNumber || null,
            hireDate, employmentType || 'full_time', departmentId || null, positionId || null,
            status || 'active', emergencyContactName || null, emergencyContactPhone || null,
            notes || null, userId || null
        ]);

        // Fetch the created employee
        const [newEmployee] = await pool.execute(`
            SELECT 
                e.*,
                d.departmentName,
                d.departmentCode,
                p.positionTitle,
                p.positionCode,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as fullName
            FROM employees e
            LEFT JOIN departments d ON e.departmentId = d.departmentId
            LEFT JOIN employee_positions p ON e.positionId = p.positionId
            WHERE e.employeeId = ?
        `, [result.insertId]);

        res.status(201).json(newEmployee[0]);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ message: 'Error creating employee', error: error.message });
    }
});

/**
 * @route PUT /api/employees/:id
 * @description Update an employee
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            firstName,
            lastName,
            middleName,
            dateOfBirth,
            gender,
            phone,
            email,
            address,
            idNumber,
            hireDate,
            terminationDate,
            employmentType,
            departmentId,
            positionId,
            status,
            emergencyContactName,
            emergencyContactPhone,
            notes,
            userId
        } = req.body;

        // Check if employee exists
        const [existing] = await pool.execute(
            'SELECT employeeId FROM employees WHERE employeeId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        await pool.execute(`
            UPDATE employees SET
                firstName = ?,
                lastName = ?,
                middleName = ?,
                dateOfBirth = ?,
                gender = ?,
                phone = ?,
                email = ?,
                address = ?,
                idNumber = ?,
                hireDate = ?,
                terminationDate = ?,
                employmentType = ?,
                departmentId = ?,
                positionId = ?,
                status = ?,
                emergencyContactName = ?,
                emergencyContactPhone = ?,
                notes = ?,
                userId = ?
            WHERE employeeId = ?
        `, [
            firstName, lastName, middleName || null, dateOfBirth || null, gender || null,
            phone || null, email || null, address || null, idNumber || null, hireDate,
            terminationDate || null, employmentType || 'full_time', departmentId || null,
            positionId || null, status || 'active', emergencyContactName || null,
            emergencyContactPhone || null, notes || null, userId || null, id
        ]);

        // Fetch the updated employee
        const [updatedEmployee] = await pool.execute(`
            SELECT 
                e.*,
                d.departmentName,
                d.departmentCode,
                p.positionTitle,
                p.positionCode,
                CONCAT(e.firstName, ' ', COALESCE(e.middleName, ''), ' ', e.lastName) as fullName
            FROM employees e
            LEFT JOIN departments d ON e.departmentId = d.departmentId
            LEFT JOIN employee_positions p ON e.positionId = p.positionId
            WHERE e.employeeId = ?
        `, [id]);

        res.status(200).json(updatedEmployee[0]);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ message: 'Error updating employee', error: error.message });
    }
});

/**
 * @route DELETE /api/employees/:id
 * @description Delete an employee (soft delete by setting status to terminated)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if employee exists
        const [existing] = await pool.execute(
            'SELECT employeeId FROM employees WHERE employeeId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Soft delete by setting status to terminated
        await pool.execute(
            'UPDATE employees SET status = ?, terminationDate = ? WHERE employeeId = ?',
            ['terminated', new Date().toISOString().split('T')[0], id]
        );

        res.status(200).json({ message: 'Employee terminated successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Error deleting employee', error: error.message });
    }
});

module.exports = router;

