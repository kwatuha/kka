-- Service points (registration desks, triage bays, cashier windows, etc.) per branch
-- + user assignments + queue_entries.servicePointId for branch-scoped tickets.

CREATE TABLE IF NOT EXISTS service_points (
    servicePointId INT NOT NULL AUTO_INCREMENT,
    pointCode VARCHAR(50) NOT NULL,
    pointName VARCHAR(200) NOT NULL,
    branchId INT NOT NULL,
    pointType VARCHAR(50) NOT NULL,
    isDefault BOOLEAN DEFAULT FALSE,
    linkedStoreId INT NULL,
    linkedLabId INT NULL,
    location VARCHAR(200),
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (servicePointId),
    UNIQUE KEY unique_service_point_code (pointCode),
    INDEX idx_sp_branch (branchId),
    INDEX idx_sp_type (pointType),
    INDEX idx_sp_default (isDefault),
    FOREIGN KEY (branchId) REFERENCES branches(branchId) ON DELETE RESTRICT,
    FOREIGN KEY (linkedStoreId) REFERENCES drug_stores(storeId) ON DELETE SET NULL,
    FOREIGN KEY (linkedLabId) REFERENCES laboratories(labId) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_service_point_assignments (
    assignmentId INT NOT NULL AUTO_INCREMENT,
    userId INT NOT NULL,
    servicePointId INT NOT NULL,
    isDefault BOOLEAN DEFAULT FALSE,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (assignmentId),
    UNIQUE KEY unique_user_service_point (userId, servicePointId),
    INDEX idx_uspa_user (userId),
    INDEX idx_uspa_point (servicePointId),
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
    FOREIGN KEY (servicePointId) REFERENCES service_points(servicePointId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'queue_entries'
  AND COLUMN_NAME = 'servicePointId';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE queue_entries ADD COLUMN servicePointId INT NULL AFTER branchId',
    'SELECT "Column servicePointId already exists on queue_entries" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'queue_entries'
  AND CONSTRAINT_NAME = 'fk_queue_entries_service_point';

SET @sql_fk = IF(@fk_exists = 0,
    'ALTER TABLE queue_entries ADD CONSTRAINT fk_queue_entries_service_point FOREIGN KEY (servicePointId) REFERENCES service_points(servicePointId) ON DELETE SET NULL',
    'SELECT "FK fk_queue_entries_service_point already exists" AS message');
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'queue_history'
  AND COLUMN_NAME = 'servicePointId';

SET @sql2 = IF(@col_exists = 0,
    'ALTER TABLE queue_history ADD COLUMN servicePointId INT NULL AFTER branchId',
    'SELECT "Column servicePointId already exists on queue_history" AS message');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Seed one default service point per queue type for each active branch.
INSERT INTO service_points (pointCode, pointName, branchId, pointType, isDefault, location, isActive)
SELECT
    CONCAT(UPPER(COALESCE(b.branchCode, CONCAT('B', b.branchId))), '-', t.suffix) AS pointCode,
    CONCAT(b.branchName, ' - ', t.label) AS pointName,
    b.branchId,
    t.pointType,
    TRUE,
    NULL,
    TRUE
FROM branches b
CROSS JOIN (
    SELECT 'registration' AS pointType, 'REG' AS suffix, 'Registration' AS label UNION ALL
    SELECT 'triage', 'TRI', 'Triage' UNION ALL
    SELECT 'consultation', 'CON', 'Consultation' UNION ALL
    SELECT 'cashier', 'CSH', 'Cashier' UNION ALL
    SELECT 'pharmacy', 'PHR', 'Pharmacy' UNION ALL
    SELECT 'laboratory', 'LAB', 'Laboratory' UNION ALL
    SELECT 'radiology', 'RAD', 'Radiology' UNION ALL
    SELECT 'billing', 'BIL', 'Billing' UNION ALL
    SELECT 'telemedicine', 'TEL', 'Telemedicine' UNION ALL
    SELECT 'procedure', 'PRC', 'Procedure'
) t
WHERE b.isActive = 1
  AND NOT EXISTS (
    SELECT 1 FROM service_points sp
    WHERE sp.branchId = b.branchId AND sp.pointType = t.pointType AND sp.isDefault = 1
  );

-- Backfill queue_entries.branchId from patient registration branch where missing.
UPDATE queue_entries q
INNER JOIN patients p ON q.patientId = p.patientId
SET q.branchId = p.registeredBranchId
WHERE q.branchId IS NULL AND p.registeredBranchId IS NOT NULL;

-- Backfill queue_entries.servicePointId from branch + servicePoint type.
UPDATE queue_entries q
INNER JOIN service_points sp
    ON sp.branchId = q.branchId
   AND sp.pointType = q.servicePoint
   AND sp.isDefault = 1
   AND sp.isActive = 1
SET q.servicePointId = sp.servicePointId
WHERE q.servicePointId IS NULL AND q.branchId IS NOT NULL;

-- Remaining rows without branch: assign main branch.
SET @main_branch_id = (
    SELECT branchId FROM branches WHERE isActive = 1 ORDER BY isMainBranch DESC, branchId ASC LIMIT 1
);

UPDATE queue_entries
SET branchId = @main_branch_id
WHERE branchId IS NULL AND @main_branch_id IS NOT NULL;

UPDATE queue_entries q
INNER JOIN service_points sp
    ON sp.branchId = q.branchId
   AND sp.pointType = q.servicePoint
   AND sp.isDefault = 1
   AND sp.isActive = 1
SET q.servicePointId = sp.servicePointId
WHERE q.servicePointId IS NULL;
