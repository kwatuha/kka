-- ============================================
-- PHARMACY AUDIT/HISTORY TABLES
-- ============================================

-- Prescription history/audit log
CREATE TABLE IF NOT EXISTS prescription_history (
    historyId INT NOT NULL AUTO_INCREMENT,
    prescriptionId INT NOT NULL,
    fieldName VARCHAR(100) NOT NULL, -- Field that was changed (e.g., 'status', 'notes', 'doctorId')
    oldValue TEXT, -- Previous value (JSON for complex objects)
    newValue TEXT, -- New value (JSON for complex objects)
    changedBy INT, -- User who made the change
    changeType ENUM('update', 'delete', 'create') DEFAULT 'update',
    changeDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT, -- Additional notes about the change
    PRIMARY KEY (historyId),
    FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE CASCADE,
    FOREIGN KEY (changedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_prescription (prescriptionId),
    INDEX idx_change_date (changeDate),
    INDEX idx_changed_by (changedBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prescription items history/audit log
CREATE TABLE IF NOT EXISTS prescription_items_history (
    historyId INT NOT NULL AUTO_INCREMENT,
    itemId INT NOT NULL,
    prescriptionId INT NOT NULL,
    fieldName VARCHAR(100) NOT NULL,
    oldValue TEXT,
    newValue TEXT,
    changedBy INT,
    changeType ENUM('update', 'delete', 'create') DEFAULT 'update',
    changeDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    PRIMARY KEY (historyId),
    FOREIGN KEY (itemId) REFERENCES prescription_items(itemId) ON DELETE CASCADE,
    FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE CASCADE,
    FOREIGN KEY (changedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_item (itemId),
    INDEX idx_prescription (prescriptionId),
    INDEX idx_change_date (changeDate),
    INDEX idx_changed_by (changedBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drug inventory history/audit log
CREATE TABLE IF NOT EXISTS drug_inventory_history (
    historyId INT NOT NULL AUTO_INCREMENT,
    drugInventoryId INT NOT NULL,
    fieldName VARCHAR(100) NOT NULL, -- Field that was changed
    oldValue TEXT, -- Previous value
    newValue TEXT, -- New value
    changedBy INT, -- User who made the change
    changeType ENUM('update', 'delete', 'create') DEFAULT 'update',
    changeDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT, -- Additional notes about the change
    PRIMARY KEY (historyId),
    FOREIGN KEY (drugInventoryId) REFERENCES drug_inventory(drugInventoryId) ON DELETE CASCADE,
    FOREIGN KEY (changedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_drug_inventory (drugInventoryId),
    INDEX idx_change_date (changeDate),
    INDEX idx_changed_by (changedBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

