-- Pharmacist / pharmacy roles: land on pharmacy desk (queue-first)
-- Roles observed: 7 (pharmacy), 10 (Pharmacist), 153 (Dispensing Pharmacy)

UPDATE roles
SET landingPageType = 'redirect',
    landingPageLabel = 'Pharmacy Desk',
    landingPageUrl = '/pharmacy',
    landingPageIcon = 'Pill',
    landingPageDescription = 'Pharmacy queue, dispense, and inventory',
    defaultServicePoint = 'pharmacy'
WHERE roleId IN (7, 10, 153)
   OR roleName IN ('pharmacy', 'Pharmacist', 'Dispensing Pharmacy', 'Pharmacy');

UPDATE role_queue_access SET isAllowed = 0
WHERE roleId IN (7, 10, 153) AND servicePoint <> 'pharmacy';

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'pharmacy', 1
FROM roles r
WHERE r.roleId IN (7, 10, 153)
  AND NOT EXISTS (
    SELECT 1 FROM role_queue_access x WHERE x.roleId = r.roleId AND x.servicePoint = 'pharmacy'
  );

UPDATE role_queue_access SET isAllowed = 1
WHERE roleId IN (7, 10, 153) AND servicePoint = 'pharmacy';

-- Ensure pharmacy menu access
INSERT INTO role_menu_categories (roleId, categoryId, isAllowed)
SELECT r.roleId, 'clinical-services', 1
FROM roles r
WHERE r.roleId IN (7, 10, 153)
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_categories c WHERE c.roleId = r.roleId AND c.categoryId = 'clinical-services'
  );

UPDATE role_menu_categories SET isAllowed = 1
WHERE roleId IN (7, 10, 153) AND categoryId = 'clinical-services';

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT r.roleId, 'clinical-services', p.path, 1
FROM roles r
CROSS JOIN (
  SELECT '/pharmacy' AS path
  UNION ALL SELECT '/queue/service'
) p
WHERE r.roleId IN (7, 10, 153)
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_items m
    WHERE m.roleId = r.roleId AND m.categoryId = 'clinical-services' AND m.menuItemPath = p.path
  );

UPDATE role_menu_items SET isAllowed = 1
WHERE roleId IN (7, 10, 153)
  AND menuItemPath IN ('/pharmacy', '/queue/service');
