-- Service Point Performance dashboard (Overview sidebar)

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT c.roleId, 'overview', '/service-point-performance', 1
FROM role_menu_categories c
WHERE c.categoryId = 'overview' AND c.isAllowed = 1
ON DUPLICATE KEY UPDATE isAllowed = 1;

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT r.roleId, 'overview', '/service-point-performance', 1
FROM roles r
WHERE r.roleName = 'doctor'
ON DUPLICATE KEY UPDATE isAllowed = 1;
