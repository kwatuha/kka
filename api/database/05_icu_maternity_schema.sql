-- ============================================
-- ICU MODULE
-- ============================================

-- ICU beds (specialized beds with equipment)
CREATE TABLE IF NOT EXISTS icu_beds (
    icuBedId INT NOT NULL AUTO_INCREMENT,
    bedNumber VARCHAR(50) NOT NULL,
    bedType ENUM('standard', 'isolation', 'burns') DEFAULT 'standard',
    status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
    equipmentList TEXT, -- JSON or comma-separated list of equipment
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (icuBedId),
    UNIQUE KEY unique_icu_bed (bedNumber),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ICU admissions (extends general admissions)
CREATE TABLE IF NOT EXISTS icu_admissions (
    icuAdmissionId INT NOT NULL AUTO_INCREMENT,
    admissionId INT NOT NULL, -- Link to general admission
    icuBedId INT NOT NULL,
    admissionReason TEXT,
    initialCondition TEXT,
    status ENUM('critical', 'serious', 'stable', 'improving') DEFAULT 'critical',
    expectedDischargeDate DATE NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (icuAdmissionId),
    FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE CASCADE,
    FOREIGN KEY (icuBedId) REFERENCES icu_beds(icuBedId) ON DELETE RESTRICT,
    INDEX idx_admission (admissionId),
    INDEX idx_icu_bed (icuBedId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ICU monitoring (continuous vital signs tracking)
CREATE TABLE IF NOT EXISTS icu_monitoring (
    monitoringId INT NOT NULL AUTO_INCREMENT,
    icuAdmissionId INT NOT NULL,
    monitoringDateTime DATETIME NOT NULL,
    heartRate INT,
    systolicBP INT,
    diastolicBP INT,
    meanArterialPressure DECIMAL(5, 2),
    respiratoryRate INT,
    oxygenSaturation DECIMAL(5, 2),
    temperature DECIMAL(4, 2),
    glasgowComaScale INT, -- GCS score (3-15)
    centralVenousPressure DECIMAL(5, 2),
    urineOutput DECIMAL(8, 2), -- ml/hour
    ventilatorSettings TEXT, -- JSON or text
    medicationInfusions TEXT, -- JSON or text
    notes TEXT,
    recordedBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (monitoringId),
    FOREIGN KEY (icuAdmissionId) REFERENCES icu_admissions(icuAdmissionId) ON DELETE CASCADE,
    FOREIGN KEY (recordedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_icu_admission (icuAdmissionId),
    INDEX idx_monitoring_date (monitoringDateTime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ICU equipment tracking
CREATE TABLE IF NOT EXISTS icu_equipment (
    equipmentId INT NOT NULL AUTO_INCREMENT,
    equipmentName VARCHAR(200) NOT NULL,
    equipmentType VARCHAR(100), -- Ventilator, Monitor, Infusion Pump, etc.
    serialNumber VARCHAR(100),
    status ENUM('available', 'in_use', 'maintenance', 'retired') DEFAULT 'available',
    assignedToAdmissionId INT NULL, -- Currently assigned to which ICU admission
    lastMaintenanceDate DATE NULL,
    nextMaintenanceDate DATE NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (equipmentId),
    FOREIGN KEY (assignedToAdmissionId) REFERENCES icu_admissions(icuAdmissionId) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_assigned_to (assignedToAdmissionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MATERNITY MODULE
-- ============================================

-- Maternity admissions (extends general admissions)
CREATE TABLE IF NOT EXISTS maternity_admissions (
    maternityAdmissionId INT NOT NULL AUTO_INCREMENT,
    admissionId INT NOT NULL, -- Link to general admission
    gestationWeeks INT,
    expectedDeliveryDate DATE,
    pregnancyNumber INT, -- Which pregnancy (1st, 2nd, etc.)
    previousPregnancies INT,
    previousDeliveries INT,
    previousComplications TEXT,
    bloodGroup VARCHAR(10),
    rhesusFactor ENUM('positive', 'negative') NULL,
    status ENUM('admitted', 'in_labor', 'delivered', 'discharged') DEFAULT 'admitted',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (maternityAdmissionId),
    FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE CASCADE,
    INDEX idx_admission (admissionId),
    INDEX idx_expected_delivery (expectedDeliveryDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Antenatal visits
CREATE TABLE IF NOT EXISTS antenatal_visits (
    visitId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    visitDate DATE NOT NULL,
    gestationWeeks INT,
    weight DECIMAL(5, 2),
    bloodPressure VARCHAR(20),
    fundalHeight INT, -- in cm
    fetalHeartRate INT,
    presentation VARCHAR(100), -- Fetal presentation
    findings TEXT,
    nextAppointmentDate DATE NULL,
    seenBy INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (visitId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (seenBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_patient (patientId),
    INDEX idx_visit_date (visitDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
    deliveryId INT NOT NULL AUTO_INCREMENT,
    maternityAdmissionId INT NOT NULL,
    deliveryDate DATE NOT NULL,
    deliveryTime TIME NOT NULL,
    deliveryType ENUM('normal', 'caesarean', 'assisted', 'breech') DEFAULT 'normal',
    deliveryMode VARCHAR(100),
    complications TEXT,
    maternalOutcome ENUM('good', 'stable', 'complications') DEFAULT 'good',
    assistedBy INT, -- Doctor/midwife who delivered
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (deliveryId),
    FOREIGN KEY (maternityAdmissionId) REFERENCES maternity_admissions(maternityAdmissionId) ON DELETE RESTRICT,
    FOREIGN KEY (assistedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_maternity_admission (maternityAdmissionId),
    INDEX idx_delivery_date (deliveryDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Newborns
CREATE TABLE IF NOT EXISTS newborns (
    newbornId INT NOT NULL AUTO_INCREMENT,
    deliveryId INT NOT NULL,
    motherPatientId INT NOT NULL, -- Link to mother's patient record
    gender ENUM('Male', 'Female') NOT NULL,
    birthWeight DECIMAL(5, 2) NOT NULL, -- in kg
    birthLength DECIMAL(4, 1) NULL, -- in cm
    headCircumference DECIMAL(4, 1) NULL, -- in cm
    apgarScore1Min INT, -- Apgar at 1 minute (0-10)
    apgarScore5Min INT, -- Apgar at 5 minutes (0-10)
    healthStatus ENUM('healthy', 'needs_observation', 'needs_nicu', 'critical') DEFAULT 'healthy',
    feedingMethod VARCHAR(100),
    birthDefects TEXT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (newbornId),
    FOREIGN KEY (deliveryId) REFERENCES deliveries(deliveryId) ON DELETE RESTRICT,
    FOREIGN KEY (motherPatientId) REFERENCES patients(patientId) ON DELETE RESTRICT,
    INDEX idx_delivery (deliveryId),
    INDEX idx_mother (motherPatientId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Postnatal visits
CREATE TABLE IF NOT EXISTS postnatal_visits (
    visitId INT NOT NULL AUTO_INCREMENT,
    deliveryId INT NOT NULL,
    motherPatientId INT NOT NULL,
    visitDate DATE NOT NULL,
    visitType ENUM('day1', 'day3', 'day7', 'week6', 'other') DEFAULT 'other',
    maternalCondition TEXT,
    babyCondition TEXT, -- If baby visit
    breastfeedingStatus VARCHAR(100),
    findings TEXT,
    nextAppointmentDate DATE NULL,
    seenBy INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (visitId),
    FOREIGN KEY (deliveryId) REFERENCES deliveries(deliveryId) ON DELETE RESTRICT,
    FOREIGN KEY (motherPatientId) REFERENCES patients(patientId) ON DELETE RESTRICT,
    FOREIGN KEY (seenBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_delivery (deliveryId),
    INDEX idx_mother (motherPatientId),
    INDEX idx_visit_date (visitDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

