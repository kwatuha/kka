-- Allow doctor role to access Facility Performance (Overview sidebar)
-- Adds /facility-performance for roles named 'doctor'

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT r.roleId, 'overview', '/facility-performance', 1
FROM roles r
WHERE r.roleName = 'doctor'
ON DUPLICATE KEY UPDATE isAllowed = 1;

UPDATE role_menu_categories
SET isAllowed = 1
WHERE roleId IN (SELECT roleId FROM roles WHERE roleName = 'doctor')
  AND categoryId = 'overview';
