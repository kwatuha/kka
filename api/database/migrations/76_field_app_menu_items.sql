-- Show Field app download and datasets in Clinical Services sidebar for roles that already have that category.
-- (Pages exist at /field-app, /field-datasets; they were missing from role_menu_items after DB clone.)

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT c.roleId, 'clinical-services', p.path, 1
FROM role_menu_categories c
INNER JOIN roles r ON r.roleId = c.roleId
CROSS JOIN (
  SELECT '/field-app' AS path
  UNION ALL SELECT '/field-datasets'
) p
WHERE c.categoryId = 'clinical-services' AND c.isAllowed = 1
ON DUPLICATE KEY UPDATE isAllowed = 1;

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT r.roleId, 'clinical-services', '/field-app-usage', 1
FROM roles r
WHERE r.roleName IN ('admin', 'Administrator')
ON DUPLICATE KEY UPDATE isAllowed = 1;
