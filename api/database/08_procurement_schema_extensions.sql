-- ============================================
-- PROCUREMENT MODULE - EXTENSIONS
-- Additional tables for vendor detail page features
-- ============================================

-- Vendor Products/Catalog
CREATE TABLE IF NOT EXISTS vendor_products (
    productId INT NOT NULL AUTO_INCREMENT,
    vendorId INT NOT NULL,
    productCode VARCHAR(50),
    productName VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50),
    unitPrice DECIMAL(15, 2) NOT NULL,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (productId),
    FOREIGN KEY (vendorId) REFERENCES vendors(vendorId) ON DELETE CASCADE,
    INDEX idx_vendor (vendorId),
    INDEX idx_product_code (productCode),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vendor Contracts
CREATE TABLE IF NOT EXISTS vendor_contracts (
    contractId INT NOT NULL AUTO_INCREMENT,
    vendorId INT NOT NULL,
    contractNumber VARCHAR(50) UNIQUE NOT NULL,
    contractType VARCHAR(100), -- Annual Supply, Exclusive Supply, Service, etc.
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    contractValue DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'KES',
    status ENUM('draft', 'active', 'expired', 'terminated', 'renewed') DEFAULT 'draft',
    renewalOption BOOLEAN DEFAULT FALSE,
    keyTerms TEXT,
    notes TEXT,
    createdBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (contractId),
    FOREIGN KEY (vendorId) REFERENCES vendors(vendorId) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_vendor (vendorId),
    INDEX idx_contract_number (contractNumber),
    INDEX idx_status (status),
    INDEX idx_dates (startDate, endDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vendor Documents
CREATE TABLE IF NOT EXISTS vendor_documents (
    documentId INT NOT NULL AUTO_INCREMENT,
    vendorId INT NOT NULL,
    documentName VARCHAR(200) NOT NULL,
    documentType VARCHAR(100), -- Registration Certificate, Tax Compliance, Product Catalog, ISO Certificate, etc.
    filePath VARCHAR(500),
    fileSize INT, -- Size in bytes
    mimeType VARCHAR(100),
    uploadDate DATE NOT NULL,
    expiryDate DATE NULL,
    uploadedBy INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (documentId),
    FOREIGN KEY (vendorId) REFERENCES vendors(vendorId) ON DELETE CASCADE,
    FOREIGN KEY (uploadedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_vendor (vendorId),
    INDEX idx_document_type (documentType),
    INDEX idx_upload_date (uploadDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vendor Issues/Complaints
CREATE TABLE IF NOT EXISTS vendor_issues (
    issueId INT NOT NULL AUTO_INCREMENT,
    vendorId INT NOT NULL,
    issueTitle VARCHAR(200) NOT NULL,
    issueDate DATE NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    resolution TEXT,
    resolvedBy INT,
    resolvedDate DATE NULL,
    reportedBy INT,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (issueId),
    FOREIGN KEY (vendorId) REFERENCES vendors(vendorId) ON DELETE CASCADE,
    FOREIGN KEY (reportedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (resolvedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_vendor (vendorId),
    INDEX idx_status (status),
    INDEX idx_issue_date (issueDate),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



