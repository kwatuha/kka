-- ============================================
-- Insurance provider rates per charge (track over time)
-- ============================================
-- Each insurer can have a different rate for a hospital charge; startDate/endDate
-- allow history (e.g. Insurance A paid 2000 for "Bed" in 2011, now pays 3000).

CREATE TABLE IF NOT EXISTS insurance_charge_rates (
    rateId INT NOT NULL AUTO_INCREMENT,
    chargeId INT NOT NULL,
    providerId INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NULL COMMENT 'NULL = currently active',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (rateId),
    FOREIGN KEY (chargeId) REFERENCES service_charges(chargeId) ON DELETE CASCADE,
    FOREIGN KEY (providerId) REFERENCES insurance_providers(providerId) ON DELETE CASCADE,
    INDEX idx_charge_provider (chargeId, providerId),
    INDEX idx_provider (providerId),
    INDEX idx_effective (startDate, endDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Inpatient (cash) charge rates
-- ============================================
-- Used when patient pays cash for inpatient services. Can differ by ward or ward type
-- (e.g. general ward bed vs private ward bed). Lookup: (charge, wardId) first,
-- then (charge, wardType), then (charge, NULL, NULL) as default.

CREATE TABLE IF NOT EXISTS inpatient_charge_rates (
    rateId INT NOT NULL AUTO_INCREMENT,
    chargeId INT NOT NULL,
    wardId INT NULL COMMENT 'Specific ward; NULL = apply by wardType or default',
    wardType VARCHAR(100) NULL COMMENT 'e.g. General, Private, Pediatric, ICU; NULL = default for charge',
    amount DECIMAL(15, 2) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NULL COMMENT 'NULL = currently active',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (rateId),
    FOREIGN KEY (chargeId) REFERENCES service_charges(chargeId) ON DELETE CASCADE,
    FOREIGN KEY (wardId) REFERENCES wards(wardId) ON DELETE CASCADE,
    INDEX idx_charge_ward (chargeId, wardId),
    INDEX idx_charge_ward_type (chargeId, wardType),
    INDEX idx_effective (startDate, endDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
