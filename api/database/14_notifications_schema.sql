-- ============================================
-- NOTIFICATIONS MODULE
-- ============================================

-- Notifications for missing drugs in inventory
CREATE TABLE IF NOT EXISTS drug_notifications (
    notificationId INT NOT NULL AUTO_INCREMENT,
    medicationId INT NOT NULL,
    medicationName VARCHAR(200) NOT NULL,
    prescriptionId INT,
    prescriptionItemId INT,
    doctorId INT,
    doctorName VARCHAR(200),
    patientId INT,
    patientName VARCHAR(200),
    status ENUM('pending', 'acknowledged', 'resolved') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    message TEXT,
    acknowledgedBy INT,
    acknowledgedAt TIMESTAMP NULL,
    resolvedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (notificationId),
    FOREIGN KEY (medicationId) REFERENCES medications(medicationId) ON DELETE RESTRICT,
    FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE SET NULL,
    FOREIGN KEY (prescriptionItemId) REFERENCES prescription_items(itemId) ON DELETE SET NULL,
    FOREIGN KEY (doctorId) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE SET NULL,
    FOREIGN KEY (acknowledgedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_medication (medicationId),
    INDEX idx_prescription (prescriptionId),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;








