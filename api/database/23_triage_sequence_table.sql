-- ============================================
-- TRIAGE SEQUENCE TABLE
-- ============================================
-- This table is used to generate sequential triage numbers (TRI-000001, TRI-000002, etc.)
-- It ensures unique triage numbers are generated even in high-concurrency scenarios

CREATE TABLE IF NOT EXISTS triage_sequence (
    date_key DATE NOT NULL,
    last_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (date_key),
    INDEX idx_date_key (date_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize with today's date if needed
INSERT IGNORE INTO triage_sequence (date_key, last_number) 
VALUES (CURDATE(), 0);





