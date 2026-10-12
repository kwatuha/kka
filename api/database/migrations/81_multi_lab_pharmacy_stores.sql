-- Multiple laboratory units per facility branch + pharmacy store tracking on dispensations.

CREATE TABLE IF NOT EXISTS laboratories (
    labId INT NOT NULL AUTO_INCREMENT,
    labCode VARCHAR(50) NOT NULL,
    labName VARCHAR(200) NOT NULL,
    branchId INT NOT NULL,
    isDefault BOOLEAN DEFAULT FALSE,
    location VARCHAR(200),
    contactPerson VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100),
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (labId),
    UNIQUE KEY unique_lab_code (labCode),
    INDEX idx_lab_branch (branchId),
    INDEX idx_lab_default (isDefault),
    FOREIGN KEY (branchId) REFERENCES branches(branchId) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lab_test_orders'
  AND COLUMN_NAME = 'labId';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE lab_test_orders ADD COLUMN labId INT NULL AFTER branchId',
    'SELECT "Column labId already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lab_test_orders'
  AND CONSTRAINT_NAME = 'fk_lab_test_orders_lab';

SET @sql_fk = IF(@fk_exists = 0,
    'ALTER TABLE lab_test_orders ADD CONSTRAINT fk_lab_test_orders_lab FOREIGN KEY (labId) REFERENCES laboratories(labId) ON DELETE SET NULL',
    'SELECT "FK fk_lab_test_orders_lab already exists" AS message');
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'dispensations'
  AND COLUMN_NAME = 'storeId';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE dispensations ADD COLUMN storeId INT NULL AFTER dispensationId',
    'SELECT "Column storeId already exists on dispensations" AS message');
PREPARE stmt2 FROM @sql;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'dispensations'
  AND CONSTRAINT_NAME = 'fk_dispensations_store';

SET @sql_fk2 = IF(@fk_exists = 0,
    'ALTER TABLE dispensations ADD CONSTRAINT fk_dispensations_store FOREIGN KEY (storeId) REFERENCES drug_stores(storeId) ON DELETE SET NULL',
    'SELECT "FK fk_dispensations_store already exists" AS message');
PREPARE stmt_fk2 FROM @sql_fk2;
EXECUTE stmt_fk2;
DEALLOCATE PREPARE stmt_fk2;

-- One default laboratory per active branch (skip if code already taken).
INSERT INTO laboratories (labCode, labName, branchId, isDefault, isActive, location)
SELECT
    CONCAT('LAB-', b.branchCode),
    CONCAT(b.branchName, ' Laboratory'),
    b.branchId,
    1,
    1,
    'Main laboratory'
FROM branches b
WHERE b.isActive = 1
  AND NOT EXISTS (
      SELECT 1 FROM laboratories l WHERE l.branchId = b.branchId
  )
ON DUPLICATE KEY UPDATE isActive = VALUES(isActive);

UPDATE lab_test_orders lo
INNER JOIN patients p ON lo.patientId = p.patientId
SET lo.branchId = p.registeredBranchId
WHERE lo.branchId IS NULL AND p.registeredBranchId IS NOT NULL;

UPDATE lab_test_orders lo
INNER JOIN laboratories l ON l.branchId = lo.branchId AND l.isDefault = 1 AND l.isActive = 1
SET lo.labId = l.labId
WHERE lo.labId IS NULL AND lo.branchId IS NOT NULL;
