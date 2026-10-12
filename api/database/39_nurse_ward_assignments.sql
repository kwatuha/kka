-- ============================================
-- NURSE ↔ WARD ASSIGNMENTS
-- ============================================
-- Allows restricting nurse drug pickup requests to patients in the nurse's assigned wards.

CREATE TABLE IF NOT EXISTS nurse_ward_assignments (
    assignmentId INT NOT NULL AUTO_INCREMENT,
    nurseUserId INT NOT NULL,
    wardId INT NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (assignmentId),
    UNIQUE KEY uniq_nurse_ward (nurseUserId, wardId),
    FOREIGN KEY (nurseUserId) REFERENCES users(userId) ON DELETE CASCADE,
    FOREIGN KEY (wardId) REFERENCES wards(wardId) ON DELETE CASCADE,
    INDEX idx_nurse (nurseUserId),
    INDEX idx_ward (wardId),
    INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

