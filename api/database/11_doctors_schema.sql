-- ============================================
-- DOCTORS MODULE
-- ============================================

-- Doctor specializations
CREATE TABLE IF NOT EXISTS doctor_specializations (
    specializationId INT NOT NULL AUTO_INCREMENT,
    specializationCode VARCHAR(50) UNIQUE,
    specializationName VARCHAR(200) NOT NULL,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (specializationId),
    INDEX idx_specialization_code (specializationCode),
    INDEX idx_specialization_name (specializationName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Doctor specialization assignments (many-to-many)
CREATE TABLE IF NOT EXISTS doctor_specialization_assignments (
    assignmentId INT NOT NULL AUTO_INCREMENT,
    doctorId INT NOT NULL, -- User ID of doctor
    specializationId INT NOT NULL,
    assignedDate DATE NOT NULL,
    isPrimary BOOLEAN DEFAULT FALSE, -- Primary specialization
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (assignmentId),
    FOREIGN KEY (doctorId) REFERENCES users(userId) ON DELETE CASCADE,
    FOREIGN KEY (specializationId) REFERENCES doctor_specializations(specializationId) ON DELETE CASCADE,
    UNIQUE KEY unique_doctor_specialization (doctorId, specializationId),
    INDEX idx_doctor (doctorId),
    INDEX idx_specialization (specializationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Doctor schedules
CREATE TABLE IF NOT EXISTS doctor_schedules (
    scheduleId INT NOT NULL AUTO_INCREMENT,
    doctorId INT NOT NULL,
    dayOfWeek INT NOT NULL, -- 1=Monday, 2=Tuesday, ..., 7=Sunday
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    location VARCHAR(200), -- Clinic, ward, department
    isAvailable BOOLEAN DEFAULT TRUE,
    effectiveFrom DATE NOT NULL,
    effectiveTo DATE NULL, -- NULL = ongoing
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (scheduleId),
    FOREIGN KEY (doctorId) REFERENCES users(userId) ON DELETE CASCADE,
    INDEX idx_doctor (doctorId),
    INDEX idx_day_of_week (dayOfWeek),
    INDEX idx_effective_dates (effectiveFrom, effectiveTo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Doctor availability (specific date/time availability)
CREATE TABLE IF NOT EXISTS doctor_availability (
    availabilityId INT NOT NULL AUTO_INCREMENT,
    doctorId INT NOT NULL,
    availableDate DATE NOT NULL,
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    status ENUM('available', 'booked', 'unavailable', 'on_leave') DEFAULT 'available',
    reason VARCHAR(200), -- If unavailable or on leave
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (availabilityId),
    FOREIGN KEY (doctorId) REFERENCES users(userId) ON DELETE CASCADE,
    INDEX idx_doctor (doctorId),
    INDEX idx_available_date (availableDate),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

