// Role menu and tab access control routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/roles/:roleId/menu-config
 * @description Get menu and tab configuration for a role
 */
router.get('/:roleId/menu-config', async (req, res) => {
    try {
        const { roleId } = req.params;

        // Get allowed categories
        const [categories] = await pool.query(
            'SELECT categoryId, isAllowed FROM role_menu_categories WHERE roleId = ?',
            [roleId]
        );

        // Get allowed menu items
        const [menuItems] = await pool.query(
            'SELECT categoryId, menuItemPath, isAllowed FROM role_menu_items WHERE roleId = ?',
            [roleId]
        );

        // Get allowed tabs
        const [tabs] = await pool.query(
            'SELECT pagePath, tabId, isAllowed FROM role_page_tabs WHERE roleId = ?',
            [roleId]
        );

        // Get allowed queue service points (with error handling for missing table)
        let queues = [];
        try {
            const [queueRows] = await pool.query(
                'SELECT servicePoint, isAllowed FROM role_queue_access WHERE roleId = ?',
                [roleId]
            );
            queues = queueRows;
        } catch (error) {
            // Table might not exist yet, return empty array
            console.warn('role_queue_access table not found, returning empty queues:', error.message);
            queues = [];
        }

        res.status(200).json({
            categories: categories,
            menuItems: menuItems,
            tabs: tabs,
            queues: queues
        });
    } catch (error) {
        console.error('Error fetching role menu config:', error);
        res.status(500).json({ message: 'Error fetching role menu config', error: error.message });
    }
});

/**
 * @route POST /api/roles/:roleId/menu-config
 * @description Set menu and tab configuration for a role
 */
router.post('/:roleId/menu-config', async (req, res) => {
    try {
        const { roleId } = req.params;
        const { categories, menuItems, tabs, queues } = req.body;

        // Verify role exists
        const [roleCheck] = await pool.query(
            'SELECT roleId FROM roles WHERE roleId = ?',
            [roleId]
        );

        if (roleCheck.length === 0) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Start transaction
        await pool.query('START TRANSACTION');

        try {
            // Update categories
            if (Array.isArray(categories)) {
                // Delete existing categories for this role
                await pool.query(
                    'DELETE FROM role_menu_categories WHERE roleId = ?',
                    [roleId]
                );

                // Insert new categories
                if (categories.length > 0) {
                    const categoryValues = categories.map(cat => [roleId, cat.categoryId, cat.isAllowed !== false]);
                    await pool.query(
                        'INSERT INTO role_menu_categories (roleId, categoryId, isAllowed) VALUES ?',
                        [categoryValues]
                    );
                }
            }

            // Update menu items
            if (Array.isArray(menuItems)) {
                // Delete existing menu items for this role
                await pool.query(
                    'DELETE FROM role_menu_items WHERE roleId = ?',
                    [roleId]
                );

                // Insert new menu items
                if (menuItems.length > 0) {
                    const itemValues = menuItems.map(item => [roleId, item.categoryId, item.menuItemPath, item.isAllowed !== false]);
                    await pool.query(
                        'INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed) VALUES ?',
                        [itemValues]
                    );
                }
            }

            // Update tabs
            if (Array.isArray(tabs)) {
                // Delete existing tabs for this role
                await pool.query(
                    'DELETE FROM role_page_tabs WHERE roleId = ?',
                    [roleId]
                );

                // Insert new tabs
                if (tabs.length > 0) {
                    const tabValues = tabs.map(tab => [roleId, tab.pagePath, tab.tabId, tab.isAllowed !== false]);
                    await pool.query(
                        'INSERT INTO role_page_tabs (roleId, pagePath, tabId, isAllowed) VALUES ?',
                        [tabValues]
                    );
                }
            }

            // Update queue access (with error handling for missing table)
            if (Array.isArray(queues)) {
                try {
                    // Delete existing queue access for this role
                    await pool.query(
                        'DELETE FROM role_queue_access WHERE roleId = ?',
                        [roleId]
                    );

                    // Insert new queue access
                    if (queues.length > 0) {
                        const queueValues = queues.map(queue => [roleId, queue.servicePoint, queue.isAllowed !== false]);
                        await pool.query(
                            'INSERT INTO role_queue_access (roleId, servicePoint, isAllowed) VALUES ?',
                            [queueValues]
                        );
                    }
                } catch (error) {
                    // Table might not exist yet, log warning but don't fail
                    console.warn('role_queue_access table not found, skipping queue access update:', error.message);
                }
            }

            await pool.query('COMMIT');

            res.status(200).json({ message: 'Menu configuration updated successfully' });
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error updating role menu config:', error);
        res.status(500).json({ message: 'Error updating role menu config', error: error.message });
    }
});

/**
 * @route GET /api/users/me/menu-access
 * @description Get menu access for current user based on their role
 */
router.get('/users/me/menu-access', async (req, res) => {
    try {
        // Get user ID from auth token or query parameter (for development)
        // In production, this should only use req.user from authentication middleware
        const userId = req.user?.id || req.user?.userId || req.query.userId;

        if (!userId) {
            // If no user ID, return empty access (secure by default)
            // In production, this should return 401
            return res.status(200).json({
                menuConfigPresent: false,
                categoriesWithMenuItemRows: [],
                categories: [],
                menuItems: [],
                tabs: []
            });
        }

        // Get user's role
        const [users] = await pool.query(
            'SELECT roleId FROM users WHERE userId = ? AND voided = 0',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const roleId = users[0].roleId;

        if (!roleId) {
            // No role assigned - return empty access
            return res.status(200).json({
                menuConfigPresent: false,
                categoriesWithMenuItemRows: [],
                categories: [],
                menuItems: [],
                tabs: []
            });
        }

        // True if this role has any saved rows in menu tables (even if all isAllowed = FALSE).
        // The client uses this to tell "explicitly denied everything" from "never configured" (legacy show-all).
        const [[menuConfigCounts]] = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM role_menu_categories WHERE roleId = ?) AS catRows,
                (SELECT COUNT(*) FROM role_menu_items WHERE roleId = ?) AS itemRows`,
            [roleId, roleId]
        );
        const menuConfigPresent =
            Number(menuConfigCounts?.catRows || 0) > 0 ||
            Number(menuConfigCounts?.itemRows || 0) > 0;

        // Categories that have ≥1 row in role_menu_items (so empty allow list = all items denied, not "no restriction")
        const [itemCategoryRows] = await pool.query(
            'SELECT DISTINCT categoryId FROM role_menu_items WHERE roleId = ?',
            [roleId]
        );
        const categoriesWithMenuItemRows = itemCategoryRows.map((r) => r.categoryId);

        // Get allowed categories
        const [categories] = await pool.query(
            'SELECT categoryId, isAllowed FROM role_menu_categories WHERE roleId = ? AND isAllowed = TRUE',
            [roleId]
        );

        // All menu item rows (allowed + denied) so the UI can show new nav paths not yet in role config
        const [menuItems] = await pool.query(
            'SELECT categoryId, menuItemPath, isAllowed FROM role_menu_items WHERE roleId = ?',
            [roleId]
        );

        // Tab rows (including explicit denies) — UI treats missing tab as allowed
        const [tabs] = await pool.query(
            'SELECT pagePath, tabId, isAllowed FROM role_page_tabs WHERE roleId = ?',
            [roleId]
        );

        // Get allowed queue service points (with error handling for missing table)
        let queues = [];
        try {
            const [queueRows] = await pool.query(
                'SELECT servicePoint, isAllowed FROM role_queue_access WHERE roleId = ? AND isAllowed = TRUE',
                [roleId]
            );
            queues = queueRows;
        } catch (error) {
            // Table might not exist yet, return empty array
            console.warn('role_queue_access table not found, returning empty queues:', error.message);
            queues = [];
        }

        res.status(200).json({
            roleId: roleId,
            menuConfigPresent,
            categoriesWithMenuItemRows,
            categories: categories.map(c => c.categoryId),
            menuItems: menuItems.map(m => ({
                categoryId: m.categoryId,
                path: m.menuItemPath,
                isAllowed: Boolean(m.isAllowed),
            })),
            tabs: tabs.map(t => ({
                pagePath: t.pagePath,
                tabId: t.tabId,
                isAllowed: Boolean(t.isAllowed),
            })),
            queues: queues.map(q => q.servicePoint)
        });
    } catch (error) {
        console.error('Error fetching user menu access:', error);
        res.status(500).json({ message: 'Error fetching user menu access', error: error.message });
    }
});

module.exports = router;
