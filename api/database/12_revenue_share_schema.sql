-- ============================================
-- REVENUE SHARE MODULE SCHEMA
-- ============================================

-- Revenue share rules/allocations
CREATE TABLE IF NOT EXISTS revenue_share_rules (
    ruleId INT NOT NULL AUTO_INCREMENT,
    ruleName VARCHAR(200) NOT NULL,
    ruleType ENUM('department', 'service', 'category', 'global') DEFAULT 'department',
    departmentId INT NULL,
    serviceId INT NULL,
    serviceCategory VARCHAR(100) NULL,
    allocationPercentage DECIMAL(5, 2) NOT NULL, -- Percentage (0-100)
    effectiveFrom DATE NOT NULL,
    effectiveTo DATE NULL, -- NULL = active/ongoing
    isActive BOOLEAN DEFAULT TRUE,
    description TEXT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (ruleId),
    FOREIGN KEY (departmentId) REFERENCES departments(departmentId) ON DELETE SET NULL,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_rule_type (ruleType),
    INDEX idx_department (departmentId),
    INDEX idx_is_active (isActive),
    INDEX idx_effective_from (effectiveFrom),
    INDEX idx_effective_to (effectiveTo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revenue share distributions (actual distributions made)
CREATE TABLE IF NOT EXISTS revenue_share_distributions (
    distributionId INT NOT NULL AUTO_INCREMENT,
    distributionNumber VARCHAR(50) UNIQUE NOT NULL,
    distributionDate DATE NOT NULL,
    periodStart DATE NOT NULL,
    periodEnd DATE NOT NULL,
    totalRevenue DECIMAL(15, 2) NOT NULL,
    totalDistributed DECIMAL(15, 2) NOT NULL,
    status ENUM('draft', 'pending', 'approved', 'distributed', 'cancelled') DEFAULT 'draft',
    approvedBy INT NULL,
    approvedDate DATE NULL,
    distributedDate DATE NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (distributionId),
    FOREIGN KEY (approvedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_distribution_number (distributionNumber),
    INDEX idx_distribution_date (distributionDate),
    INDEX idx_status (status),
    INDEX idx_period_start (periodStart),
    INDEX idx_period_end (periodEnd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revenue share distribution items (breakdown by department/service)
CREATE TABLE IF NOT EXISTS revenue_share_distribution_items (
    itemId INT NOT NULL AUTO_INCREMENT,
    distributionId INT NOT NULL,
    departmentId INT NULL,
    serviceCategory VARCHAR(100) NULL,
    ruleId INT NULL,
    revenueAmount DECIMAL(15, 2) NOT NULL,
    allocationPercentage DECIMAL(5, 2) NOT NULL,
    distributedAmount DECIMAL(15, 2) NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (itemId),
    FOREIGN KEY (distributionId) REFERENCES revenue_share_distributions(distributionId) ON DELETE CASCADE,
    FOREIGN KEY (departmentId) REFERENCES departments(departmentId) ON DELETE SET NULL,
    FOREIGN KEY (ruleId) REFERENCES revenue_share_rules(ruleId) ON DELETE SET NULL,
    INDEX idx_distribution (distributionId),
    INDEX idx_department (departmentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

