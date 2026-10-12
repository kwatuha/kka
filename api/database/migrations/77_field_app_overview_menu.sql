-- Show Mobile app download under Dashboard (overview) for roles that already have that category.

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT c.roleId, 'overview', '/field-app', 1
FROM role_menu_categories c
INNER JOIN roles r ON r.roleId = c.roleId
WHERE c.categoryId = 'overview' AND c.isAllowed = 1
ON DUPLICATE KEY UPDATE isAllowed = 1;
