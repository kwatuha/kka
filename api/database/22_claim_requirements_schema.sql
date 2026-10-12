-- ============================================
-- CLAIM REQUIREMENTS/CHECKLIST SYSTEM
-- ============================================
-- This schema supports provider-specific claim requirements
-- For example, SHA may have specific checklists that must be completed before submission

-- Claim requirement templates (provider-specific checklists)
CREATE TABLE IF NOT EXISTS claim_requirement_templates (
    templateId INT NOT NULL AUTO_INCREMENT,
    providerId INT NULL, -- NULL means it applies to all providers, specific ID means provider-specific
    templateName VARCHAR(200) NOT NULL,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    isRequired BOOLEAN DEFAULT TRUE, -- Whether this template is mandatory for claims
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (templateId),
    FOREIGN KEY (providerId) REFERENCES insurance_providers(providerId) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_provider (providerId),
    INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual requirements within a template
CREATE TABLE IF NOT EXISTS claim_requirements (
    requirementId INT NOT NULL AUTO_INCREMENT,
    templateId INT NOT NULL,
    requirementCode VARCHAR(50), -- Unique code for the requirement (e.g., 'SHA-001', 'SHA-002')
    requirementName VARCHAR(200) NOT NULL,
    description TEXT,
    requirementType ENUM('document', 'information', 'verification', 'authorization', 'other') DEFAULT 'document',
    isRequired BOOLEAN DEFAULT TRUE,
    validationRule TEXT, -- JSON or text describing validation rules
    displayOrder INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (requirementId),
    FOREIGN KEY (templateId) REFERENCES claim_requirement_templates(templateId) ON DELETE CASCADE,
    INDEX idx_template (templateId),
    INDEX idx_code (requirementCode),
    INDEX idx_active (isActive),
    INDEX idx_order (displayOrder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Claim requirement completion tracking
CREATE TABLE IF NOT EXISTS claim_requirement_completions (
    completionId INT NOT NULL AUTO_INCREMENT,
    claimId INT NOT NULL,
    requirementId INT NOT NULL,
    isCompleted BOOLEAN DEFAULT FALSE,
    completionDate DATETIME NULL,
    completedBy INT NULL,
    documentPath VARCHAR(500) NULL, -- Path to uploaded document if applicable
    documentName VARCHAR(200) NULL,
    notes TEXT,
    verificationStatus ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verifiedBy INT NULL,
    verifiedDate DATETIME NULL,
    verificationNotes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (completionId),
    FOREIGN KEY (claimId) REFERENCES insurance_claims(claimId) ON DELETE CASCADE,
    FOREIGN KEY (requirementId) REFERENCES claim_requirements(requirementId) ON DELETE CASCADE,
    FOREIGN KEY (completedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (verifiedBy) REFERENCES users(userId) ON DELETE SET NULL,
    UNIQUE KEY unique_claim_requirement (claimId, requirementId),
    INDEX idx_claim (claimId),
    INDEX idx_requirement (requirementId),
    INDEX idx_completed (isCompleted),
    INDEX idx_verification (verificationStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add a column to insurance_claims to track if all requirements are met
ALTER TABLE insurance_claims
ADD COLUMN requirementsMet BOOLEAN DEFAULT FALSE
AFTER status;

-- Add index for requirements check
ALTER TABLE insurance_claims
ADD INDEX idx_requirements_met (requirementsMet);










