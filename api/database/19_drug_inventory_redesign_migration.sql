-- ============================================
-- DRUG INVENTORY REDESIGN MIGRATION
-- ============================================
-- This migration implements a more robust inventory system:
-- 1. Aggregated drug_inventory (one record per medication)
-- 2. drug_stock_adjustments table for all batch details
-- 3. Patient information in transactions
-- ============================================

-- Step 1: Create backup of current drug_inventory structure
CREATE TABLE IF NOT EXISTS drug_inventory_backup AS SELECT * FROM drug_inventory;

-- Step 2: Add patient information to drug_inventory_transactions
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drug_inventory_transactions'
  AND COLUMN_NAME = 'patientId';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE drug_inventory_transactions
     ADD COLUMN patientId INT NULL AFTER drugInventoryId,
     ADD COLUMN prescriptionId INT NULL AFTER patientId,
     ADD COLUMN dispensationId INT NULL AFTER prescriptionId',
    'SELECT "Patient columns already exist" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign keys and indexes for patient information
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drug_inventory_transactions'
  AND CONSTRAINT_NAME = 'fk_dit_patient';

SET @sql_fk = IF(@fk_exists = 0,
    'ALTER TABLE drug_inventory_transactions
     ADD CONSTRAINT fk_dit_patient FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE SET NULL,
     ADD CONSTRAINT fk_dit_prescription FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE SET NULL,
     ADD CONSTRAINT fk_dit_dispensation FOREIGN KEY (dispensationId) REFERENCES dispensations(dispensationId) ON DELETE SET NULL,
     ADD INDEX idx_patient (patientId),
     ADD INDEX idx_prescription (prescriptionId)',
    'SELECT "Foreign keys already exist" AS message');
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- Step 3: Create drug_stock_adjustments table
CREATE TABLE IF NOT EXISTS drug_stock_adjustments (
    adjustmentId INT NOT NULL AUTO_INCREMENT,
    drugInventoryId INT NOT NULL,
    medicationId INT NOT NULL,
    adjustmentType ENUM('RECEIPT', 'DISPENSATION', 'ADJUSTMENT', 'TRANSFER', 'EXPIRY', 'DAMAGE', 'RETURN', 'CORRECTION') NOT NULL,
    adjustmentDate DATE NOT NULL,
    adjustmentTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quantity INT NOT NULL,
    -- Batch details
    batchNumber VARCHAR(100) NOT NULL,
    unitPrice DECIMAL(15, 2) NOT NULL,
    sellPrice DECIMAL(15, 2) NOT NULL,
    manufactureDate DATE,
    expiryDate DATE NOT NULL,
    minPrice DECIMAL(15, 2),
    location VARCHAR(100),
    -- Patient information
    patientId INT NULL,
    prescriptionId INT NULL,
    dispensationId INT NULL,
    -- Reference information
    referenceType VARCHAR(50),
    referenceId INT,
    referenceNumber VARCHAR(100),
    -- User who performed the adjustment
    performedBy INT NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (adjustmentId),
    FOREIGN KEY (drugInventoryId) REFERENCES drug_inventory(drugInventoryId) ON DELETE RESTRICT,
    FOREIGN KEY (medicationId) REFERENCES medications(medicationId) ON DELETE RESTRICT,
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE SET NULL,
    FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE SET NULL,
    FOREIGN KEY (dispensationId) REFERENCES dispensations(dispensationId) ON DELETE SET NULL,
    FOREIGN KEY (performedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_drug_inventory (drugInventoryId),
    INDEX idx_medication (medicationId),
    INDEX idx_adjustment_type (adjustmentType),
    INDEX idx_adjustment_date (adjustmentDate),
    INDEX idx_batch (batchNumber),
    INDEX idx_patient (patientId),
    INDEX idx_prescription (prescriptionId),
    INDEX idx_dispensation (dispensationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Migrate existing transaction data to stock_adjustments
-- This creates stock adjustments from existing transactions
INSERT INTO drug_stock_adjustments (
    drugInventoryId,
    medicationId,
    adjustmentType,
    adjustmentDate,
    adjustmentTime,
    quantity,
    batchNumber,
    unitPrice,
    sellPrice,
    expiryDate,
    location,
    referenceType,
    referenceId,
    referenceNumber,
    performedBy,
    notes
)
SELECT
    dit.drugInventoryId,
    di.medicationId,
    dit.transactionType,
    dit.transactionDate,
    dit.transactionTime,
    dit.quantityChange,
    di.batchNumber,
    COALESCE(dit.unitPrice, di.unitPrice, 0),
    COALESCE(dit.sellPrice, di.sellPrice, 0),
    di.expiryDate,
    di.location,
    dit.referenceType,
    dit.referenceId,
    dit.referenceNumber,
    dit.performedBy,
    dit.notes
FROM drug_inventory_transactions dit
INNER JOIN drug_inventory di ON dit.drugInventoryId = di.drugInventoryId
WHERE NOT EXISTS (
    SELECT 1 FROM drug_stock_adjustments dsa
    WHERE dsa.drugInventoryId = dit.drugInventoryId
    AND dsa.adjustmentDate = dit.transactionDate
    AND dsa.adjustmentTime = dit.transactionTime
);

-- Step 5: Update transactions with patient information from dispensations
UPDATE drug_inventory_transactions dit
INNER JOIN drug_inventory di ON dit.drugInventoryId = di.drugInventoryId
INNER JOIN dispensations d ON dit.referenceId = d.dispensationId AND dit.referenceType = 'dispensation'
INNER JOIN prescription_items pi ON d.prescriptionItemId = pi.itemId
INNER JOIN prescriptions p ON pi.prescriptionId = p.prescriptionId
SET
    dit.patientId = p.patientId,
    dit.prescriptionId = p.prescriptionId,
    dit.dispensationId = d.dispensationId
WHERE dit.patientId IS NULL AND dit.transactionType = 'DISPENSATION';

-- Step 6: Update stock_adjustments with patient information
UPDATE drug_stock_adjustments dsa
INNER JOIN drug_inventory_transactions dit ON
    dsa.drugInventoryId = dit.drugInventoryId
    AND dsa.adjustmentDate = dit.transactionDate
    AND dsa.adjustmentTime = dit.transactionTime
SET
    dsa.patientId = dit.patientId,
    dsa.prescriptionId = dit.prescriptionId,
    dsa.dispensationId = dit.dispensationId
WHERE dsa.patientId IS NULL AND dsa.adjustmentType = 'DISPENSATION';

-- Step 7: Create aggregated drug_inventory view (for reference, actual table stays as is for now)
-- We'll keep the current structure but add a view for aggregated quantities
DROP VIEW IF EXISTS vw_drug_inventory_aggregated;
CREATE VIEW vw_drug_inventory_aggregated AS
SELECT
    di.medicationId,
    m.name as medicationName,
    m.medicationCode,
    m.genericName,
    m.dosageForm,
    m.strength,
    SUM(di.quantity) as totalQuantity,
    COUNT(DISTINCT di.drugInventoryId) as batchCount,
    MIN(di.expiryDate) as earliestExpiryDate,
    MAX(di.expiryDate) as latestExpiryDate,
    AVG(di.unitPrice) as averageUnitPrice,
    AVG(di.sellPrice) as averageSellPrice,
    MIN(di.unitPrice) as minUnitPrice,
    MAX(di.sellPrice) as maxSellPrice,
    di.location,
    CASE
        WHEN SUM(di.quantity) = 0 THEN 'out_of_stock'
        WHEN SUM(di.quantity) < 10 THEN 'low_stock'
        ELSE 'active'
    END as status
FROM drug_inventory di
INNER JOIN medications m ON di.medicationId = m.medicationId
WHERE di.status != 'exhausted' OR di.quantity > 0
GROUP BY di.medicationId, m.name, m.medicationCode, m.genericName, m.dosageForm, m.strength, di.location;

-- Step 8: Create comprehensive history view with patient information
DROP VIEW IF EXISTS vw_drug_history_complete;
CREATE VIEW vw_drug_history_complete AS
SELECT
    dsa.adjustmentId,
    dsa.drugInventoryId,
    dsa.medicationId,
    m.name as medicationName,
    m.medicationCode,
    dsa.adjustmentType,
    dsa.adjustmentDate,
    dsa.adjustmentTime,
    dsa.quantity,
    dsa.batchNumber,
    dsa.unitPrice,
    dsa.sellPrice,
    dsa.expiryDate,
    dsa.location,
    -- Patient information
    dsa.patientId,
    p.firstName as patientFirstName,
    p.lastName as patientLastName,
    p.patientNumber,
    -- Prescription information
    dsa.prescriptionId,
    pr.prescriptionNumber,
    -- Dispensation information
    dsa.dispensationId,
    -- Reference
    dsa.referenceType,
    dsa.referenceNumber,
    -- User
    u.firstName as performedByFirstName,
    u.lastName as performedByLastName,
    dsa.notes,
    dsa.createdAt
FROM drug_stock_adjustments dsa
INNER JOIN medications m ON dsa.medicationId = m.medicationId
LEFT JOIN patients p ON dsa.patientId = p.patientId
LEFT JOIN prescriptions pr ON dsa.prescriptionId = pr.prescriptionId
LEFT JOIN users u ON dsa.performedBy = u.userId
ORDER BY dsa.adjustmentDate DESC, dsa.adjustmentTime DESC;

-- Step 9: Add comments
ALTER TABLE drug_stock_adjustments
MODIFY COLUMN adjustmentType ENUM('RECEIPT', 'DISPENSATION', 'ADJUSTMENT', 'TRANSFER', 'EXPIRY', 'DAMAGE', 'RETURN', 'CORRECTION')
COMMENT 'Type of stock adjustment: RECEIPT=stock received, DISPENSATION=dispensed to patient, ADJUSTMENT=manual adjustment, etc.';

ALTER TABLE drug_inventory_transactions
MODIFY COLUMN patientId INT
COMMENT 'Patient who received the drug (for DISPENSATION transactions)';






