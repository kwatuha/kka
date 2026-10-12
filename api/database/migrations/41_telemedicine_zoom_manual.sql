-- Optional legacy upgrade: adds zoomJoinUrl / zoomPassword if missing (old installs that had daily-only 40).
-- Current 40_telemedicine_sessions_schema.sql already includes these columns — this file is safe no-op then.

SET @db = DATABASE();
SET @has = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'telemedicine_sessions');

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'telemedicine_sessions' AND COLUMN_NAME = 'zoomJoinUrl');
SET @sql = IF(@has > 0 AND @exists = 0, 'ALTER TABLE telemedicine_sessions ADD COLUMN zoomJoinUrl TEXT NULL AFTER roomUrl', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'telemedicine_sessions' AND COLUMN_NAME = 'zoomPassword');
SET @sql = IF(@has > 0 AND @exists = 0, 'ALTER TABLE telemedicine_sessions ADD COLUMN zoomPassword VARCHAR(100) NULL AFTER zoomJoinUrl', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
