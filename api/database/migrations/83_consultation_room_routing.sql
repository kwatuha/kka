-- Consultation room routing: persist chosen consultation room on triage assessments.

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'triage_assessments'
  AND COLUMN_NAME = 'consultationServicePointId';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE triage_assessments ADD COLUMN consultationServicePointId INT NULL AFTER assignedToDepartment',
    'SELECT "Column consultationServicePointId already exists on triage_assessments" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'triage_assessments'
  AND COLUMN_NAME = 'consultationServicePointId'
  AND REFERENCED_TABLE_NAME = 'service_points';

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE triage_assessments ADD CONSTRAINT fk_triage_consultation_room FOREIGN KEY (consultationServicePointId) REFERENCES service_points(servicePointId) ON DELETE SET NULL',
    'SELECT "FK fk_triage_consultation_room already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'triage_assessments'
  AND INDEX_NAME = 'idx_triage_consultation_room';

SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_triage_consultation_room ON triage_assessments (consultationServicePointId)',
    'SELECT "Index idx_triage_consultation_room already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
