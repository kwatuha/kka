// Doctors routes - Full CRUD operations with soft delete
// Doctors are stored in the users table with roleId matching 'Doctor' role
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * @route GET /api/doctors
 * @description Get all doctors (non-voided)
 */
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;

        let query = `
            SELECT 
                u.userId, u.username, u.email, u.firstName, u.lastName, 
                u.phone, u.department, u.isActive, u.roleId, 
                u.createdAt, u.updatedAt, u.voided,
                r.roleName AS role
            FROM users u
            LEFT JOIN roles r ON u.roleId = r.roleId
            WHERE LOWER(r.roleName) = 'doctor' AND u.voided = 0
        `;
        const params = [];

        if (search) {
            query += ` AND (u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY u.lastName, u.firstName`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Error fetching doctors', error: error.message });
    }
});

/**
 * @route GET /api/doctors/:id
 * @description Get a single doctor by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                u.userId, u.username, u.email, u.firstName, u.lastName, 
                u.phone, u.department, u.isActive, u.roleId, 
                u.createdAt, u.updatedAt, u.voided,
                r.roleName AS role
            FROM users u
            LEFT JOIN roles r ON u.roleId = r.roleId
            WHERE u.userId = ? AND LOWER(r.roleName) = 'doctor' AND u.voided = 0
        `, [req.params.id]);
        
        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Doctor not found' });
        }
    } catch (error) {
        console.error('Error fetching doctor:', error);
        res.status(500).json({ message: 'Error fetching doctor', error: error.message });
    }
});

/**
 * @route POST /api/doctors
 * @description Create a new doctor
 */
router.post('/', async (req, res) => {
    try {
        const doctorData = req.body;
        const userId = req.user?.id;

        // Get Doctor roleId (case-insensitive)
        const [roleRows] = await pool.execute(
            "SELECT roleId FROM roles WHERE LOWER(roleName) = 'doctor' LIMIT 1"
        );

        if (roleRows.length === 0) {
            return res.status(400).json({ message: 'Doctor role not found in system' });
        }

        const doctorRoleId = roleRows[0].roleId;

        // Validate required fields
        if (!doctorData.firstName || !doctorData.lastName || !doctorData.email) {
            return res.status(400).json({ message: 'First name, last name, and email are required' });
        }

        // Generate username from email if not provided
        const username = doctorData.username || doctorData.email.split('@')[0];

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT userId FROM users WHERE username = ? OR email = ?',
            [username, doctorData.email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'User with that username or email already exists' });
        }

        // Hash password if provided, otherwise generate a default one
        let passwordHash;
        if (doctorData.password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(doctorData.password, salt);
        } else {
            // Default password (should be changed on first login)
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash('Doctor@123', salt);
        }

        // Insert doctor (ensure voided = 0 for new records)
        const [result] = await pool.execute(
            `INSERT INTO users (
                username, email, passwordHash, firstName, lastName, 
                phone, department, roleId, isActive, voided
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                username,
                doctorData.email,
                passwordHash,
                doctorData.firstName,
                doctorData.lastName,
                doctorData.phone || null,
                doctorData.department || null,
                doctorRoleId,
                doctorData.isActive !== undefined ? doctorData.isActive : true
            ]
        );

        const [newDoctor] = await pool.execute(`
            SELECT 
                u.userId, u.username, u.email, u.firstName, u.lastName, 
                u.phone, u.department, u.isActive, u.roleId, 
                u.createdAt, u.updatedAt, u.voided,
                r.roleName AS role
            FROM users u
            LEFT JOIN roles r ON u.roleId = r.roleId
            WHERE u.userId = ?
        `, [result.insertId]);

        res.status(201).json(newDoctor[0]);
    } catch (error) {
        console.error('Error creating doctor:', error);
        res.status(500).json({ message: 'Error creating doctor', error: error.message });
    }
});

/**
 * @route PUT /api/doctors/:id
 * @description Update a doctor
 */
router.put('/:id', async (req, res) => {
    try {
        const doctorData = req.body;
        const updates = [];
        const values = [];

        // Check if doctor exists and is actually a doctor
        const [existing] = await pool.execute(`
            SELECT u.userId, r.roleName AS role
            FROM users u
            LEFT JOIN roles r ON u.roleId = r.roleId
            WHERE u.userId = ? AND LOWER(r.roleName) = 'doctor'
        `, [req.params.id]);

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Build update query (exclude voided, userId, roleId, createdAt, createdBy)
        Object.keys(doctorData).forEach(key => {
            if (doctorData[key] !== undefined && 
                key !== 'userId' && 
                key !== 'roleId' &&
                key !== 'role' &&
                key !== 'createdAt' && 
                key !== 'createdBy' &&
                key !== 'voided' &&
                key !== 'password') { // Handle password separately if provided
                updates.push(`${key} = ?`);
                values.push(doctorData[key]);
            }
        });

        // Handle password update separately if provided
        if (doctorData.password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(doctorData.password, salt);
            updates.push('passwordHash = ?');
            values.push(passwordHash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Ensure voided remains 0 for updates
        updates.push('voided = 0');
        values.push(req.params.id);

        await pool.execute(
            `UPDATE users SET ${updates.join(', ')}, updatedAt = NOW() 
             WHERE userId = ?`,
            values
        );

        const [updated] = await pool.execute(`
            SELECT 
                u.userId, u.username, u.email, u.firstName, u.lastName, 
                u.phone, u.department, u.isActive, u.roleId, 
                u.createdAt, u.updatedAt, u.voided,
                r.roleName AS role
            FROM users u
            LEFT JOIN roles r ON u.roleId = r.roleId
            WHERE u.userId = ?
        `, [req.params.id]);

        if (updated.length > 0) {
            res.status(200).json(updated[0]);
        } else {
            res.status(404).json({ message: 'Doctor not found' });
        }
    } catch (error) {
        console.error('Error updating doctor:', error);
        res.status(500).json({ message: 'Error updating doctor', error: error.message });
    }
});

/**
 * @route DELETE /api/doctors/:id
 * @description Soft delete a doctor (set voided to 1)
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check if doctor exists and is actually a doctor
        const [existing] = await pool.execute(`
            SELECT u.userId, r.roleName AS role
            FROM users u
            LEFT JOIN roles r ON u.roleId = r.roleId
            WHERE u.userId = ? AND LOWER(r.roleName) = 'doctor'
        `, [req.params.id]);

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Soft delete: set voided to 1
        await pool.execute(
            `UPDATE users SET voided = 1, updatedAt = NOW() 
             WHERE userId = ?`,
            [req.params.id]
        );

        res.status(200).json({ 
            message: 'Doctor deleted successfully',
            userId: req.params.id
        });
    } catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ message: 'Error deleting doctor', error: error.message });
    }
});

module.exports = router;
