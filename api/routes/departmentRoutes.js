// Department routes - Full CRUD operations
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/departments
 * @description Get all departments
 */
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;

        // Group by departmentName to avoid duplicates, keeping the most recent active one
        let query = `
            SELECT
                d.departmentId,
                d.departmentCode,
                d.departmentName,
                d.description,
                d.location,
                d.headOfDepartmentId,
                d.isActive,
                d.createdAt,
                d.updatedAt,
                CONCAT(u.firstName, ' ', u.lastName) as headOfDepartmentName
            FROM departments d
            LEFT JOIN users u ON d.headOfDepartmentId = u.userId
            WHERE d.isActive = TRUE
            AND d.departmentId IN (
                SELECT MAX(d2.departmentId)
                FROM departments d2
                WHERE d2.isActive = TRUE
                GROUP BY LOWER(TRIM(d2.departmentName))
            )
        `;
        const params = [];

        if (search) {
            query += ` AND (d.departmentName LIKE ? OR d.description LIKE ? OR d.departmentCode LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY d.departmentName`;

        const [rows] = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Error fetching departments', error: error.message });
    }
});

/**
 * @route GET /api/departments/:id/employees
 * @description Get all employees in a department
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/:id/employees', async (req, res) => {
    try {
        const { id } = req.params;

        // First, get the department ID
        let deptQuery = 'SELECT departmentId FROM departments WHERE departmentId = ?';
        let deptParams = [id];

        if (isNaN(id)) {
            const departmentName = id
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            deptQuery = `
                SELECT departmentId FROM departments
                WHERE LOWER(REPLACE(departmentName, ' ', '-')) = LOWER(?)
                   OR LOWER(departmentName) = LOWER(?)
                   OR departmentCode = ?
                LIMIT 1
            `;
            deptParams = [id, departmentName, id.toUpperCase()];
        }

        const [deptRows] = await pool.query(deptQuery, deptParams);

        if (deptRows.length === 0) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const departmentId = deptRows[0].departmentId;

        // Get employees in this department
        const [employees] = await pool.query(`
            SELECT
                e.*,
                d.departmentName,
                p.positionTitle,
                p.positionCode
            FROM employees e
            LEFT JOIN departments d ON e.departmentId = d.departmentId
            LEFT JOIN employee_positions p ON e.positionId = p.positionId
            WHERE e.departmentId = ? AND e.status = 'active'
            ORDER BY e.firstName, e.lastName
        `, [departmentId]);

        res.status(200).json(employees);
    } catch (error) {
        console.error('Error fetching department employees:', error);
        res.status(500).json({ message: 'Error fetching department employees', error: error.message });
    }
});

/**
 * @route GET /api/departments/:id/positions
 * @description Get all positions in a department
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/:id/positions', async (req, res) => {
    try {
        const { id } = req.params;

        // First, get the department ID
        let deptQuery = 'SELECT departmentId FROM departments WHERE departmentId = ?';
        let deptParams = [id];

        if (isNaN(id)) {
            const departmentName = id
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            deptQuery = `
                SELECT departmentId FROM departments
                WHERE LOWER(REPLACE(departmentName, ' ', '-')) = LOWER(?)
                   OR LOWER(departmentName) = LOWER(?)
                   OR departmentCode = ?
                LIMIT 1
            `;
            deptParams = [id, departmentName, id.toUpperCase()];
        }

        const [deptRows] = await pool.query(deptQuery, deptParams);

        if (deptRows.length === 0) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const departmentId = deptRows[0].departmentId;

        // Get positions in this department
        const [positions] = await pool.query(`
            SELECT
                p.*,
                COUNT(e.employeeId) as employeeCount
            FROM employee_positions p
            LEFT JOIN employees e ON p.positionId = e.positionId AND e.status = 'active'
            WHERE p.departmentId = ? AND p.isActive = TRUE
            GROUP BY p.positionId
            ORDER BY p.positionTitle
        `, [departmentId]);

        res.status(200).json(positions);
    } catch (error) {
        console.error('Error fetching department positions:', error);
        res.status(500).json({ message: 'Error fetching department positions', error: error.message });
    }
});

/**
 * @route GET /api/departments/:id
 * @description Get a single department by ID or slug
 * NOTE: This route must come after /:id/employees and /:id/positions
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Try to find by ID first (if it's a number)
        let query = 'SELECT * FROM departments WHERE departmentId = ?';
        let params = [id];

        // If not a number, try to find by slug (department name converted to slug)
        if (isNaN(id)) {
            // Convert slug back to department name (e.g., "administration" -> "Administration")
            const departmentName = id
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            query = `
                SELECT
                    d.*,
                    CONCAT(u.firstName, ' ', u.lastName) as headOfDepartmentName
                FROM departments d
                LEFT JOIN users u ON d.headOfDepartmentId = u.userId
                WHERE LOWER(REPLACE(d.departmentName, ' ', '-')) = LOWER(?)
                   OR LOWER(d.departmentName) = LOWER(?)
                   OR d.departmentCode = ?
                LIMIT 1
            `;
            params = [id, departmentName, id.toUpperCase()];
        } else {
            // For numeric ID, include head of department name
            query = `
                SELECT
                    d.*,
                    CONCAT(u.firstName, ' ', u.lastName) as headOfDepartmentName
                FROM departments d
                LEFT JOIN users u ON d.headOfDepartmentId = u.userId
                WHERE d.departmentId = ?
            `;
        }

        const [rows] = await pool.query(query, params);

        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Department not found' });
        }
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ message: 'Error fetching department', error: error.message });
    }
});

/**
 * @route POST /api/departments
 * @description Create a new department
 */
router.post('/', async (req, res) => {
    try {
        const deptData = req.body;
        const [result] = await pool.execute(
            `INSERT INTO departments (departmentName, description, location, headOfDepartmentId)
             VALUES (?, ?, ?, ?)`,
            [
                deptData.departmentName,
                deptData.description,
                deptData.location,
                deptData.headOfDepartmentId || null
            ]
        );

        const [newDept] = await pool.execute(
            'SELECT * FROM departments WHERE departmentId = ?',
            [result.insertId]
        );

        res.status(201).json(newDept[0]);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ message: 'Error creating department', error: error.message });
    }
});

/**
 * @route PUT /api/departments/:id
 * @description Update a department
 */
router.put('/:id', async (req, res) => {
    try {
        const updates = [];
        const values = [];

        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined && key !== 'departmentId') {
                updates.push(`${key} = ?`);
                values.push(req.body[key]);
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(req.params.id);

        await pool.execute(
            `UPDATE departments SET ${updates.join(', ')} WHERE departmentId = ?`,
            values
        );

        const [updated] = await pool.execute(
            'SELECT * FROM departments WHERE departmentId = ?',
            [req.params.id]
        );

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ message: 'Error updating department', error: error.message });
    }
});

/**
 * @route DELETE /api/departments/:id
 * @description Delete (deactivate) a department
 */
router.delete('/:id', async (req, res) => {
    try {
        // Soft delete by setting isActive to FALSE
        await pool.execute(
            'UPDATE departments SET isActive = FALSE WHERE departmentId = ?',
            [req.params.id]
        );

        res.status(200).json({ message: 'Department deactivated successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ message: 'Error deleting department', error: error.message });
    }
});

module.exports = router;

