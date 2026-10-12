// Role management routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/roles
 * @description Get all roles
 */
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                r.*,
                COUNT(DISTINCT u.userId) as userCount,
                COUNT(DISTINCT rp.privilegeId) as privilegeCount
            FROM roles r
            LEFT JOIN users u ON r.roleId = u.roleId AND u.voided = 0
            LEFT JOIN role_privileges rp ON r.roleId = rp.roleId
            GROUP BY r.roleId
            ORDER BY r.roleName
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Error fetching roles', error: error.message });
    }
});

/**
 * @route GET /api/roles/:roleName/landing-config
 * @description Get landing page configuration for a role by name
 * IMPORTANT: This route must come before /:id to avoid route conflicts
 */
router.get('/:roleName/landing-config', async (req, res) => {
    try {
        const { roleName } = req.params;
        
        // Handle case-insensitive role name matching
        const [rows] = await pool.query(
            `SELECT 
                roleId,
                roleName,
                landingPageType,
                landingPageLabel,
                landingPageUrl,
                landingPageIcon,
                landingPageDescription,
                defaultServicePoint,
                landingQuickLinks
            FROM roles 
            WHERE LOWER(roleName) = LOWER(?) AND isActive = 1`,
            [roleName]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Role not found' });
        }
        
        const role = rows[0];
        let quickLinks = [];
        if (role.landingQuickLinks) {
            try {
                quickLinks = typeof role.landingQuickLinks === 'string' ? JSON.parse(role.landingQuickLinks) : role.landingQuickLinks;
                if (!Array.isArray(quickLinks)) quickLinks = [];
            } catch (e) { quickLinks = []; }
        }
        
        // Return landing page config with defaults
        res.status(200).json({
            roleName: role.roleName,
            landingPageType: role.landingPageType || 'dashboard',
            landingPageLabel: role.landingPageLabel || null,
            landingPageUrl: role.landingPageUrl || null,
            landingPageIcon: role.landingPageIcon || 'Home',
            landingPageDescription: role.landingPageDescription || null,
            defaultServicePoint: role.defaultServicePoint || null,
            landingQuickLinks: quickLinks
        });
    } catch (error) {
        console.error('Error fetching role landing config:', error);
        res.status(500).json({ message: 'Error fetching role landing config', error: error.message });
    }
});

/**
 * @route GET /api/roles/:id/dashboard-cards
 * @description Get dashboard card visibility configuration for a role
 */
router.get('/:id/dashboard-cards', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT cardId, isVisible 
             FROM role_dashboard_cards 
             WHERE roleId = ?`,
            [id]
        );
        
        // Return as object for easier lookup
        const cards = {};
        rows.forEach(row => {
            cards[row.cardId] = row.isVisible;
        });
        
        res.status(200).json(cards);
    } catch (error) {
        console.error('Error fetching role dashboard cards:', error);
        res.status(500).json({ message: 'Error fetching role dashboard cards', error: error.message });
    }
});

/**
 * @route GET /api/roles/:id
 * @description Get a single role with its privileges
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get role details
        const [roleRows] = await pool.query(
            'SELECT * FROM roles WHERE roleId = ?',
            [id]
        );

        if (roleRows.length === 0) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Get privileges for this role
        const [privilegeRows] = await pool.query(`
            SELECT
                p.*,
                1 as assigned
            FROM privileges p
            INNER JOIN role_privileges rp ON p.privilegeId = rp.privilegeId
            WHERE rp.roleId = ?
            ORDER BY p.module, p.privilegeName
        `, [id]);

        // Get dashboard card visibility configuration
        const [cardRows] = await pool.query(
            `SELECT cardId, isVisible 
             FROM role_dashboard_cards 
             WHERE roleId = ?`,
            [id]
        );
        const dashboardCards = {};
        cardRows.forEach(row => {
            dashboardCards[row.cardId] = row.isVisible;
        });

        res.status(200).json({
            ...roleRows[0],
            privileges: privilegeRows,
            dashboardCards: dashboardCards
        });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ message: 'Error fetching role', error: error.message });
    }
});

/**
 * @route POST /api/roles
 * @description Create a new role
 */
router.post('/', async (req, res) => {
    try {
        const { 
            roleName, 
            description, 
            isActive = true, 
            privileges = [],
            landingPageType = 'dashboard',
            landingPageLabel = null,
            landingPageUrl = null,
            landingPageIcon = null,
            landingPageDescription = null,
            defaultServicePoint = null,
            landingQuickLinks = null,
            dashboardCards = {}
        } = req.body;

        if (!roleName) {
            return res.status(400).json({ error: 'Role name is required' });
        }

        // Check if role already exists
        const [existing] = await pool.query(
            'SELECT roleId FROM roles WHERE roleName = ?',
            [roleName]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Role with that name already exists' });
        }

        // Insert role with landing page configuration
        const quickLinksJson = Array.isArray(landingQuickLinks) ? JSON.stringify(landingQuickLinks) : null;
        const [result] = await pool.execute(
            `INSERT INTO roles (
                roleName, 
                description, 
                isActive,
                landingPageType,
                landingPageLabel,
                landingPageUrl,
                landingPageIcon,
                landingPageDescription,
                defaultServicePoint,
                landingQuickLinks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                roleName, 
                description || null, 
                isActive,
                landingPageType,
                landingPageLabel,
                landingPageUrl,
                landingPageIcon,
                landingPageDescription,
                defaultServicePoint,
                quickLinksJson
            ]
        );

        const roleId = result.insertId;

        // Assign privileges if provided
        if (Array.isArray(privileges) && privileges.length > 0) {
            const privilegeValues = privileges.map(privId => [roleId, privId]);
            await pool.query(
                'INSERT INTO role_privileges (roleId, privilegeId) VALUES ?',
                [privilegeValues]
            );
        }

        // Get the created role with privileges
        const [roleRows] = await pool.query(
            'SELECT * FROM roles WHERE roleId = ?',
            [roleId]
        );

        res.status(201).json(roleRows[0]);
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ message: 'Error creating role', error: error.message });
    }
});

/**
 * @route PUT /api/roles/:id
 * @description Update a role
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            roleName, 
            description, 
            isActive,
            privileges,
            landingPageType,
            landingPageLabel,
            landingPageUrl,
            landingPageIcon,
            landingPageDescription,
            defaultServicePoint,
            landingQuickLinks,
            dashboardCards
        } = req.body;

        // Check if role exists
        const [existing] = await pool.query(
            'SELECT roleId FROM roles WHERE roleId = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Build update query
        const updates = [];
        const values = [];

        if (roleName !== undefined) {
            // Check for duplicate name
            const [duplicate] = await pool.query(
                'SELECT roleId FROM roles WHERE roleName = ? AND roleId != ?',
                [roleName, id]
            );
            if (duplicate.length > 0) {
                return res.status(400).json({ error: 'Role with that name already exists' });
            }
            updates.push('roleName = ?');
            values.push(roleName);
        }

        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }

        if (isActive !== undefined) {
            updates.push('isActive = ?');
            values.push(isActive);
        }

        // Landing page configuration fields
        if (landingPageType !== undefined) {
            updates.push('landingPageType = ?');
            values.push(landingPageType);
        }
        
        if (landingPageLabel !== undefined) {
            updates.push('landingPageLabel = ?');
            values.push(landingPageLabel);
        }
        
        if (landingPageUrl !== undefined) {
            updates.push('landingPageUrl = ?');
            values.push(landingPageUrl);
        }
        
        if (landingPageIcon !== undefined) {
            updates.push('landingPageIcon = ?');
            values.push(landingPageIcon);
        }
        
        if (landingPageDescription !== undefined) {
            updates.push('landingPageDescription = ?');
            values.push(landingPageDescription);
        }
        
        if (defaultServicePoint !== undefined) {
            updates.push('defaultServicePoint = ?');
            values.push(defaultServicePoint);
        }
        
        // Only add landingQuickLinks if column exists (migration add_landing_quick_links.sql)
        let hasLandingQuickLinksColumn = false;
        if (landingQuickLinks !== undefined) {
            try {
                const [colRows] = await pool.query(
                    "SHOW COLUMNS FROM roles LIKE 'landingQuickLinks'"
                );
                hasLandingQuickLinksColumn = colRows.length > 0;
            } catch (e) { /* ignore */ }
            if (hasLandingQuickLinksColumn) {
                updates.push('landingQuickLinks = ?');
                values.push(Array.isArray(landingQuickLinks) ? JSON.stringify(landingQuickLinks) : null);
            }
        }

        // Start transaction for atomic updates
        await pool.query('START TRANSACTION');

        try {
            if (updates.length > 0) {
                values.push(id);
                await pool.execute(
                    `UPDATE roles SET ${updates.join(', ')}, updatedAt = NOW() WHERE roleId = ?`,
                    values
                );
            }

            // Always update privileges if provided (even if empty array to clear all)
            if (privileges !== undefined) {
                if (!Array.isArray(privileges)) {
                    throw new Error('Privileges must be an array');
                }

                // Remove all existing privileges
                await pool.execute(
                    'DELETE FROM role_privileges WHERE roleId = ?',
                    [id]
                );

                // Add new privileges if any
                if (privileges.length > 0) {
                    const privilegeValues = privileges.map(privId => [parseInt(id), parseInt(privId)]);
                    await pool.query(
                        'INSERT INTO role_privileges (roleId, privilegeId) VALUES ?',
                        [privilegeValues]
                    );
                }
            }

            // Update dashboard card visibility if provided
            if (dashboardCards !== undefined) {
                if (typeof dashboardCards !== 'object' || Array.isArray(dashboardCards)) {
                    throw new Error('Dashboard cards must be an object');
                }

                // Remove all existing dashboard card configurations
                await pool.execute(
                    'DELETE FROM role_dashboard_cards WHERE roleId = ?',
                    [id]
                );

                // Add new dashboard card configurations if any
                const cardValues = Object.entries(dashboardCards)
                    .filter(([cardId, isVisible]) => cardId && typeof isVisible === 'boolean')
                    .map(([cardId, isVisible]) => [parseInt(id), cardId, isVisible]);
                
                if (cardValues.length > 0) {
                    await pool.query(
                        'INSERT INTO role_dashboard_cards (roleId, cardId, isVisible) VALUES ?',
                        [cardValues]
                    );
                }
            }

            // Commit transaction
            await pool.query('COMMIT');
        } catch (error) {
            // Rollback on error
            await pool.query('ROLLBACK');
            throw error;
        }

        // Get updated role
        const [roleRows] = await pool.query(
            'SELECT * FROM roles WHERE roleId = ?',
            [id]
        );

        res.status(200).json(roleRows[0]);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ message: 'Error updating role', error: error.message });
    }
});

/**
 * @route GET /api/roles/:id/users
 * @description Get all users assigned to a role
 */
router.get('/:id/users', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if role exists
        const [roleRows] = await pool.query(
            'SELECT roleId, roleName FROM roles WHERE roleId = ?',
            [id]
        );

        if (roleRows.length === 0) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Get all users with this role
        const [userRows] = await pool.query(`
            SELECT
                u.userId, u.username, u.email, u.firstName, u.lastName,
                u.phone, u.department, u.isActive, u.roleId, u.createdAt, u.updatedAt,
                r.roleName AS role
            FROM users u
            LEFT JOIN roles r ON u.roleId = r.roleId
            WHERE u.roleId = ? AND u.voided = 0
            ORDER BY u.lastName, u.firstName
        `, [id]);

        res.status(200).json({
            role: roleRows[0],
            users: userRows
        });
    } catch (error) {
        console.error('Error fetching role users:', error);
        res.status(500).json({ message: 'Error fetching role users', error: error.message });
    }
});

/**
 * @route DELETE /api/roles/:id
 * @description Delete (deactivate) a role
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if role is in use
        const [users] = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE roleId = ? AND voided = 0',
            [id]
        );

        if (users[0].count > 0) {
            return res.status(400).json({
                error: 'Cannot delete role that is assigned to users. Please reassign users first.'
            });
        }

        // Soft delete by setting isActive to FALSE
        await pool.execute(
            'UPDATE roles SET isActive = FALSE, updatedAt = NOW() WHERE roleId = ?',
            [id]
        );

        res.status(200).json({ message: 'Role deactivated successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ message: 'Error deleting role', error: error.message });
    }
});

module.exports = router;

