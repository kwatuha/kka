-- ============================================
-- PROCUREMENT MODULE
-- ============================================

-- Vendors/Suppliers
CREATE TABLE IF NOT EXISTS vendors (
    vendorId INT NOT NULL AUTO_INCREMENT,
    vendorCode VARCHAR(50) UNIQUE,
    vendorName VARCHAR(200) NOT NULL,
    contactPerson VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    taxId VARCHAR(100),
    paymentTerms VARCHAR(100), -- e.g., "Net 30", "Net 60"
    bankName VARCHAR(200),
    bankAccount VARCHAR(100),
    website VARCHAR(200),
    category VARCHAR(100), -- Medical Supplies, Equipment, Pharmaceuticals, etc.
    status ENUM('active', 'inactive', 'blacklisted') DEFAULT 'active',
    rating DECIMAL(3, 2) DEFAULT 0, -- 0-5 rating
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (vendorId),
    INDEX idx_vendor_code (vendorCode),
    INDEX idx_vendor_name (vendorName),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vendor ratings/performance
CREATE TABLE IF NOT EXISTS vendor_ratings (
    ratingId INT NOT NULL AUTO_INCREMENT,
    vendorId INT NOT NULL,
    ratedBy INT,
    ratingDate DATE NOT NULL,
    onTimeDeliveryScore INT, -- 1-5
    qualityScore INT, -- 1-5
    responseTimeScore INT, -- 1-5
    costScore INT, -- 1-5
    overallRating DECIMAL(3, 2), -- Average of all scores
    comments TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ratingId),
    FOREIGN KEY (vendorId) REFERENCES vendors(vendorId) ON DELETE CASCADE,
    FOREIGN KEY (ratedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_vendor (vendorId),
    INDEX idx_rating_date (ratingDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Requisitions (internal purchase requests)
CREATE TABLE IF NOT EXISTS requisitions (
    requisitionId INT NOT NULL AUTO_INCREMENT,
    requisitionNumber VARCHAR(50) UNIQUE NOT NULL,
    requestedBy INT NOT NULL,
    department VARCHAR(100),
    requestDate DATE NOT NULL,
    requiredDate DATE NULL,
    status ENUM('draft', 'pending_approval', 'approved', 'rejected', 'purchase_ordered', 'received', 'cancelled') DEFAULT 'draft',
    approvedBy INT NULL,
    approvedDate DATE NULL,
    rejectionReason TEXT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (requisitionId),
    FOREIGN KEY (requestedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (approvedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_requisition_number (requisitionNumber),
    INDEX idx_requested_by (requestedBy),
    INDEX idx_status (status),
    INDEX idx_request_date (requestDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Requisition items
CREATE TABLE IF NOT EXISTS requisition_items (
    itemId INT NOT NULL AUTO_INCREMENT,
    requisitionId INT NOT NULL,
    inventoryItemId INT NULL, -- Link to inventory item if exists
    itemDescription VARCHAR(500) NOT NULL,
    quantity INT NOT NULL,
    unit VARCHAR(50),
    estimatedCost DECIMAL(15, 2) NULL,
    notes TEXT,
    PRIMARY KEY (itemId),
    FOREIGN KEY (requisitionId) REFERENCES requisitions(requisitionId) ON DELETE CASCADE,
    FOREIGN KEY (inventoryItemId) REFERENCES inventory_items(itemId) ON DELETE SET NULL,
    INDEX idx_requisition (requisitionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    purchaseOrderId INT NOT NULL AUTO_INCREMENT,
    poNumber VARCHAR(50) UNIQUE NOT NULL,
    vendorId INT NOT NULL,
    requisitionId INT NULL, -- Link to requisition if created from requisition
    orderDate DATE NOT NULL,
    expectedDeliveryDate DATE NULL,
    status ENUM('draft', 'sent', 'acknowledged', 'partial_received', 'received', 'cancelled') DEFAULT 'draft',
    subtotal DECIMAL(15, 2) DEFAULT 0,
    tax DECIMAL(15, 2) DEFAULT 0,
    totalAmount DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'KES',
    notes TEXT,
    createdBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (purchaseOrderId),
    FOREIGN KEY (vendorId) REFERENCES vendors(vendorId) ON DELETE RESTRICT,
    FOREIGN KEY (requisitionId) REFERENCES requisitions(requisitionId) ON DELETE SET NULL,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_po_number (poNumber),
    INDEX idx_vendor (vendorId),
    INDEX idx_status (status),
    INDEX idx_order_date (orderDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase order items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    itemId INT NOT NULL AUTO_INCREMENT,
    purchaseOrderId INT NOT NULL,
    inventoryItemId INT NULL,
    itemDescription VARCHAR(500) NOT NULL,
    quantity INT NOT NULL,
    unit VARCHAR(50),
    unitPrice DECIMAL(15, 2) NOT NULL,
    totalPrice DECIMAL(15, 2) NOT NULL,
    quantityReceived INT DEFAULT 0,
    notes TEXT,
    PRIMARY KEY (itemId),
    FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(purchaseOrderId) ON DELETE CASCADE,
    FOREIGN KEY (inventoryItemId) REFERENCES inventory_items(itemId) ON DELETE SET NULL,
    INDEX idx_purchase_order (purchaseOrderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Goods received notes (GRN)
CREATE TABLE IF NOT EXISTS receipts (
    receiptId INT NOT NULL AUTO_INCREMENT,
    receiptNumber VARCHAR(50) UNIQUE NOT NULL,
    purchaseOrderId INT NOT NULL,
    receiptDate DATE NOT NULL,
    receivedBy INT NOT NULL,
    verifiedBy INT NULL,
    status ENUM('draft', 'verified', 'completed') DEFAULT 'draft',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (receiptId),
    FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(purchaseOrderId) ON DELETE RESTRICT,
    FOREIGN KEY (receivedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (verifiedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_receipt_number (receiptNumber),
    INDEX idx_purchase_order (purchaseOrderId),
    INDEX idx_receipt_date (receiptDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Receipt items
CREATE TABLE IF NOT EXISTS receipt_items (
    itemId INT NOT NULL AUTO_INCREMENT,
    receiptId INT NOT NULL,
    purchaseOrderItemId INT NOT NULL,
    quantityReceived INT NOT NULL,
    batchNumber VARCHAR(100) NULL,
    expiryDate DATE NULL,
    conditionStatus ENUM('good', 'damaged', 'expired') DEFAULT 'good',
    notes TEXT,
    PRIMARY KEY (itemId),
    FOREIGN KEY (receiptId) REFERENCES receipts(receiptId) ON DELETE CASCADE,
    FOREIGN KEY (purchaseOrderItemId) REFERENCES purchase_order_items(itemId) ON DELETE RESTRICT,
    INDEX idx_receipt (receiptId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

