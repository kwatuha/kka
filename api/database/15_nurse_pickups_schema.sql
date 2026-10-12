-- ============================================
-- NURSE DRUG PICKUP TRACKING
-- ============================================

-- Nurse pickups table - tracks when nurses pick up drugs for admitted patients
CREATE TABLE IF NOT EXISTS nurse_pickups (
    pickupId INT NOT NULL AUTO_INCREMENT,
    prescriptionId INT NOT NULL,
    patientId INT NOT NULL,
    admissionId INT, -- Link to inpatient admission
    pickedUpBy INT NOT NULL, -- Nurse who requested / picked up the drugs
    recordedPickupBy INT NULL, -- Pharmacist who recorded the pickup (when status = picked_up)
    pickupDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'ready_for_pickup', 'picked_up', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (pickupId),
    FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE RESTRICT,
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE RESTRICT,
    FOREIGN KEY (admissionId) REFERENCES admissions(admissionId) ON DELETE SET NULL,
    FOREIGN KEY (pickedUpBy) REFERENCES users(userId) ON DELETE RESTRICT,
    FOREIGN KEY (recordedPickupBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_prescription (prescriptionId),
    INDEX idx_patient (patientId),
    INDEX idx_admission (admissionId),
    INDEX idx_picked_up_by (pickedUpBy),
    INDEX idx_pickup_date (pickupDate),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nurse pickup items - tracks individual prescription items picked up
CREATE TABLE IF NOT EXISTS nurse_pickup_items (
    pickupItemId INT NOT NULL AUTO_INCREMENT,
    pickupId INT NOT NULL,
    prescriptionItemId INT NOT NULL,
    dispensationId INT, -- Link to dispensation record
    quantityPickedUp INT NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pickupItemId),
    FOREIGN KEY (pickupId) REFERENCES nurse_pickups(pickupId) ON DELETE CASCADE,
    FOREIGN KEY (prescriptionItemId) REFERENCES prescription_items(itemId) ON DELETE RESTRICT,
    FOREIGN KEY (dispensationId) REFERENCES dispensations(dispensationId) ON DELETE SET NULL,
    INDEX idx_pickup (pickupId),
    INDEX idx_prescription_item (prescriptionItemId),
    INDEX idx_dispensation (dispensationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
