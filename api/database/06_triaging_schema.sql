-- ============================================
-- TRIAGING MODULE
-- ============================================

-- Triage assessments
CREATE TABLE IF NOT EXISTS triage_assessments (
    triageId INT NOT NULL AUTO_INCREMENT,
    triageNumber VARCHAR(50) UNIQUE NOT NULL,
    patientId INT NOT NULL,
    triageDate DATETIME NOT NULL,
    chiefComplaint TEXT NOT NULL,
    triageCategory ENUM('red', 'yellow', 'green', 'blue') NOT NULL, -- Red=Emergency, Yellow=Urgent, Green=Non-urgent, Blue=Deceased
    priorityLevel INT, -- 1-5 (1=highest priority)
    assignedToDoctorId INT NULL,
    assignedToDepartment VARCHAR(100) NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    triagedBy INT NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (triageId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (triagedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (assignedToDoctorId) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_triage_number (triageNumber),
    INDEX idx_patient (patientId),
    INDEX idx_triage_category (triageCategory),
    INDEX idx_status (status),
    INDEX idx_triage_date (triageDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vital signs (detailed tracking)
CREATE TABLE IF NOT EXISTS vital_signs (
    vitalSignId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    recordedDate DATETIME NOT NULL,
    systolicBP INT,
    diastolicBP INT,
    heartRate INT,
    respiratoryRate INT,
    temperature DECIMAL(4, 2), -- in Celsius
    oxygenSaturation DECIMAL(5, 2), -- SpO2 percentage
    painScore INT, -- 0-10 scale
    glasgowComaScale INT, -- GCS score (3-15)
    weight DECIMAL(5, 2), -- in kg
    height DECIMAL(4, 1), -- in cm
    bmi DECIMAL(4, 1), -- Body Mass Index
    bloodGlucose DECIMAL(5, 2) NULL, -- in mg/dL or mmol/L
    context ENUM('triage', 'consultation', 'admission', 'monitoring', 'other') DEFAULT 'consultation',
    triageId INT NULL, -- Link to triage if recorded during triage
    recordedBy INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (vitalSignId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (triageId) REFERENCES triage_assessments(triageId) ON DELETE SET NULL,
    FOREIGN KEY (recordedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_patient (patientId),
    INDEX idx_recorded_date (recordedDate),
    INDEX idx_triage (triageId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Critical vital sign ranges configuration
-- This table defines critical value ranges for vital signs
-- Values outside these ranges indicate life-threatening conditions requiring immediate medical attention
CREATE TABLE IF NOT EXISTS critical_vital_ranges (
    criticalVitalId INT NOT NULL AUTO_INCREMENT,
    vitalParameter VARCHAR(100) NOT NULL, -- e.g., "systolicBP", "diastolicBP", "heartRate", "temperature", "oxygenSaturation", "respiratoryRate", "glasgowComaScale"
    unit VARCHAR(50), -- e.g., "mmHg", "bpm", "°C", "%"
    criticalLowValue DECIMAL(10, 2) NULL, -- Critical if value is BELOW this
    criticalHighValue DECIMAL(10, 2) NULL, -- Critical if value is ABOVE this
    description TEXT, -- Description of why this range is critical
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (criticalVitalId),
    UNIQUE KEY unique_vital_parameter (vitalParameter),
    INDEX idx_parameter (vitalParameter),
    INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

