-- Nurse shift assignments: which shift (morning/evening/night) each nurse is currently on
CREATE TABLE IF NOT EXISTS nurse_shift_assignments (
    assignmentId INT NOT NULL AUTO_INCREMENT,
    nurseUserId INT NOT NULL,
    shiftType ENUM('morning', 'evening', 'night') NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (assignmentId),
    UNIQUE KEY uniq_nurse_shift (nurseUserId),
    FOREIGN KEY (nurseUserId) REFERENCES users(userId) ON DELETE CASCADE,
    INDEX idx_shift (shiftType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
