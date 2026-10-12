-- ============================================
-- ASSET MAINTENANCE RECORDS
-- ============================================
-- This migration adds support for asset maintenance tracking

-- Create asset maintenance records table
CREATE TABLE IF NOT EXISTS asset_maintenance (
    maintenanceId INT NOT NULL AUTO_INCREMENT,
    assetId INT NOT NULL,
    maintenanceType ENUM('scheduled', 'repair', 'inspection', 'calibration', 'cleaning', 'upgrade', 'other') NOT NULL DEFAULT 'repair',
    maintenanceDate DATE NOT NULL,
    scheduledDate DATE NULL, -- For scheduled maintenance
    completedDate DATE NULL, -- When maintenance was actually completed
    status ENUM('scheduled', 'in-progress', 'completed', 'cancelled', 'overdue') DEFAULT 'scheduled',
    description TEXT,
    workPerformed TEXT, -- Detailed description of work done
    cost DECIMAL(15, 2) DEFAULT 0,
    performedBy INT NULL, -- Staff member who performed maintenance
    serviceProvider VARCHAR(200) NULL, -- Internal or external service provider name
    partsReplaced TEXT, -- List of parts replaced
    nextMaintenanceDate DATE NULL, -- For recurring maintenance
    maintenanceIntervalDays INT NULL, -- Days until next maintenance (for recurring)
    notes TEXT,
    attachments TEXT, -- JSON array of file paths/URLs
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT NULL,
    PRIMARY KEY (maintenanceId),
    FOREIGN KEY (assetId) REFERENCES assets(assetId) ON DELETE CASCADE,
    FOREIGN KEY (performedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_asset (assetId),
    INDEX idx_maintenance_date (maintenanceDate),
    INDEX idx_status (status),
    INDEX idx_maintenance_type (maintenanceType),
    INDEX idx_scheduled_date (scheduledDate),
    INDEX idx_next_maintenance (nextMaintenanceDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create view for upcoming maintenance
CREATE OR REPLACE VIEW vw_upcoming_maintenance AS
SELECT
    m.maintenanceId,
    m.assetId,
    a.assetCode,
    a.assetName,
    a.category,
    a.location,
    m.maintenanceType,
    m.scheduledDate,
    m.nextMaintenanceDate,
    m.status,
    m.maintenanceIntervalDays,
    DATEDIFF(COALESCE(m.scheduledDate, m.nextMaintenanceDate), CURDATE()) as daysUntil,
    u.firstName as performedByFirstName,
    u.lastName as performedByLastName
FROM asset_maintenance m
INNER JOIN assets a ON m.assetId = a.assetId
LEFT JOIN users u ON m.performedBy = u.userId
WHERE m.status IN ('scheduled', 'in-progress')
    AND (m.scheduledDate >= CURDATE() OR m.nextMaintenanceDate >= CURDATE())
ORDER BY COALESCE(m.scheduledDate, m.nextMaintenanceDate) ASC;

-- Create view for maintenance history
CREATE OR REPLACE VIEW vw_maintenance_history AS
SELECT
    m.maintenanceId,
    m.assetId,
    a.assetCode,
    a.assetName,
    a.category,
    m.maintenanceType,
    m.maintenanceDate,
    m.completedDate,
    m.status,
    m.cost,
    m.description,
    m.workPerformed,
    m.serviceProvider,
    m.partsReplaced,
    u.firstName as performedByFirstName,
    u.lastName as performedByLastName,
    m.createdAt,
    m.updatedAt
FROM asset_maintenance m
INNER JOIN assets a ON m.assetId = a.assetId
LEFT JOIN users u ON m.performedBy = u.userId
ORDER BY m.maintenanceDate DESC, m.createdAt DESC;
