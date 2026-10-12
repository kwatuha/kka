-- ============================================
-- AMBULANCE MANAGEMENT MODULE
-- ============================================

-- Ambulance vehicles
CREATE TABLE IF NOT EXISTS ambulances (
    ambulanceId INT NOT NULL AUTO_INCREMENT,
    vehicleNumber VARCHAR(50) NOT NULL UNIQUE,
    vehicleType ENUM('basic', 'advanced', 'mobile_icu', 'standard') DEFAULT 'standard',
    driverName VARCHAR(200) NOT NULL,
    driverPhone VARCHAR(20),
    capacity INT DEFAULT 1, -- Number of patients that can be transported
    equipment TEXT, -- JSON or comma-separated list of equipment (e.g., Oxygen, Defibrillator, Stretcher)
    status ENUM('available', 'on_trip', 'maintenance', 'out_of_service') DEFAULT 'available',
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (ambulanceId),
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_vehicle_number (vehicleNumber),
    INDEX idx_status (status),
    INDEX idx_vehicle_type (vehicleType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ambulance trips/dispatches
CREATE TABLE IF NOT EXISTS ambulance_trips (
    tripId INT NOT NULL AUTO_INCREMENT,
    tripNumber VARCHAR(50) UNIQUE, -- Auto-generated trip number (e.g., TRIP-2024-001)
    ambulanceId INT NOT NULL,
    patientId INT NULL, -- Optional: link to patient if registered
    patientName VARCHAR(200) NOT NULL, -- Patient name (required even if not registered)
    patientPhone VARCHAR(20),
    patientAge INT,
    patientGender ENUM('male', 'female', 'other'),
    pickupLocation VARCHAR(500) NOT NULL,
    destination VARCHAR(500) NOT NULL,
    tripType ENUM('emergency', 'transfer', 'discharge', 'other') DEFAULT 'emergency',
    status ENUM('scheduled', 'dispatched', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    scheduledDateTime DATETIME,
    dispatchedDateTime DATETIME,
    pickupDateTime DATETIME,
    arrivalDateTime DATETIME,
    completedDateTime DATETIME,
    distance DECIMAL(10, 2), -- Distance in kilometers
    duration INT, -- Duration in minutes
    cost DECIMAL(15, 2), -- Trip cost
    paymentStatus ENUM('pending', 'paid', 'insurance', 'waived') DEFAULT 'pending',
    notes TEXT,
    medicalCondition TEXT, -- Brief description of patient condition
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    createdBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (tripId),
    FOREIGN KEY (ambulanceId) REFERENCES ambulances(ambulanceId) ON DELETE RESTRICT,
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE SET NULL,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_trip_number (tripNumber),
    INDEX idx_ambulance (ambulanceId),
    INDEX idx_patient (patientId),
    INDEX idx_status (status),
    INDEX idx_trip_type (tripType),
    INDEX idx_scheduled_date (scheduledDateTime),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ambulance trip logs (for tracking trip progress)
CREATE TABLE IF NOT EXISTS ambulance_trip_logs (
    logId INT NOT NULL AUTO_INCREMENT,
    tripId INT NOT NULL,
    logType ENUM('dispatched', 'en_route', 'arrived_pickup', 'patient_loaded', 'en_route_destination', 'arrived_destination', 'patient_unloaded', 'completed', 'cancelled') NOT NULL,
    logDateTime DATETIME NOT NULL,
    location VARCHAR(500), -- Current location when log was created
    notes TEXT,
    loggedBy INT, -- User who created the log
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (logId),
    FOREIGN KEY (tripId) REFERENCES ambulance_trips(tripId) ON DELETE CASCADE,
    FOREIGN KEY (loggedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_trip (tripId),
    INDEX idx_log_type (logType),
    INDEX idx_log_date (logDateTime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




