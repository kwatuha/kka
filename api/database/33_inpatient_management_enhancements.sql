-- ============================================
-- INPATIENT MANAGEMENT ENHANCEMENTS
-- ============================================
-- This script adds tables for comprehensive inpatient management:
-- - Doctor reviews/rounds
-- - Nursing care notes
-- - Vitals scheduling and tracking
-- - Links procedures and labs to admissions

-- Doctor Reviews/Rounds
-- Tracks daily doctor reviews and rounds for inpatients
CREATE TABLE IF NOT EXISTS inpatient_doctor_reviews (
    reviewId INT NOT NULL AUTO_INCREMENT,
    admissionId INT NOT NULL,
    reviewDate DATETIME NOT NULL,
    reviewingDoctorId INT NOT NULL,
    reviewType ENUM('morning_round', 'evening_round', 'consultation', 'emergency', 'follow_up') DEFAULT 'morning_round',
    subjective TEXT, -- Patient complaints, history since last review
    objective TEXT, -- Physical examination findings
    assessment TEXT, -- Clinical assessment, diagnosis updates
    plan TEXT, -- Treatment plan, medications, investigations, procedures
    notes TEXT,
    nextReviewDate DATETIME NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (reviewId),
    FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE CASCADE,
    FOREIGN KEY (reviewingDoctorId) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_admission (admissionId),
    INDEX idx_review_date (reviewDate),
    INDEX idx_doctor (reviewingDoctorId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nursing Care Notes
-- Tracks nursing care, observations, and interventions
CREATE TABLE IF NOT EXISTS inpatient_nursing_care (
    careId INT NOT NULL AUTO_INCREMENT,
    admissionId INT NOT NULL,
    careDate DATETIME NOT NULL,
    nurseId INT NOT NULL,
    careType ENUM('assessment', 'medication', 'procedure', 'observation', 'education', 'other') DEFAULT 'observation',
    shift ENUM('morning', 'afternoon', 'night') DEFAULT 'morning',
    vitalSignsRecorded BOOLEAN DEFAULT FALSE,
    observations TEXT, -- General observations, patient condition
    interventions TEXT, -- Nursing interventions performed
    patientResponse TEXT, -- Patient's response to care
    concerns TEXT, -- Any concerns or issues noted
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (careId),
    FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE CASCADE,
    FOREIGN KEY (nurseId) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_admission (admissionId),
    INDEX idx_care_date (careDate),
    INDEX idx_nurse (nurseId),
    INDEX idx_shift (shift)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inpatient Vitals Schedule
-- Tracks scheduled vital sign recordings for inpatients (typically 4x daily)
CREATE TABLE IF NOT EXISTS inpatient_vitals_schedule (
    scheduleId INT NOT NULL AUTO_INCREMENT,
    admissionId INT NOT NULL,
    scheduleDate DATE NOT NULL,
    scheduledTime1 TIME DEFAULT '06:00:00', -- Morning (6 AM)
    scheduledTime2 TIME DEFAULT '12:00:00', -- Noon (12 PM)
    scheduledTime3 TIME DEFAULT '18:00:00', -- Evening (6 PM)
    scheduledTime4 TIME DEFAULT '00:00:00', -- Night (12 AM)
    frequency ENUM('2x', '3x', '4x', '6x', 'continuous') DEFAULT '4x',
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (scheduleId),
    FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE CASCADE,
    UNIQUE KEY unique_admission_date (admissionId, scheduleDate),
    INDEX idx_admission (admissionId),
    INDEX idx_schedule_date (scheduleDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link vital signs to admissions
-- Add admissionId to vital_signs table to link vitals to inpatient admissions
ALTER TABLE vital_signs
ADD COLUMN admissionId INT NULL AFTER triageId,
ADD FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE SET NULL,
ADD INDEX idx_admission (admissionId);

-- Link patient procedures to admissions
-- Add admissionId to patient_procedures table
ALTER TABLE patient_procedures
ADD COLUMN admissionId INT NULL AFTER patientId,
ADD FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE SET NULL,
ADD INDEX idx_admission (admissionId);

-- Link lab test orders to admissions
-- Add admissionId to lab_test_orders table
ALTER TABLE lab_test_orders
ADD COLUMN admissionId INT NULL AFTER patientId,
ADD FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE SET NULL,
ADD INDEX idx_admission (admissionId);

-- Link radiology orders to admissions
-- Add admissionId to radiology_exam_orders table
ALTER TABLE radiology_exam_orders
ADD COLUMN admissionId INT NULL AFTER patientId,
ADD FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE SET NULL,
ADD INDEX idx_admission (admissionId);

-- Link prescriptions to admissions
-- Add admissionId to prescriptions table
ALTER TABLE prescriptions
ADD COLUMN admissionId INT NULL AFTER patientId,
ADD FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE SET NULL,
ADD INDEX idx_admission (admissionId);

-- Link medical records to admissions
-- Add admissionId to medical_records table
ALTER TABLE medical_records
ADD COLUMN admissionId INT NULL AFTER patientId,
ADD FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE SET NULL,
ADD INDEX idx_admission (admissionId);

