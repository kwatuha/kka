-- ============================================
-- BILL WAIVER SCHEMA
-- ============================================
-- This schema supports comprehensive bill waiver management
-- with different waiver types, partial/full waivers, and audit trails

-- Waiver Types Configuration Table
CREATE TABLE IF NOT EXISTS waiver_types (
    waiverTypeId INT NOT NULL AUTO_INCREMENT,
    typeCode VARCHAR(50) UNIQUE NOT NULL,
    typeName VARCHAR(200) NOT NULL,
    description TEXT,
    responsibility ENUM('staff', 'hospital', 'external') DEFAULT 'hospital',
    requiresApproval BOOLEAN DEFAULT TRUE,
    maxAmount DECIMAL(15, 2),
    maxPercentage DECIMAL(5, 2),
    requiresReason BOOLEAN DEFAULT TRUE,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (waiverTypeId),
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_type_code (typeCode),
    INDEX idx_responsibility (responsibility),
    INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bill Waivers Table
CREATE TABLE IF NOT EXISTS bill_waivers (
    waiverId INT NOT NULL AUTO_INCREMENT,
    waiverNumber VARCHAR(50) UNIQUE NOT NULL,
    invoiceId INT NOT NULL,
    patientId INT NOT NULL,
    waiverTypeId INT NOT NULL,
    waiverTypeCode VARCHAR(50) NOT NULL,
    waiverTypeName VARCHAR(200) NOT NULL,
    responsibility ENUM('staff', 'hospital', 'external') NOT NULL,

    -- Amount details
    originalAmount DECIMAL(15, 2) NOT NULL,
    waivedAmount DECIMAL(15, 2) NOT NULL,
    remainingAmount DECIMAL(15, 2) NOT NULL,
    waiverPercentage DECIMAL(5, 2),
    isFullWaiver BOOLEAN DEFAULT FALSE,

    -- Waiver details
    reason TEXT NOT NULL,
    justification TEXT,
    supportingDocuments TEXT, -- JSON array of document paths/URLs

    -- Approval workflow
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    requestedBy INT NOT NULL,
    requestedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approvedBy INT,
    approvedAt TIMESTAMP NULL,
    rejectedBy INT,
    rejectedAt TIMESTAMP NULL,
    rejectionReason TEXT,

    -- Staff responsibility tracking (if responsibility = 'staff')
    responsibleStaffId INT,
    paymentStatus ENUM('pending', 'partial', 'paid', 'written_off') DEFAULT 'pending',
    paymentDueDate DATE,
    paymentAmount DECIMAL(15, 2),
    paymentNotes TEXT,

    -- External responsibility tracking (if responsibility = 'external')
    externalPartyName VARCHAR(200),
    externalPartyContact VARCHAR(200),
    externalPartyNotes TEXT,

    -- Audit fields
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,

    PRIMARY KEY (waiverId),
    FOREIGN KEY (invoiceId) REFERENCES invoices(invoiceId) ON DELETE RESTRICT,
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE RESTRICT,
    FOREIGN KEY (waiverTypeId) REFERENCES waiver_types(waiverTypeId) ON DELETE RESTRICT,
    FOREIGN KEY (requestedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (approvedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (rejectedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (responsibleStaffId) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,

    INDEX idx_waiver_number (waiverNumber),
    INDEX idx_invoice (invoiceId),
    INDEX idx_patient (patientId),
    INDEX idx_waiver_type (waiverTypeId),
    INDEX idx_status (status),
    INDEX idx_responsibility_type (responsibility),
    INDEX idx_requested_by (requestedBy),
    INDEX idx_approved_by (approvedBy),
    INDEX idx_requested_at (requestedAt),
    INDEX idx_responsible_staff (responsibleStaffId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Waiver Approval History (for audit trail)
CREATE TABLE IF NOT EXISTS waiver_approval_history (
    historyId INT NOT NULL AUTO_INCREMENT,
    waiverId INT NOT NULL,
    action ENUM('requested', 'approved', 'rejected', 'cancelled', 'modified', 'payment_recorded', 'payment_completed') NOT NULL,
    performedBy INT NOT NULL,
    performedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    previousStatus VARCHAR(50),
    newStatus VARCHAR(50),
    notes TEXT,
    changes JSON, -- Store JSON of what changed

    PRIMARY KEY (historyId),
    FOREIGN KEY (waiverId) REFERENCES bill_waivers(waiverId) ON DELETE CASCADE,
    FOREIGN KEY (performedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_waiver (waiverId),
    INDEX idx_action (action),
    INDEX idx_performed_at (performedAt),
    INDEX idx_performed_by (performedBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Staff Payment Tracking (for staff-responsible waivers)
CREATE TABLE IF NOT EXISTS waiver_staff_payments (
    paymentId INT NOT NULL AUTO_INCREMENT,
    waiverId INT NOT NULL,
    staffId INT NOT NULL,
    paymentAmount DECIMAL(15, 2) NOT NULL,
    paymentDate DATE NOT NULL,
    paymentMethod VARCHAR(50),
    paymentReference VARCHAR(100),
    receiptNumber VARCHAR(100),
    notes TEXT,
    recordedBy INT NOT NULL,
    recordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (paymentId),
    FOREIGN KEY (waiverId) REFERENCES bill_waivers(waiverId) ON DELETE CASCADE,
    FOREIGN KEY (staffId) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (recordedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_waiver (waiverId),
    INDEX idx_staff (staffId),
    INDEX idx_payment_date (paymentDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



