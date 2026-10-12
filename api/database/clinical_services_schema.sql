-- Clinical Services Table
-- This table stores clinical services offered at the medical centre

CREATE TABLE IF NOT EXISTS clinical_services (
    serviceId INT NOT NULL AUTO_INCREMENT,
    serviceCode VARCHAR(50) UNIQUE,
    serviceName VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    cost DECIMAL(15, 2) DEFAULT 0,
    department VARCHAR(100),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    voided BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (serviceId),
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_code (serviceCode),
    INDEX idx_category (category),
    INDEX idx_department (department),
    INDEX idx_status (status),
    INDEX idx_voided (voided)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;






