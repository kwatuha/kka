-- ============================================
-- INVENTORY ENHANCEMENTS
-- ============================================

-- Inventory categories
CREATE TABLE IF NOT EXISTS inventory_categories (
    categoryId INT NOT NULL AUTO_INCREMENT,
    categoryCode VARCHAR(50) UNIQUE,
    categoryName VARCHAR(200) NOT NULL,
    parentCategoryId INT NULL, -- For sub-categories
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (categoryId),
    FOREIGN KEY (parentCategoryId) REFERENCES inventory_categories(categoryId) ON DELETE SET NULL,
    INDEX idx_category_code (categoryCode),
    INDEX idx_category_name (categoryName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory transactions (stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    transactionId INT NOT NULL AUTO_INCREMENT,
    transactionNumber VARCHAR(50) UNIQUE NOT NULL,
    itemId INT NOT NULL,
    transactionType ENUM('receipt', 'issue', 'adjustment', 'transfer', 'return', 'wastage', 'expiry') NOT NULL,
    transactionDate DATE NOT NULL,
    quantity INT NOT NULL, -- Positive for receipts, negative for issues
    unitPrice DECIMAL(15, 2) NULL,
    totalValue DECIMAL(15, 2) NULL,
    batchNumber VARCHAR(100) NULL,
    expiryDate DATE NULL,
    fromLocation VARCHAR(100) NULL, -- For transfers
    toLocation VARCHAR(100) NULL, -- For transfers
    referenceNumber VARCHAR(100) NULL, -- PO number, requisition number, etc.
    referenceType VARCHAR(50) NULL, -- purchase_order, requisition, etc.
    reason TEXT,
    performedBy INT NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transactionId),
    FOREIGN KEY (itemId) REFERENCES inventory_items(itemId) ON DELETE RESTRICT,
    FOREIGN KEY (performedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_transaction_number (transactionNumber),
    INDEX idx_item (itemId),
    INDEX idx_transaction_type (transactionType),
    INDEX idx_transaction_date (transactionDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add categoryId column to inventory_items if not exists (run this separately if needed)
-- ALTER TABLE inventory_items ADD COLUMN categoryId INT NULL AFTER category;
-- ALTER TABLE inventory_items ADD FOREIGN KEY (categoryId) REFERENCES inventory_categories(categoryId) ON DELETE SET NULL;

