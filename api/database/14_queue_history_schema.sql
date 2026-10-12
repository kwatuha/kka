-- ============================================
-- QUEUE HISTORY AND ARCHIVING
-- ============================================
-- This table stores completed queue entries for historical tracking
-- and performance optimization by keeping the active queue table small

CREATE TABLE IF NOT EXISTS queue_history (
    historyId INT NOT NULL AUTO_INCREMENT,
    queueId INT NOT NULL, -- Original queue entry ID
    patientId INT NOT NULL,
    ticketNumber VARCHAR(50) NOT NULL,
    servicePoint VARCHAR(50) NOT NULL,
    priority ENUM('normal', 'urgent', 'emergency') DEFAULT 'normal',
    status ENUM('waiting', 'called', 'serving', 'completed', 'cancelled') DEFAULT 'completed',
    estimatedWaitTime INT,
    arrivalTime TIMESTAMP NOT NULL,
    calledTime TIMESTAMP NULL,
    startTime TIMESTAMP NULL,
    endTime TIMESTAMP NULL,
    notes TEXT,
    createdBy INT,
    archivedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Calculated service metrics
    waitTimeMinutes INT NULL, -- Time from arrival to called
    serviceTimeMinutes INT NULL, -- Time from start to end
    totalTimeMinutes INT NULL, -- Time from arrival to completion
    PRIMARY KEY (historyId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_queue_id (queueId),
    INDEX idx_patient (patientId),
    INDEX idx_ticket (ticketNumber),
    INDEX idx_service_point (servicePoint),
    INDEX idx_status (status),
    INDEX idx_archived_date (archivedAt),
    INDEX idx_end_time (endTime),
    INDEX idx_patient_date (patientId, endTime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add composite index for active queue queries (status + servicePoint)
-- This improves performance for filtering active queue entries
-- Note: Run these separately if the indexes already exist
-- ALTER TABLE queue_entries ADD INDEX idx_status_servicepoint (status, servicePoint);
-- ALTER TABLE queue_entries ADD INDEX idx_arrival_date (arrivalTime);

