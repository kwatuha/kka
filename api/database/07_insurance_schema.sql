-- ============================================
-- INSURANCE MODULE
-- ============================================

-- Insurance providers
CREATE TABLE IF NOT EXISTS insurance_providers (
    providerId INT NOT NULL AUTO_INCREMENT,
    providerCode VARCHAR(50) UNIQUE,
    providerName VARCHAR(200) NOT NULL,
    contactPerson VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    claimsAddress TEXT,
    website VARCHAR(200),
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (providerId),
    INDEX idx_provider_code (providerCode),
    INDEX idx_provider_name (providerName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insurance packages/plans
CREATE TABLE IF NOT EXISTS insurance_packages (
    packageId INT NOT NULL AUTO_INCREMENT,
    providerId INT NOT NULL,
    packageCode VARCHAR(50),
    packageName VARCHAR(200) NOT NULL,
    coverageType ENUM('inpatient', 'outpatient', 'both') DEFAULT 'both',
    coverageLimit DECIMAL(15, 2) NULL, -- NULL = unlimited
    coPayPercentage DECIMAL(5, 2) DEFAULT 0, -- Co-pay percentage
    coPayAmount DECIMAL(10, 2) DEFAULT 0, -- Fixed co-pay amount
    isActive BOOLEAN DEFAULT TRUE,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (packageId),
    FOREIGN KEY (providerId) REFERENCES insurance_providers(providerId) ON DELETE RESTRICT,
    INDEX idx_provider (providerId),
    INDEX idx_package_code (packageCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient insurance coverage
CREATE TABLE IF NOT EXISTS patient_insurance (
    patientInsuranceId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    providerId INT NOT NULL,
    packageId INT,
    policyNumber VARCHAR(100) NOT NULL,
    memberId VARCHAR(100),
    memberName VARCHAR(200), -- Name on insurance card (may differ from patient)
    relationship ENUM('self', 'spouse', 'child', 'parent', 'other') DEFAULT 'self',
    coverageStartDate DATE NOT NULL,
    coverageEndDate DATE NULL, -- NULL = active/ongoing
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (patientInsuranceId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (providerId) REFERENCES insurance_providers(providerId) ON DELETE RESTRICT,
    FOREIGN KEY (packageId) REFERENCES insurance_packages(packageId) ON DELETE SET NULL,
    INDEX idx_patient (patientId),
    INDEX idx_policy_number (policyNumber),
    INDEX idx_member_id (memberId),
    INDEX idx_is_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insurance authorizations (pre-authorizations)
CREATE TABLE IF NOT EXISTS insurance_authorizations (
    authorizationId INT NOT NULL AUTO_INCREMENT,
    patientInsuranceId INT NOT NULL,
    authorizationNumber VARCHAR(100) NOT NULL UNIQUE,
    requestedDate DATE NOT NULL,
    authorizedDate DATE NULL,
    validFrom DATE NULL,
    validTo DATE NULL,
    authorizedAmount DECIMAL(15, 2) NULL,
    purpose TEXT,
    status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
    rejectedReason TEXT,
    requestedBy INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (authorizationId),
    FOREIGN KEY (patientInsuranceId) REFERENCES patient_insurance(patientInsuranceId) ON DELETE RESTRICT,
    FOREIGN KEY (requestedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_authorization_number (authorizationNumber),
    INDEX idx_patient_insurance (patientInsuranceId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
    claimId INT NOT NULL AUTO_INCREMENT,
    claimNumber VARCHAR(50) UNIQUE NOT NULL,
    invoiceId INT NOT NULL,
    patientInsuranceId INT NOT NULL,
    authorizationId INT NULL,
    claimDate DATE NOT NULL,
    claimAmount DECIMAL(15, 2) NOT NULL,
    approvedAmount DECIMAL(15, 2) NULL,
    rejectedAmount DECIMAL(15, 2) NULL,
    status ENUM('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'paid') DEFAULT 'draft',
    submissionDate DATE NULL,
    responseDate DATE NULL,
    rejectionReason TEXT,
    paymentDate DATE NULL,
    paymentReference VARCHAR(100),
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (claimId),
    FOREIGN KEY (invoiceId) REFERENCES invoices(invoiceId) ON DELETE RESTRICT,
    FOREIGN KEY (patientInsuranceId) REFERENCES patient_insurance(patientInsuranceId) ON DELETE RESTRICT,
    FOREIGN KEY (authorizationId) REFERENCES insurance_authorizations(authorizationId) ON DELETE SET NULL,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_claim_number (claimNumber),
    INDEX idx_invoice (invoiceId),
    INDEX idx_patient_insurance (patientInsuranceId),
    INDEX idx_status (status),
    INDEX idx_claim_date (claimDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

