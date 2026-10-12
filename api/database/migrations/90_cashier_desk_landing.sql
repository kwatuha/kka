-- Cashier desk: land on /cashier, queue-only access, slim menus, assign cashier desks

-- Landing: go straight to cashier workspace
UPDATE roles
SET landingPageType = 'redirect',
    landingPageLabel = 'Cashier Desk',
    landingPageUrl = '/cashier',
    landingPageIcon = 'Banknote',
    landingPageDescription = 'Cashier queue and daily collections',
    defaultServicePoint = 'cashier'
WHERE roleId = 151 OR roleName = 'Cashier';

-- Only cashier queue (not procedure / other points)
UPDATE role_queue_access
SET isAllowed = 0
WHERE roleId = 151 AND servicePoint <> 'cashier';

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT 151, 'cashier', 1
WHERE NOT EXISTS (
  SELECT 1 FROM role_queue_access WHERE roleId = 151 AND servicePoint = 'cashier'
);

UPDATE role_queue_access
SET isAllowed = 1
WHERE roleId = 151 AND servicePoint = 'cashier';

-- Keep Financial category; allow Cashier Desk + Billing only
UPDATE role_menu_categories
SET isAllowed = 1
WHERE roleId = 151 AND categoryId = 'financial';

UPDATE role_menu_categories
SET isAllowed = 0
WHERE roleId = 151 AND categoryId <> 'financial';

UPDATE role_menu_items
SET isAllowed = 0
WHERE roleId = 151;

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT 151, 'financial', '/cashier', 1
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_items
  WHERE roleId = 151 AND categoryId = 'financial' AND menuItemPath = '/cashier'
);

INSERT INTO role_menu_items (roleId, categoryId, menuItemPath, isAllowed)
SELECT 151, 'financial', '/billing', 1
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_items
  WHERE roleId = 151 AND categoryId = 'financial' AND menuItemPath = '/billing'
);

UPDATE role_menu_items
SET isAllowed = 1
WHERE roleId = 151
  AND categoryId = 'financial'
  AND menuItemPath IN ('/cashier', '/billing');

-- Assign default cashier desks for demo cashier users (by facility)
INSERT INTO user_service_point_assignments (userId, servicePointId, isDefault, isActive)
SELECT u.userId, sp.servicePointId, 1, 1
FROM users u
INNER JOIN user_branch_assignments uba
  ON uba.userId = u.userId AND uba.isActive = 1 AND uba.isDefault = 1
INNER JOIN service_points sp
  ON sp.branchId = uba.branchId AND sp.pointType = 'cashier' AND sp.isActive = 1
WHERE u.username IN ('cashier', 'matungu_cashier')
  AND u.voided = 0
  AND NOT EXISTS (
    SELECT 1 FROM user_service_point_assignments x
    WHERE x.userId = u.userId AND x.servicePointId = sp.servicePointId AND x.isActive = 1
  );

UPDATE user_service_point_assignments uspa
INNER JOIN users u ON u.userId = uspa.userId
INNER JOIN service_points sp ON sp.servicePointId = uspa.servicePointId
INNER JOIN user_branch_assignments uba
  ON uba.userId = u.userId AND uba.isActive = 1 AND uba.isDefault = 1
SET uspa.isDefault = IF(sp.branchId = uba.branchId AND sp.pointType = 'cashier', 1, 0),
    uspa.isActive = IF(sp.pointType = 'cashier', 1, uspa.isActive)
WHERE u.username IN ('cashier', 'matungu_cashier')
  AND u.voided = 0;
