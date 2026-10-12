-- Link telemedicine sessions to queue_entries when the visit starts from the telemedicine queue.
-- Run after 40_telemedicine_sessions_schema.sql
--
-- Idempotent: safe to re-run if queueEntryId / index already exist (e.g. partial apply).

ALTER TABLE telemedicine_sessions
  MODIFY COLUMN originType ENUM('appointment','inpatient','standalone','queue') NOT NULL;

-- ADD COLUMN only if missing (avoids ERROR 1060 Duplicate column name 'queueEntryId')
SET @db = DATABASE();
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'telemedicine_sessions'
    AND COLUMN_NAME = 'queueEntryId'
);
SET @sql_add_col = IF(
  @col_exists = 0,
  'ALTER TABLE telemedicine_sessions ADD COLUMN queueEntryId INT NULL AFTER admissionId',
  'SELECT 1 AS skip_queueEntryId_already_present'
);
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

-- Index only if missing (avoids ERROR 1061 Duplicate key name)
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'telemedicine_sessions'
    AND INDEX_NAME = 'idx_tm_queue_entry'
);
SET @sql_add_idx = IF(
  @idx_exists = 0,
  'ALTER TABLE telemedicine_sessions ADD INDEX idx_tm_queue_entry (queueEntryId)',
  'SELECT 1 AS skip_idx_tm_queue_entry_already_present'
);
PREPARE stmt_add_idx FROM @sql_add_idx;
EXECUTE stmt_add_idx;
DEALLOCATE PREPARE stmt_add_idx;
