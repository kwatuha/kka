-- Lab desk landing for Laboratory Technical Staff + demo labtech1

-- Prefer Laboratory Technical Staff (role 4) desk landing
UPDATE roles
SET landingPageType = 'redirect',
    landingPageLabel = 'Lab Desk',
    landingPageUrl = '/lab',
    landingPageIcon = 'FlaskConical',
    landingPageDescription = 'Lab queue, unpaid orders, and collections',
    defaultServicePoint = 'laboratory'
WHERE roleId = 4 OR roleName = 'Laboratory Technical Staff';

-- Also configure Lab Technician (role 11) used by labtech1 demo user
UPDATE roles
SET landingPageType = 'redirect',
    landingPageLabel = 'Lab Desk',
    landingPageUrl = '/lab',
    landingPageIcon = 'FlaskConical',
    landingPageDescription = 'Lab queue, unpaid orders, and collections',
    defaultServicePoint = 'laboratory'
WHERE roleId = 11 OR roleName = 'Lab Technician';

-- Queue access: laboratory only for role 4; tighten role 11 to laboratory focus
UPDATE role_queue_access SET isAllowed = 0 WHERE roleId IN (4, 11) AND servicePoint <> 'laboratory';
INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'laboratory', 1
FROM roles r
WHERE r.roleId IN (4, 11)
  AND NOT EXISTS (
    SELECT 1 FROM role_queue_access x WHERE x.roleId = r.roleId AND x.servicePoint = 'laboratory'
  );
UPDATE role_queue_access SET isAllowed = 1 WHERE roleId IN (4, 11) AND servicePoint = 'laboratory';

-- Ensure clinical-services category and lab menus for both roles
INSERT INTO role_menu_categories (roleId, categoryId, isAllowed)
SELECT r.roleId, 'clinical-services', 1
FROM roles r
WHERE r.roleId IN (4, 11)
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_categories c WHERE c.roleId = r.roleId AND c.categoryId = 'clinical-services'
  );
UPDATE role_menu_categories SET isAllowed = 1 WHERE roleId IN (4, 11) AND categoryId = 'clinical-services';

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT r.roleId, 'clinical-services', path.p, 1
FROM roles r
CROSS JOIN (
  SELECT '/lab' AS p
  UNION ALL SELECT '/laboratory'
) path
WHERE r.roleId IN (4, 11)
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_items i
    WHERE i.roleId = r.roleId AND i.categoryId = 'clinical-services' AND i.menuItemPath = path.p
  );

UPDATE role_menu_items
SET isAllowed = 1
WHERE roleId IN (4, 11)
  AND menuItemPath IN ('/lab', '/laboratory');

-- Assign default laboratory desks for labtech1
INSERT INTO user_service_point_assignments (userId, servicePointId, isDefault, isActive)
SELECT u.userId, sp.servicePointId, 1, 1
FROM users u
INNER JOIN user_branch_assignments uba
  ON uba.userId = u.userId AND uba.isActive = 1 AND uba.isDefault = 1
INNER JOIN service_points sp
  ON sp.branchId = uba.branchId AND sp.pointType = 'laboratory' AND sp.isActive = 1
WHERE u.username = 'labtech1'
  AND u.voided = 0
  AND NOT EXISTS (
    SELECT 1 FROM user_service_point_assignments x
    WHERE x.userId = u.userId AND x.servicePointId = sp.servicePointId AND x.isActive = 1
  );
