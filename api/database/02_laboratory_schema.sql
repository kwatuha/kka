-- ============================================
-- LABORATORY MODULE
-- ============================================

-- Laboratory test types (catalog of available tests)
CREATE TABLE IF NOT EXISTS lab_test_types (
    testTypeId INT NOT NULL AUTO_INCREMENT,
    testCode VARCHAR(50) UNIQUE,
    testName VARCHAR(200) NOT NULL,
    category VARCHAR(100), -- Hematology, Chemistry, Microbiology, etc.
    description TEXT,
    turnaroundTime VARCHAR(50), -- e.g., "1 day", "2 hours"
    cost DECIMAL(15, 2),
    normalRange TEXT, -- Normal reference ranges
    specimenType VARCHAR(100), -- Blood, Urine, Stool, etc.
    preparationInstructions TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (testTypeId),
    INDEX idx_test_code (testCode),
    INDEX idx_category (category),
    INDEX idx_name (testName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Laboratory test orders
CREATE TABLE IF NOT EXISTS lab_test_orders (
    orderId INT NOT NULL AUTO_INCREMENT,
    orderNumber VARCHAR(50) UNIQUE NOT NULL,
    patientId INT NOT NULL,
    orderedBy INT NOT NULL, -- Doctor who ordered
    orderDate DATE NOT NULL,
    priority ENUM('routine', 'urgent', 'stat') DEFAULT 'routine',
    clinicalIndication TEXT,
    status ENUM('awaiting_payment', 'pending', 'sample_collected', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    sampleCollectionDate DATETIME NULL,
    expectedCompletionDate DATETIME NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (orderId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (orderedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_order_number (orderNumber),
    INDEX idx_patient (patientId),
    INDEX idx_status (status),
    INDEX idx_order_date (orderDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Laboratory test order items (tests requested in an order)
CREATE TABLE IF NOT EXISTS lab_test_order_items (
    itemId INT NOT NULL AUTO_INCREMENT,
    orderId INT NOT NULL,
    testTypeId INT NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (itemId),
    FOREIGN KEY (orderId) REFERENCES lab_test_orders(orderId) ON DELETE CASCADE,
    FOREIGN KEY (testTypeId) REFERENCES lab_test_types(testTypeId) ON DELETE RESTRICT,
    INDEX idx_order (orderId),
    INDEX idx_test_type (testTypeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Laboratory test results
CREATE TABLE IF NOT EXISTS lab_test_results (
    resultId INT NOT NULL AUTO_INCREMENT,
    orderItemId INT NOT NULL,
    testDate DATE NOT NULL,
    status ENUM('pending', 'verified', 'released', 'cancelled') DEFAULT 'pending',
    performedBy INT, -- Lab technician
    verifiedBy INT, -- Lab supervisor/doctor
    verifiedAt DATETIME NULL,
    releasedAt DATETIME NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (resultId),
    FOREIGN KEY (orderItemId) REFERENCES lab_test_order_items(itemId) ON DELETE RESTRICT,
    FOREIGN KEY (performedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (verifiedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_order_item (orderItemId),
    INDEX idx_status (status),
    INDEX idx_test_date (testDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Laboratory result values (individual parameters/values in a test result)
CREATE TABLE IF NOT EXISTS lab_result_values (
    valueId INT NOT NULL AUTO_INCREMENT,
    resultId INT NOT NULL,
    parameterName VARCHAR(200) NOT NULL, -- e.g., "WBC Count", "Hemoglobin"
    value VARCHAR(200), -- Result value
    unit VARCHAR(50), -- e.g., "x10^9/L", "g/dL"
    normalRange VARCHAR(100), -- e.g., "4.0-11.0"
    flag ENUM('normal', 'low', 'high', 'critical') DEFAULT 'normal',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (valueId),
    FOREIGN KEY (resultId) REFERENCES lab_test_results(resultId) ON DELETE CASCADE,
    INDEX idx_result (resultId),
    INDEX idx_flag (flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Laboratory samples tracking
CREATE TABLE IF NOT EXISTS lab_samples (
    sampleId INT NOT NULL AUTO_INCREMENT,
    orderId INT NOT NULL,
    sampleType VARCHAR(100) NOT NULL, -- Blood, Urine, etc.
    collectionDate DATETIME NOT NULL,
    collectedBy INT,
    receivedDate DATETIME NULL,
    receivedBy INT,
    storageLocation VARCHAR(100),
    expiryDate DATETIME NULL,
    disposalDate DATETIME NULL,
    status ENUM('collected', 'received', 'stored', 'processed', 'disposed') DEFAULT 'collected',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (sampleId),
    FOREIGN KEY (orderId) REFERENCES lab_test_orders(orderId) ON DELETE CASCADE,
    FOREIGN KEY (collectedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (receivedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_order (orderId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Critical value ranges configuration
-- This table defines critical value ranges for specific test parameters
-- Values outside these ranges indicate life-threatening conditions requiring immediate medical attention
CREATE TABLE IF NOT EXISTS lab_critical_value_ranges (
    criticalRangeId INT NOT NULL AUTO_INCREMENT,
    testTypeId INT NOT NULL,
    parameterName VARCHAR(200) NOT NULL, -- e.g., "Hemoglobin", "Potassium", "Creatinine"
    unit VARCHAR(50), -- e.g., "g/dL", "mmol/L", "mg/dL"
    criticalLowValue DECIMAL(10, 2) NULL, -- Critical if value is BELOW this (e.g., Hemoglobin < 7.0)
    criticalHighValue DECIMAL(10, 2) NULL, -- Critical if value is ABOVE this (e.g., Potassium > 6.5)
    description TEXT, -- Description of why this range is critical
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (criticalRangeId),
    FOREIGN KEY (testTypeId) REFERENCES lab_test_types(testTypeId) ON DELETE CASCADE,
    INDEX idx_test_type (testTypeId),
    INDEX idx_parameter (parameterName),
    INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Legacy table - kept for backward compatibility but deprecated
-- Use lab_critical_value_ranges instead
CREATE TABLE IF NOT EXISTS lab_critical_tests (
    criticalTestId INT NOT NULL AUTO_INCREMENT,
    testTypeId INT NOT NULL,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (criticalTestId),
    FOREIGN KEY (testTypeId) REFERENCES lab_test_types(testTypeId) ON DELETE CASCADE,
    UNIQUE KEY unique_critical_test (testTypeId),
    INDEX idx_test_type (testTypeId),
    INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

