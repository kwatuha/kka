CREATE TABLE IF NOT EXISTS charge_rate_rules (
    ruleId INT NOT NULL AUTO_INCREMENT,
    chargeId INT NOT NULL,
    payerType ENUM('cash', 'insurance') NOT NULL DEFAULT 'cash',
    providerId INT NULL,
    wardId INT NULL,
    wardType VARCHAR(100) NULL,
    amount DECIMAL(15, 2) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NULL,
    priority INT NOT NULL DEFAULT 0,
    notes TEXT NULL,
    sourceTable VARCHAR(64) NULL,
    sourceRateId INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ruleId),
    KEY idx_charge_payer_dates (chargeId, payerType, startDate, endDate),
    KEY idx_provider (providerId),
    KEY idx_ward (wardId, wardType),
    KEY idx_priority (priority),
    KEY idx_source (sourceTable, sourceRateId),
    CONSTRAINT fk_charge_rate_rules_charge FOREIGN KEY (chargeId) REFERENCES service_charges(chargeId) ON DELETE CASCADE,
    CONSTRAINT fk_charge_rate_rules_provider FOREIGN KEY (providerId) REFERENCES insurance_providers(providerId) ON DELETE CASCADE,
    CONSTRAINT fk_charge_rate_rules_ward FOREIGN KEY (wardId) REFERENCES wards(wardId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill insurer-specific rates
INSERT INTO charge_rate_rules (
    chargeId, payerType, providerId, wardId, wardType, amount, startDate, endDate, priority, notes, sourceTable, sourceRateId
)
SELECT
    r.chargeId,
    'insurance',
    r.providerId,
    NULL,
    NULL,
    r.amount,
    r.startDate,
    r.endDate,
    100,
    r.notes,
    'insurance_charge_rates',
    r.rateId
FROM insurance_charge_rates r
LEFT JOIN charge_rate_rules cr
    ON cr.sourceTable = 'insurance_charge_rates' AND cr.sourceRateId = r.rateId
WHERE cr.ruleId IS NULL;

-- Backfill inpatient cash rates (ward/wardType/default)
INSERT INTO charge_rate_rules (
    chargeId, payerType, providerId, wardId, wardType, amount, startDate, endDate, priority, notes, sourceTable, sourceRateId
)
SELECT
    r.chargeId,
    'cash',
    NULL,
    r.wardId,
    r.wardType,
    r.amount,
    r.startDate,
    r.endDate,
    CASE
        WHEN r.wardId IS NOT NULL THEN 300
        WHEN r.wardType IS NOT NULL THEN 200
        ELSE 100
    END,
    r.notes,
    'inpatient_charge_rates',
    r.rateId
FROM inpatient_charge_rates r
LEFT JOIN charge_rate_rules cr
    ON cr.sourceTable = 'inpatient_charge_rates' AND cr.sourceRateId = r.rateId
WHERE cr.ruleId IS NULL;

