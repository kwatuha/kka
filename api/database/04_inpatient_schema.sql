-- ============================================
-- INPATIENT MODULE
-- ============================================

-- Wards
CREATE TABLE IF NOT EXISTS wards (
    wardId INT NOT NULL AUTO_INCREMENT,
    wardCode VARCHAR(50) UNIQUE,
    wardName VARCHAR(200) NOT NULL,
    wardType VARCHAR(100), -- General, Surgical, Medical, Maternity, Pediatric, etc.
    capacity INT NOT NULL,
    location VARCHAR(200),
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (wardId),
    INDEX idx_ward_code (wardCode),
    INDEX idx_ward_type (wardType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Beds
CREATE TABLE IF NOT EXISTS beds (
    bedId INT NOT NULL AUTO_INCREMENT,
    bedNumber VARCHAR(50) NOT NULL,
    wardId INT NOT NULL,
    bedType ENUM('general', 'private', 'semi_private', 'isolation') DEFAULT 'general',
    status ENUM('available', 'occupied', 'maintenance', 'reserved') DEFAULT 'available',
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (bedId),
    FOREIGN KEY (wardId) REFERENCES wards(wardId) ON DELETE RESTRICT,
    UNIQUE KEY unique_bed (wardId, bedNumber),
    INDEX idx_ward (wardId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admissions
CREATE TABLE IF NOT EXISTS admissions (
    admissionId INT NOT NULL AUTO_INCREMENT,
    admissionNumber VARCHAR(50) UNIQUE NOT NULL,
    patientId INT NOT NULL,
    bedId INT NOT NULL,
    admissionDate DATETIME NOT NULL,
    admittingDoctorId INT NOT NULL,
    admissionDiagnosis TEXT,
    admissionReason TEXT,
    expectedDischargeDate DATE NULL,
    status ENUM('admitted', 'discharged', 'transferred', 'cancelled') DEFAULT 'admitted',
    dischargeDate DATETIME NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (admissionId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (bedId) REFERENCES beds(bedId) ON DELETE RESTRICT,
    FOREIGN KEY (admittingDoctorId) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_admission_number (admissionNumber),
    INDEX idx_patient (patientId),
    INDEX idx_bed (bedId),
    INDEX idx_status (status),
    INDEX idx_admission_date (admissionDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admission diagnoses
CREATE TABLE IF NOT EXISTS admission_diagnoses (
    diagnosisId INT NOT NULL AUTO_INCREMENT,
    admissionId INT NOT NULL,
    diagnosisCode VARCHAR(50), -- ICD-10 code
    diagnosisDescription TEXT NOT NULL,
    diagnosisType ENUM('primary', 'secondary', 'complication') DEFAULT 'primary',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (diagnosisId),
    FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE CASCADE,
    INDEX idx_admission (admissionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Discharges
CREATE TABLE IF NOT EXISTS discharges (
    dischargeId INT NOT NULL AUTO_INCREMENT,
    admissionId INT NOT NULL,
    dischargeDate DATETIME NOT NULL,
    dischargeType ENUM('routine', 'against_medical_advice', 'transfer', 'death', 'absconded') DEFAULT 'routine',
    dischargeDiagnosis TEXT,
    dischargeSummary TEXT,
    conditionOnDischarge ENUM('recovered', 'improved', 'same', 'worsened', 'died') DEFAULT 'improved',
    followUpInstructions TEXT,
    followUpDate DATE NULL,
    dischargingDoctorId INT NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (dischargeId),
    FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE RESTRICT,
    FOREIGN KEY (dischargingDoctorId) REFERENCES users(userId) ON DELETE RESTRICT,
    UNIQUE KEY unique_discharge (admissionId),
    INDEX idx_admission (admissionId),
    INDEX idx_discharge_date (dischargeDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ward transfers
CREATE TABLE IF NOT EXISTS ward_transfers (
    transferId INT NOT NULL AUTO_INCREMENT,
    admissionId INT NOT NULL,
    fromWardId INT NOT NULL,
    toWardId INT NOT NULL,
    fromBedId INT NOT NULL,
    toBedId INT NOT NULL,
    transferDate DATETIME NOT NULL,
    transferReason TEXT,
    transferredBy INT NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transferId),
    FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE CASCADE,
    FOREIGN KEY (fromWardId) REFERENCES wards(wardId) ON DELETE RESTRICT,
    FOREIGN KEY (toWardId) REFERENCES wards(wardId) ON DELETE RESTRICT,
    FOREIGN KEY (fromBedId) REFERENCES beds(bedId) ON DELETE RESTRICT,
    FOREIGN KEY (toBedId) REFERENCES beds(bedId) ON DELETE RESTRICT,
    FOREIGN KEY (transferredBy) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_admission (admissionId),
    INDEX idx_transfer_date (transferDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

