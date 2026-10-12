-- Migration 77 added only /field-app under Dashboard (overview). That created a partial
-- role_menu_items allow-list and hid Dashboard, Departments, Analytics, etc.
-- Restore the full Dashboard sidebar for every role with overview access.

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT c.roleId, 'overview', p.path, 1
FROM role_menu_categories c
CROSS JOIN (
  SELECT '/' AS path
  UNION ALL SELECT '/departments'
  UNION ALL SELECT '/analytics'
  UNION ALL SELECT '/regional-dashboard'
  UNION ALL SELECT '/facility-performance'
  UNION ALL SELECT '/field-app'
) p
WHERE c.categoryId = 'overview' AND c.isAllowed = 1
ON DUPLICATE KEY UPDATE isAllowed = 1;

-- Full-access roles: turn on every menu item under categories they can access.
UPDATE role_menu_items rmi
INNER JOIN role_menu_categories rmc
  ON rmc.roleId = rmi.roleId
  AND rmc.categoryId = rmi.categoryId
  AND rmc.isAllowed = 1
INNER JOIN roles r ON r.roleId = rmi.roleId
SET rmi.isAllowed = 1
WHERE r.roleName IN ('admin', 'Administrator');
