-- Migration 88: Medication substitution audit trail (Phase 1)
-- Allows pharmacists to dispense an alternate medication with full accountability.

CREATE TABLE IF NOT EXISTS prescription_item_substitutions (
    substitutionId INT NOT NULL AUTO_INCREMENT,
    prescriptionItemId INT NOT NULL,
    prescriptionId INT NOT NULL,
    prescribedMedicationId INT NOT NULL,
    dispensedMedicationId INT NOT NULL,
    drugInventoryId INT NULL COMMENT 'Preferred batch selected at substitution time',
    substitutionType ENUM('generic', 'therapeutic', 'stock_unavailable', 'other') NOT NULL DEFAULT 'other',
    reason TEXT NOT NULL,
    status ENUM('active', 'dispensed', 'cancelled') NOT NULL DEFAULT 'active',
    substitutedBy INT NULL,
    dispensationId INT NULL,
    notes TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (substitutionId),
    FOREIGN KEY (prescriptionItemId) REFERENCES prescription_items(itemId) ON DELETE CASCADE,
    FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE CASCADE,
    FOREIGN KEY (prescribedMedicationId) REFERENCES medications(medicationId) ON DELETE RESTRICT,
    FOREIGN KEY (dispensedMedicationId) REFERENCES medications(medicationId) ON DELETE RESTRICT,
    FOREIGN KEY (drugInventoryId) REFERENCES drug_inventory(drugInventoryId) ON DELETE SET NULL,
    FOREIGN KEY (substitutedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (dispensationId) REFERENCES dispensations(dispensationId) ON DELETE SET NULL,
    INDEX idx_substitution_item (prescriptionItemId),
    INDEX idx_substitution_prescription (prescriptionId),
    INDEX idx_substitution_status (status),
    INDEX idx_substitution_dispensed_med (dispensedMedicationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link dispensations back to the substitution record when applicable
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dispensations'
      AND COLUMN_NAME = 'substitutionId'
);
SET @sql = IF(
    @col_exists = 0,
    'ALTER TABLE dispensations ADD COLUMN substitutionId INT NULL AFTER prescriptionItemId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dispensations'
      AND CONSTRAINT_NAME = 'fk_dispensations_substitution'
);
SET @sql = IF(
    @fk_exists = 0,
    'ALTER TABLE dispensations ADD CONSTRAINT fk_dispensations_substitution FOREIGN KEY (substitutionId) REFERENCES prescription_item_substitutions(substitutionId) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
