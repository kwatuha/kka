-- ============================================
-- DRUG INVENTORY TRANSACTIONS (Stock Movements)
-- ============================================
-- This table tracks ALL stock movements for complete inventory history
-- When you receive 100 tablets, dispense 5, dispense 10, etc., each is recorded
-- This provides complete audit trail and historical inventory levels

CREATE TABLE IF NOT EXISTS drug_inventory_transactions (
    transactionId INT NOT NULL AUTO_INCREMENT,
    drugInventoryId INT NOT NULL,
    transactionType ENUM('RECEIPT', 'DISPENSATION', 'ADJUSTMENT', 'TRANSFER', 'EXPIRY', 'DAMAGE', 'RETURN', 'CORRECTION') NOT NULL,
    transactionDate DATE NOT NULL,
    transactionTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quantityChange INT NOT NULL, -- Positive for receipts, negative for dispensations
    quantityBefore INT NOT NULL, -- Quantity before this transaction
    quantityAfter INT NOT NULL, -- Quantity after this transaction
    balanceAfter INT NOT NULL, -- Running balance after transaction (for easy queries)
    unitPrice DECIMAL(15, 2), -- Unit price at time of transaction (for cost tracking)
    totalValue DECIMAL(15, 2), -- Total value of transaction (quantityChange * unitPrice)
    referenceType VARCHAR(50), -- Type of reference (e.g., 'dispensation', 'purchase_order', 'adjustment')
    referenceId INT, -- ID of related record (dispensationId, purchaseOrderId, etc.)
    referenceNumber VARCHAR(100), -- Human-readable reference (e.g., dispensation number, PO number)
    performedBy INT, -- User who performed the transaction
    notes TEXT, -- Additional notes (reason for adjustment, damage description, etc.)
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transactionId),
    FOREIGN KEY (drugInventoryId) REFERENCES drug_inventory(drugInventoryId) ON DELETE RESTRICT,
    FOREIGN KEY (performedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_drug_inventory (drugInventoryId),
    INDEX idx_transaction_type (transactionType),
    INDEX idx_transaction_date (transactionDate),
    INDEX idx_reference (referenceType, referenceId),
    INDEX idx_batch_transactions (drugInventoryId, transactionDate),
    INDEX idx_date_range (transactionDate, transactionType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add status field to drug_inventory to track batch lifecycle
-- Check if column exists before adding (MySQL doesn't support IF NOT EXISTS for ALTER TABLE)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'drug_inventory' 
  AND COLUMN_NAME = 'status';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE drug_inventory ADD COLUMN status ENUM(\'active\', \'exhausted\', \'expired\', \'damaged\', \'returned\') DEFAULT \'active\' AFTER quantity',
    'SELECT "Status column already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for status queries (check if index exists first)
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drug_inventory'
  AND INDEX_NAME = 'idx_status';

SET @sql_idx = IF(@idx_exists = 0,
    'ALTER TABLE drug_inventory ADD INDEX idx_status (status)',
    'SELECT "Index idx_status already exists" AS message');
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- Add originalQuantity field to track initial stock received
SET @col_exists2 = 0;
SELECT COUNT(*) INTO @col_exists2 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'drug_inventory' 
  AND COLUMN_NAME = 'originalQuantity';

SET @sql2 = IF(@col_exists2 = 0,
    'ALTER TABLE drug_inventory ADD COLUMN originalQuantity INT NULL AFTER quantity',
    'SELECT "OriginalQuantity column already exists" AS message');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Add dateExhausted to track when batch ran out
SET @col_exists3 = 0;
SELECT COUNT(*) INTO @col_exists3 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'drug_inventory' 
  AND COLUMN_NAME = 'dateExhausted';

SET @sql3 = IF(@col_exists3 = 0,
    'ALTER TABLE drug_inventory ADD COLUMN dateExhausted DATE NULL AFTER updatedAt',
    'SELECT "DateExhausted column already exists" AS message');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Add comments explaining the fields
ALTER TABLE drug_inventory 
MODIFY COLUMN status ENUM('active', 'exhausted', 'expired', 'damaged', 'returned') 
COMMENT 'Batch lifecycle status: active=has stock, exhausted=ran out, expired=expired, damaged=damaged, returned=returned to supplier';

-- Create a view for inventory history summary
-- Drop view if exists (MySQL doesn't support CREATE OR REPLACE VIEW in all versions)
DROP VIEW IF EXISTS vw_drug_inventory_history;
CREATE VIEW vw_drug_inventory_history AS
SELECT 
    dit.transactionId,
    dit.drugInventoryId,
    di.batchNumber,
    di.medicationId,
    m.name as medicationName,
    m.medicationCode,
    dit.transactionType,
    dit.transactionDate,
    dit.transactionTime,
    dit.quantityChange,
    dit.quantityBefore,
    dit.quantityAfter,
    dit.balanceAfter,
    dit.unitPrice,
    dit.totalValue,
    dit.referenceType,
    dit.referenceId,
    dit.referenceNumber,
    u.firstName as performedByFirstName,
    u.lastName as performedByLastName,
    dit.notes,
    di.originalQuantity,
    di.quantity as currentQuantity,
    di.status as batchStatus,
    di.dateExhausted,
    di.expiryDate
FROM drug_inventory_transactions dit
INNER JOIN drug_inventory di ON dit.drugInventoryId = di.drugInventoryId
LEFT JOIN medications m ON di.medicationId = m.medicationId
LEFT JOIN users u ON dit.performedBy = u.userId
ORDER BY dit.drugInventoryId, dit.transactionDate DESC, dit.transactionTime DESC;

-- Create a view for batch summary (shows complete lifecycle of a batch)
DROP VIEW IF EXISTS vw_batch_summary;
CREATE VIEW vw_batch_summary AS
SELECT 
    di.drugInventoryId,
    di.batchNumber,
    di.medicationId,
    m.name as medicationName,
    m.medicationCode,
    di.originalQuantity,
    di.quantity as currentQuantity,
    di.quantity - di.originalQuantity as totalDispensed, -- Should be negative or 0
    ABS(COALESCE((SELECT SUM(quantityChange) FROM drug_inventory_transactions WHERE drugInventoryId = di.drugInventoryId AND transactionType = 'DISPENSATION'), 0)) as totalDispensedQuantity,
    COALESCE((SELECT SUM(quantityChange) FROM drug_inventory_transactions WHERE drugInventoryId = di.drugInventoryId AND transactionType = 'RECEIPT'), 0) as totalReceivedQuantity,
    di.unitPrice as costPrice,
    di.sellPrice,
    di.manufactureDate,
    di.expiryDate,
    di.dateExhausted,
    di.status,
    di.location,
    (SELECT MIN(transactionDate) FROM drug_inventory_transactions WHERE drugInventoryId = di.drugInventoryId) as firstTransactionDate,
    (SELECT MAX(transactionDate) FROM drug_inventory_transactions WHERE drugInventoryId = di.drugInventoryId) as lastTransactionDate,
    (SELECT COUNT(*) FROM drug_inventory_transactions WHERE drugInventoryId = di.drugInventoryId AND transactionType = 'DISPENSATION') as dispensationCount,
    di.createdAt as batchCreatedAt,
    di.updatedAt as batchUpdatedAt
FROM drug_inventory di
LEFT JOIN medications m ON di.medicationId = m.medicationId
ORDER BY di.createdAt DESC;

