-- ============================================
-- ENHANCEMENT: Add sellPrice to drug_inventory_transactions
-- ============================================
-- This enhancement adds sellPrice tracking to preserve both buying and selling prices
-- in transaction history, even after batches are exhausted
-- This is critical because the same drug can have different prices based on purchase price
-- and each batch has different pricing

-- Add sellPrice column to drug_inventory_transactions
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drug_inventory_transactions'
  AND COLUMN_NAME = 'sellPrice';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE drug_inventory_transactions ADD COLUMN sellPrice DECIMAL(15, 2) NULL AFTER unitPrice',
    'SELECT "SellPrice column already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add totalSellValue column to track total selling value (quantityChange * sellPrice)
SET @col_exists2 = 0;
SELECT COUNT(*) INTO @col_exists2
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drug_inventory_transactions'
  AND COLUMN_NAME = 'totalSellValue';

SET @sql2 = IF(@col_exists2 = 0,
    'ALTER TABLE drug_inventory_transactions ADD COLUMN totalSellValue DECIMAL(15, 2) NULL AFTER totalValue',
    'SELECT "TotalSellValue column already exists" AS message');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Add comments explaining the pricing fields
ALTER TABLE drug_inventory_transactions
MODIFY COLUMN unitPrice DECIMAL(15, 2)
COMMENT 'Buying/cost price per unit at time of transaction (from drug_inventory.unitPrice)';

ALTER TABLE drug_inventory_transactions
MODIFY COLUMN sellPrice DECIMAL(15, 2)
COMMENT 'Selling price per unit at time of transaction (from drug_inventory.sellPrice)';

ALTER TABLE drug_inventory_transactions
MODIFY COLUMN totalValue DECIMAL(15, 2)
COMMENT 'Total cost value of transaction (quantityChange * unitPrice)';

ALTER TABLE drug_inventory_transactions
MODIFY COLUMN totalSellValue DECIMAL(15, 2)
COMMENT 'Total selling value of transaction (quantityChange * sellPrice)';

-- Update the view to include sellPrice and totalSellValue
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
    dit.sellPrice,
    dit.totalValue,
    dit.totalSellValue,
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

-- Update batch summary view to include pricing information
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
    -- Calculate total cost value (buying price)
    COALESCE((SELECT SUM(totalValue) FROM drug_inventory_transactions WHERE drugInventoryId = di.drugInventoryId AND transactionType = 'RECEIPT'), 0) as totalCostValue,
    -- Calculate total selling value
    COALESCE((SELECT SUM(totalSellValue) FROM drug_inventory_transactions WHERE drugInventoryId = di.drugInventoryId AND transactionType = 'DISPENSATION'), 0) as totalSellValue,
    -- Calculate profit margin
    COALESCE((SELECT SUM(totalSellValue) FROM drug_inventory_transactions WHERE drugInventoryId = di.drugInventoryId AND transactionType = 'DISPENSATION'), 0) -
    COALESCE((SELECT SUM(totalValue) FROM drug_inventory_transactions WHERE drugInventoryId = di.drugInventoryId AND transactionType = 'DISPENSATION'), 0) as profitMargin,
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





