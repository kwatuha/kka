// Privilege management routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/privileges
 * @description Get all privileges, optionally grouped by module
 */
router.get('/', async (req, res) => {
    try {
        const { module, groupByModule } = req.query;
        
        let query = 'SELECT * FROM privileges WHERE 1=1';
        const params = [];
        
        if (module) {
            query += ' AND module = ?';
            params.push(module);
        }
        
        query += ' ORDER BY module, privilegeName';
        
        const [rows] = await pool.query(query, params);
        
        // Group by module if requested
        if (groupByModule === 'true') {
            const grouped = rows.reduce((acc, priv) => {
                const mod = priv.module || 'Other';
                if (!acc[mod]) {
                    acc[mod] = [];
                }
                acc[mod].push(priv);
                return acc;
            }, {});
            return res.status(200).json(grouped);
        }
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching privileges:', error);
        res.status(500).json({ message: 'Error fetching privileges', error: error.message });
    }
});

/**
 * @route GET /api/privileges/:id
 * @description Get a single privilege
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM privileges WHERE privilegeId = ?',
            [id]
        );
        
        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Privilege not found' });
        }
    } catch (error) {
        console.error('Error fetching privilege:', error);
        res.status(500).json({ message: 'Error fetching privilege', error: error.message });
    }
});

/**
 * @route POST /api/privileges
 * @description Create a new privilege
 */
router.post('/', async (req, res) => {
    try {
        const { privilegeName, description, module } = req.body;
        
        if (!privilegeName) {
            return res.status(400).json({ error: 'Privilege name is required' });
        }
        
        // Check if privilege already exists
        const [existing] = await pool.query(
            'SELECT privilegeId FROM privileges WHERE privilegeName = ?',
            [privilegeName]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Privilege with that name already exists' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO privileges (privilegeName, description, module) VALUES (?, ?, ?)',
            [privilegeName, description || null, module || null]
        );
        
        const [newPrivilege] = await pool.query(
            'SELECT * FROM privileges WHERE privilegeId = ?',
            [result.insertId]
        );
        
        res.status(201).json(newPrivilege[0]);
    } catch (error) {
        console.error('Error creating privilege:', error);
        res.status(500).json({ message: 'Error creating privilege', error: error.message });
    }
});

/**
 * @route PUT /api/privileges/:id
 * @description Update a privilege
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { privilegeName, description, module } = req.body;
        
        // Check if privilege exists
        const [existing] = await pool.query(
            'SELECT privilegeId FROM privileges WHERE privilegeId = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Privilege not found' });
        }
        
        // Build update query
        const updates = [];
        const values = [];
        
        if (privilegeName !== undefined) {
            // Check for duplicate name
            const [duplicate] = await pool.query(
                'SELECT privilegeId FROM privileges WHERE privilegeName = ? AND privilegeId != ?',
                [privilegeName, id]
            );
            if (duplicate.length > 0) {
                return res.status(400).json({ error: 'Privilege with that name already exists' });
            }
            updates.push('privilegeName = ?');
            values.push(privilegeName);
        }
        
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        
        if (module !== undefined) {
            updates.push('module = ?');
            values.push(module);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        values.push(id);
        await pool.execute(
            `UPDATE privileges SET ${updates.join(', ')} WHERE privilegeId = ?`,
            values
        );
        
        const [updated] = await pool.query(
            'SELECT * FROM privileges WHERE privilegeId = ?',
            [id]
        );
        
        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error updating privilege:', error);
        res.status(500).json({ message: 'Error updating privilege', error: error.message });
    }
});

/**
 * @route DELETE /api/privileges/:id
 * @description Delete a privilege
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if privilege is assigned to any roles
        const [roles] = await pool.query(
            'SELECT COUNT(*) as count FROM role_privileges WHERE privilegeId = ?',
            [id]
        );
        
        if (roles[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete privilege that is assigned to roles. Please remove from roles first.' 
            });
        }
        
        await pool.execute(
            'DELETE FROM privileges WHERE privilegeId = ?',
            [id]
        );
        
        res.status(200).json({ message: 'Privilege deleted successfully' });
    } catch (error) {
        console.error('Error deleting privilege:', error);
        res.status(500).json({ message: 'Error deleting privilege', error: error.message });
    }
});

module.exports = router;

