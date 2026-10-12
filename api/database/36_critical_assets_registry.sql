-- ============================================
-- CRITICAL ASSETS REGISTRY
-- ============================================
-- This migration adds support for critical assets tracking
-- Critical assets require daily presence verification before hospital close

-- Add isCritical field to assets table (if it doesn't exist)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'assets'
    AND COLUMN_NAME = 'isCritical');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE assets ADD COLUMN isCritical BOOLEAN DEFAULT FALSE AFTER status, ADD INDEX idx_is_critical (isCritical)',
    'SELECT "Column isCritical already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create critical asset daily log table
CREATE TABLE IF NOT EXISTS critical_asset_daily_log (
    logId INT NOT NULL AUTO_INCREMENT,
    assetId INT NOT NULL,
    logDate DATE NOT NULL,
    isPresent BOOLEAN NOT NULL DEFAULT TRUE,
    verifiedBy INT NOT NULL,
    verifiedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    issues TEXT, -- Any issues or discrepancies noted
    location VARCHAR(200), -- Where the asset was found/verified
    `condition` ENUM('good', 'fair', 'poor', 'needs_repair') DEFAULT 'good',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (logId),
    FOREIGN KEY (assetId) REFERENCES assets(assetId) ON DELETE CASCADE,
    FOREIGN KEY (verifiedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    UNIQUE KEY unique_asset_date (assetId, logDate),
    INDEX idx_asset (assetId),
    INDEX idx_log_date (logDate),
    INDEX idx_verified_by (verifiedBy),
    INDEX idx_is_present (isPresent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create view for today's critical assets verification status
CREATE OR REPLACE VIEW vw_critical_assets_today_status AS
SELECT
    a.assetId,
    a.assetCode,
    a.assetName,
    a.category,
    a.location,
    a.status,
    a.isCritical,
    COALESCE(l.isPresent, NULL) as verifiedToday,
    l.logDate as verificationDate,
    l.verifiedBy,
    u.firstName as verifiedByFirstName,
    u.lastName as verifiedByLastName,
    l.notes as verificationNotes,
    l.issues,
    l.`condition`,
    l.verifiedAt
FROM assets a
LEFT JOIN critical_asset_daily_log l ON a.assetId = l.assetId AND l.logDate = CURDATE()
LEFT JOIN users u ON l.verifiedBy = u.userId
WHERE a.isCritical = TRUE AND a.status = 'active'
ORDER BY a.assetName;

-- Create view for critical assets verification history
CREATE OR REPLACE VIEW vw_critical_assets_verification_history AS
SELECT
    l.logId,
    l.assetId,
    a.assetCode,
    a.assetName,
    a.category,
    l.logDate,
    l.isPresent,
    l.verifiedBy,
    u.firstName as verifiedByFirstName,
    u.lastName as verifiedByLastName,
    l.verifiedAt,
    l.notes,
    l.issues,
    l.location,
    l.`condition`
FROM critical_asset_daily_log l
INNER JOIN assets a ON l.assetId = a.assetId
INNER JOIN users u ON l.verifiedBy = u.userId
WHERE a.isCritical = TRUE
ORDER BY l.logDate DESC, a.assetName;
