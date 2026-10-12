-- ============================================
-- RADIOLOGY MODULE
-- ============================================

-- Radiology exam types (catalog of imaging types)
CREATE TABLE IF NOT EXISTS radiology_exam_types (
    examTypeId INT NOT NULL AUTO_INCREMENT,
    examCode VARCHAR(50) UNIQUE,
    examName VARCHAR(200) NOT NULL,
    category VARCHAR(100), -- X-Ray, CT, MRI, Ultrasound, Mammography, etc.
    description TEXT,
    duration VARCHAR(50), -- e.g., "15 min", "30 min"
    cost DECIMAL(15, 2),
    preparationInstructions TEXT,
    contraindications TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (examTypeId),
    INDEX idx_exam_code (examCode),
    INDEX idx_category (category),
    INDEX idx_name (examName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Radiology exam orders (imaging requests)
CREATE TABLE IF NOT EXISTS radiology_exam_orders (
    orderId INT NOT NULL AUTO_INCREMENT,
    orderNumber VARCHAR(50) UNIQUE NOT NULL,
    patientId INT NOT NULL,
    orderedBy INT NOT NULL, -- Doctor who ordered
    orderDate DATE NOT NULL,
    examTypeId INT NOT NULL,
    bodyPart VARCHAR(200), -- e.g., "Chest", "Abdomen", "Head"
    clinicalIndication TEXT,
    priority ENUM('routine', 'urgent', 'stat') DEFAULT 'routine',
    status ENUM('awaiting_payment', 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    scheduledDate DATETIME NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (orderId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (orderedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (examTypeId) REFERENCES radiology_exam_types(examTypeId) ON DELETE RESTRICT,
    INDEX idx_order_number (orderNumber),
    INDEX idx_patient (patientId),
    INDEX idx_exam_type (examTypeId),
    INDEX idx_status (status),
    INDEX idx_order_date (orderDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Radiology exams (performed examinations)
CREATE TABLE IF NOT EXISTS radiology_exams (
    examId INT NOT NULL AUTO_INCREMENT,
    orderId INT NOT NULL,
    examDate DATETIME NOT NULL,
    performedBy INT, -- Radiologist/Technician
    technicianId INT, -- Technician who performed the exam
    equipmentUsed VARCHAR(200),
    contrastUsed BOOLEAN DEFAULT FALSE,
    contrastType VARCHAR(100) NULL,
    status ENUM('in_progress', 'completed', 'cancelled') DEFAULT 'in_progress',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (examId),
    FOREIGN KEY (orderId) REFERENCES radiology_exam_orders(orderId) ON DELETE RESTRICT,
    FOREIGN KEY (performedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (technicianId) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_order (orderId),
    INDEX idx_exam_date (examDate),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Radiology images (file references)
CREATE TABLE IF NOT EXISTS radiology_images (
    imageId INT NOT NULL AUTO_INCREMENT,
    examId INT NOT NULL,
    imageFileName VARCHAR(500) NOT NULL,
    imagePath VARCHAR(1000) NOT NULL,
    imageType VARCHAR(50), -- DICOM, JPEG, PNG
    seriesNumber INT,
    imageNumber INT,
    description TEXT,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploadedBy INT,
    PRIMARY KEY (imageId),
    FOREIGN KEY (examId) REFERENCES radiology_exams(examId) ON DELETE CASCADE,
    FOREIGN KEY (uploadedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_exam (examId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Radiology reports
CREATE TABLE IF NOT EXISTS radiology_reports (
    reportId INT NOT NULL AUTO_INCREMENT,
    examId INT NOT NULL,
    reportDate DATE NOT NULL,
    findings TEXT,
    impression TEXT, -- Radiologist's impression/diagnosis
    recommendations TEXT,
    reportedBy INT NOT NULL, -- Radiologist
    verifiedBy INT, -- Senior radiologist (if applicable)
    verifiedAt DATETIME NULL,
    status ENUM('draft', 'final', 'amended', 'cancelled') DEFAULT 'draft',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (reportId),
    FOREIGN KEY (examId) REFERENCES radiology_exams(examId) ON DELETE RESTRICT,
    FOREIGN KEY (reportedBy) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (verifiedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_exam (examId),
    INDEX idx_report_date (reportDate),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

