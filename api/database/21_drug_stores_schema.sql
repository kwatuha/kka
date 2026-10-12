-- ============================================
-- DRUG STORES MANAGEMENT
-- Multi-branch drug store system with transfers and reorder levels
-- ============================================

-- Branches/Facilities table (for multi-branch hospitals)
CREATE TABLE IF NOT EXISTS branches (
    branchId INT NOT NULL AUTO_INCREMENT,
    branchCode VARCHAR(50) UNIQUE NOT NULL,
    branchName VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    isMainBranch BOOLEAN DEFAULT FALSE, -- Only one main branch
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (branchId),
    INDEX idx_branch_code (branchCode),
    INDEX idx_branch_name (branchName),
    INDEX idx_main_branch (isMainBranch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drug Stores/Locations table (stores within each branch)
CREATE TABLE IF NOT EXISTS drug_stores (
    storeId INT NOT NULL AUTO_INCREMENT,
    storeCode VARCHAR(50) UNIQUE NOT NULL,
    storeName VARCHAR(200) NOT NULL,
    branchId INT NOT NULL, -- Which branch this store belongs to
    isDispensingStore BOOLEAN DEFAULT FALSE, -- True if this is the dispensing store for the branch
    location VARCHAR(200), -- Physical location/address within the branch
    contactPerson VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100),
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (storeId),
    FOREIGN KEY (branchId) REFERENCES branches(branchId) ON DELETE RESTRICT,
    INDEX idx_store_code (storeCode),
    INDEX idx_branch (branchId),
    INDEX idx_dispensing (isDispensingStore)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drug Store Reorder Levels (per store, per medication)
CREATE TABLE IF NOT EXISTS drug_store_reorder_levels (
    reorderLevelId INT NOT NULL AUTO_INCREMENT,
    storeId INT NOT NULL,
    medicationId INT NOT NULL,
    reorderLevel INT NOT NULL DEFAULT 0, -- Minimum quantity before reorder notification
    reorderQuantity INT NOT NULL DEFAULT 0, -- Quantity to order when reorder level is reached
    maxStockLevel INT, -- Maximum stock level for this medication in this store
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (reorderLevelId),
    FOREIGN KEY (storeId) REFERENCES drug_stores(storeId) ON DELETE CASCADE,
    FOREIGN KEY (medicationId) REFERENCES medications(medicationId) ON DELETE CASCADE,
    UNIQUE KEY unique_store_medication (storeId, medicationId),
    INDEX idx_store (storeId),
    INDEX idx_medication (medicationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drug Inventory Transfers (track transfers between stores)
CREATE TABLE IF NOT EXISTS drug_inventory_transfers (
    transferId INT NOT NULL AUTO_INCREMENT,
    transferNumber VARCHAR(50) UNIQUE NOT NULL,
    fromStoreId INT NOT NULL,
    toStoreId INT NOT NULL,
    medicationId INT NOT NULL,
    drugInventoryId INT, -- Specific batch being transferred
    batchNumber VARCHAR(100), -- Batch number (for reference)
    quantity INT NOT NULL,
    unitPrice DECIMAL(15, 2), -- Cost price at time of transfer
    transferDate DATE NOT NULL,
    transferTime TIME,
    status ENUM('pending', 'in_transit', 'completed', 'cancelled') DEFAULT 'pending',
    requestedBy INT, -- User who requested the transfer
    approvedBy INT, -- User who approved the transfer
    receivedBy INT, -- User who received the transfer
    receivedDate DATE,
    receivedTime TIME,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (transferId),
    FOREIGN KEY (fromStoreId) REFERENCES drug_stores(storeId) ON DELETE RESTRICT,
    FOREIGN KEY (toStoreId) REFERENCES drug_stores(storeId) ON DELETE RESTRICT,
    FOREIGN KEY (medicationId) REFERENCES medications(medicationId) ON DELETE RESTRICT,
    FOREIGN KEY (drugInventoryId) REFERENCES drug_inventory(drugInventoryId) ON DELETE SET NULL,
    FOREIGN KEY (requestedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (approvedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (receivedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_transfer_number (transferNumber),
    INDEX idx_from_store (fromStoreId),
    INDEX idx_to_store (toStoreId),
    INDEX idx_medication (medicationId),
    INDEX idx_status (status),
    INDEX idx_transfer_date (transferDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add storeId column to drug_inventory table (migration will handle existing data)
-- Note: We'll keep location field for backward compatibility during migration
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'drug_inventory' 
  AND COLUMN_NAME = 'storeId';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE drug_inventory ADD COLUMN storeId INT NULL AFTER location',
    'SELECT "Column storeId already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint if it doesn't exist
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drug_inventory'
  AND CONSTRAINT_NAME = 'fk_drug_inventory_store';

SET @sql_fk = IF(@fk_exists = 0,
    'ALTER TABLE drug_inventory 
     ADD CONSTRAINT fk_drug_inventory_store 
     FOREIGN KEY (storeId) REFERENCES drug_stores(storeId) ON DELETE RESTRICT',
    'SELECT "Foreign key fk_drug_inventory_store already exists" AS message');
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- Add index if it doesn't exist
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drug_inventory'
  AND INDEX_NAME = 'idx_store';

SET @sql_idx = IF(@idx_exists = 0,
    'ALTER TABLE drug_inventory ADD INDEX idx_store (storeId)',
    'SELECT "Index idx_store already exists" AS message');
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- Update vw_drug_inventory_aggregated view to use storeId if needed
-- (The view currently doesn't group by location, so no changes needed there)


