-- ============================================
-- MEDICAL RECORDS ENHANCEMENTS
-- ============================================

-- Diagnoses catalog (ICD-10 codes)
CREATE TABLE IF NOT EXISTS diagnoses (
    diagnosisId INT NOT NULL AUTO_INCREMENT,
    icd10Code VARCHAR(20) UNIQUE,
    diagnosisName VARCHAR(500) NOT NULL,
    category VARCHAR(200),
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (diagnosisId),
    INDEX idx_icd10_code (icd10Code),
    INDEX idx_diagnosis_name (diagnosisName),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient diagnoses (diagnosis assignments to patients)
CREATE TABLE IF NOT EXISTS patient_diagnoses (
    patientDiagnosisId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    diagnosisId INT,
    diagnosisCode VARCHAR(20), -- Store code in case diagnosis is deleted
    diagnosisName VARCHAR(500) NOT NULL,
    diagnosisDate DATE NOT NULL,
    diagnosisType ENUM('primary', 'secondary', 'differential', 'ruled_out') DEFAULT 'primary',
    status ENUM('active', 'resolved', 'chronic') DEFAULT 'active',
    diagnosedBy INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (patientDiagnosisId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (diagnosisId) REFERENCES diagnoses(diagnosisId) ON DELETE SET NULL,
    FOREIGN KEY (diagnosedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_patient (patientId),
    INDEX idx_diagnosis (diagnosisId),
    INDEX idx_diagnosis_date (diagnosisDate),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Procedures catalog
CREATE TABLE IF NOT EXISTS procedures (
    procedureId INT NOT NULL AUTO_INCREMENT,
    procedureCode VARCHAR(50) UNIQUE,
    procedureName VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    duration INT, -- Duration in minutes
    cost DECIMAL(15, 2),
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (procedureId),
    INDEX idx_procedure_code (procedureCode),
    INDEX idx_procedure_name (procedureName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient procedures (procedures performed on patients)
CREATE TABLE IF NOT EXISTS patient_procedures (
    patientProcedureId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    procedureId INT,
    procedureCode VARCHAR(50),
    procedureName VARCHAR(200) NOT NULL,
    procedureDate DATE NOT NULL,
    performedBy INT,
    notes TEXT,
    complications TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (patientProcedureId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (procedureId) REFERENCES procedures(procedureId) ON DELETE SET NULL,
    FOREIGN KEY (performedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_patient (patientId),
    INDEX idx_procedure (procedureId),
    INDEX idx_procedure_date (procedureDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient allergies (detailed allergy tracking)
CREATE TABLE IF NOT EXISTS patient_allergies (
    allergyId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    allergen VARCHAR(200) NOT NULL, -- Medication, food, substance, etc.
    allergyType ENUM('drug', 'food', 'environmental', 'other') DEFAULT 'drug',
    severity ENUM('mild', 'moderate', 'severe', 'life_threatening') DEFAULT 'moderate',
    reaction TEXT, -- Description of reaction
    firstObserved DATE,
    lastObserved DATE,
    status ENUM('active', 'resolved', 'unknown') DEFAULT 'active',
    notes TEXT,
    reportedBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (allergyId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (reportedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_patient (patientId),
    INDEX idx_allergen (allergen),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clinical notes (more structured clinical documentation)
CREATE TABLE IF NOT EXISTS clinical_notes (
    noteId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    noteDate DATE NOT NULL,
    noteType ENUM('consultation', 'progress', 'nursing', 'procedure', 'discharge', 'other') NOT NULL,
    chiefComplaint TEXT,
    historyOfPresentIllness TEXT,
    physicalExamination TEXT,
    assessment TEXT,
    plan TEXT,
    documentedBy INT NOT NULL,
    visitId INT NULL, -- Link to appointment or visit if applicable
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (noteId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (documentedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_patient (patientId),
    INDEX idx_note_date (noteDate),
    INDEX idx_note_type (noteType),
    INDEX idx_documented_by (documentedBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

