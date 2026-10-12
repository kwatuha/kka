-- ============================================
-- FAMILY MEDICAL HISTORY
-- ============================================
-- This table stores family medical history for patients

CREATE TABLE IF NOT EXISTS patient_family_history (
    familyHistoryId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    relation VARCHAR(100) NOT NULL, -- e.g., 'Father', 'Mother', 'Paternal Grandfather'
    `condition` VARCHAR(500) NOT NULL, -- Medical condition
    ageAtDiagnosis INT, -- Age when condition was diagnosed
    status ENUM('Living', 'Deceased', 'Unknown') DEFAULT 'Unknown',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (familyHistoryId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_patient (patientId),
    INDEX idx_relation (relation),
    INDEX idx_condition (`condition`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

