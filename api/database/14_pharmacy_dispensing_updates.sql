-- ============================================
-- PHARMACY DISPENSING UPDATES
-- ============================================

-- Make batchNumber unique in drug_inventory
-- First drop the existing indexes if they exist (we'll handle errors gracefully)
SET @drop_idx_batch = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'drug_inventory' 
    AND index_name = 'idx_batch') > 0, 
    'ALTER TABLE drug_inventory DROP INDEX idx_batch;', 
    'SELECT 1;');
PREPARE stmt FROM @drop_idx_batch;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_idx_med_batch = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'drug_inventory' 
    AND index_name = 'idx_medication_batch') > 0, 
    'ALTER TABLE drug_inventory DROP INDEX idx_medication_batch;', 
    'SELECT 1;');
PREPARE stmt FROM @drop_idx_med_batch;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add unique constraint on batchNumber
ALTER TABLE drug_inventory ADD UNIQUE KEY unique_batch_number (batchNumber);

-- Add drugInventoryId to invoice_items if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'invoice_items' 
    AND column_name = 'drugInventoryId');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE invoice_items ADD COLUMN drugInventoryId INT NULL AFTER chargeId, ADD INDEX idx_drug_inventory (drugInventoryId), ADD CONSTRAINT fk_invoice_items_drug_inventory FOREIGN KEY (drugInventoryId) REFERENCES drug_inventory(drugInventoryId) ON DELETE SET NULL;',
    'SELECT 1;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
