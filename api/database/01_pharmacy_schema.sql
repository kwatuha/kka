-- ============================================
-- PHARMACY MODULE
-- ============================================

-- Medications catalog (drug reference information)
CREATE TABLE IF NOT EXISTS medications (
    medicationId INT NOT NULL AUTO_INCREMENT,
    medicationCode VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    genericName VARCHAR(200),
    dosageForm VARCHAR(100), -- Tablet, Capsule, Syrup, Injection, etc.
    strength VARCHAR(100), -- e.g., "500mg", "10ml"
    category VARCHAR(100), -- Antibiotic, Analgesic, etc.
    manufacturer VARCHAR(200),
    description TEXT,
    indications TEXT,
    contraindications TEXT,
    sideEffects TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (medicationId),
    INDEX idx_code (medicationCode),
    INDEX idx_name (name),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    prescriptionId INT NOT NULL AUTO_INCREMENT,
    prescriptionNumber VARCHAR(50) UNIQUE NOT NULL,
    patientId INT NOT NULL,
    doctorId INT NOT NULL,
    prescriptionDate DATE NOT NULL,
    status ENUM('pending', 'dispensed', 'picked_up', 'cancelled', 'expired') DEFAULT 'pending',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (prescriptionId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_prescription_number (prescriptionNumber),
    INDEX idx_patient (patientId),
    INDEX idx_doctor (doctorId),
    INDEX idx_status (status),
    INDEX idx_date (prescriptionDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prescription items (individual medications in a prescription)
CREATE TABLE IF NOT EXISTS prescription_items (
    itemId INT NOT NULL AUTO_INCREMENT,
    prescriptionId INT NOT NULL,
    medicationId INT,
    medicationName VARCHAR(200) NOT NULL, -- Store name in case medication is deleted
    dosage VARCHAR(200) NOT NULL, -- e.g., "1 tablet"
    frequency VARCHAR(100) NOT NULL, -- e.g., "3 times daily", "twice daily"
    duration VARCHAR(100) NOT NULL, -- e.g., "7 days", "2 weeks"
    quantity INT,
    instructions TEXT, -- Special instructions
    status ENUM('pending', 'dispensed', 'cancelled') DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (itemId),
    FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE CASCADE,
    FOREIGN KEY (medicationId) REFERENCES medications(medicationId) ON DELETE SET NULL,
    INDEX idx_prescription (prescriptionId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dispensations (dispensing records)
CREATE TABLE IF NOT EXISTS dispensations (
    dispensationId INT NOT NULL AUTO_INCREMENT,
    prescriptionItemId INT NOT NULL,
    dispensationDate DATE NOT NULL,
    quantityDispensed INT NOT NULL,
    batchNumber VARCHAR(100),
    expiryDate DATE,
    dispensedBy INT NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (dispensationId),
    FOREIGN KEY (prescriptionItemId) REFERENCES prescription_items(itemId) ON DELETE RESTRICT,
    FOREIGN KEY (dispensedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_prescription_item (prescriptionItemId),
    INDEX idx_date (dispensationDate),
    INDEX idx_dispensed_by (dispensedBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pharmacy inventory (extends general inventory for pharmacy-specific needs)
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
    pharmacyInventoryId INT NOT NULL AUTO_INCREMENT,
    inventoryItemId INT, -- Link to general inventory_items
    medicationId INT, -- Link to medications catalog
    quantity INT DEFAULT 0,
    reorderLevel INT DEFAULT 0,
    location VARCHAR(100), -- Pharmacy location/section
    lastRestocked DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (pharmacyInventoryId),
    FOREIGN KEY (inventoryItemId) REFERENCES inventory_items(itemId) ON DELETE SET NULL,
    FOREIGN KEY (medicationId) REFERENCES medications(medicationId) ON DELETE SET NULL,
    INDEX idx_inventory_item (inventoryItemId),
    INDEX idx_medication (medicationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drug inventory (tracks individual batches/stocks with pricing and expiry)
CREATE TABLE IF NOT EXISTS drug_inventory (
    drugInventoryId INT NOT NULL AUTO_INCREMENT,
    medicationId INT NOT NULL, -- Foreign key to medications catalog
    batchNumber VARCHAR(100) NOT NULL, -- Batch/lot number
    quantity INT NOT NULL DEFAULT 0, -- Available quantity
    unitPrice DECIMAL(15, 2) NOT NULL, -- Cost price per unit
    manufactureDate DATE, -- Manufacture date
    expiryDate DATE NOT NULL, -- Expiry date
    minPrice DECIMAL(15, 2), -- Minimum selling price
    sellPrice DECIMAL(15, 2) NOT NULL, -- Selling price per unit
    location VARCHAR(100), -- Storage location in pharmacy
    notes TEXT, -- Additional notes
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (drugInventoryId),
    FOREIGN KEY (medicationId) REFERENCES medications(medicationId) ON DELETE RESTRICT,
    INDEX idx_medication (medicationId),
    INDEX idx_batch (batchNumber),
    INDEX idx_expiry (expiryDate),
    INDEX idx_medication_batch (medicationId, batchNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drug interactions (medication interactions)
CREATE TABLE IF NOT EXISTS drug_interactions (
    interactionId INT NOT NULL AUTO_INCREMENT,
    medication1Id INT NOT NULL,
    medication2Id INT NOT NULL,
    severity ENUM('mild', 'moderate', 'severe') NOT NULL,
    description TEXT,
    recommendation TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (interactionId),
    FOREIGN KEY (medication1Id) REFERENCES medications(medicationId) ON DELETE CASCADE,
    FOREIGN KEY (medication2Id) REFERENCES medications(medicationId) ON DELETE CASCADE,
    UNIQUE KEY unique_interaction (medication1Id, medication2Id),
    INDEX idx_medication1 (medication1Id),
    INDEX idx_medication2 (medication2Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

