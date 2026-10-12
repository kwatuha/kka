-- HR Module Enhancements
-- Payroll, Promotions, and additional features

-- Employee salary/payroll table
CREATE TABLE IF NOT EXISTS employee_salaries (
    salaryId INT NOT NULL AUTO_INCREMENT,
    employeeId INT NOT NULL,
    positionId INT NULL,
    baseSalary DECIMAL(15, 2) NOT NULL,
    allowances DECIMAL(15, 2) DEFAULT 0.00,
    deductions DECIMAL(15, 2) DEFAULT 0.00,
    netSalary DECIMAL(15, 2) NOT NULL,
    effectiveDate DATE NOT NULL,
    endDate DATE NULL,
    payFrequency ENUM('monthly', 'biweekly', 'weekly', 'daily') DEFAULT 'monthly',
    bankName VARCHAR(200),
    bankAccount VARCHAR(100),
    bankBranch VARCHAR(100),
    notes TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (salaryId),
    FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
    FOREIGN KEY (positionId) REFERENCES employee_positions(positionId) ON DELETE SET NULL,
    INDEX idx_employee (employeeId),
    INDEX idx_effective_date (effectiveDate),
    INDEX idx_is_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payroll transactions (monthly payroll records)
CREATE TABLE IF NOT EXISTS payroll_transactions (
    payrollId INT NOT NULL AUTO_INCREMENT,
    payrollNumber VARCHAR(50) UNIQUE NOT NULL,
    employeeId INT NOT NULL,
    salaryId INT NOT NULL,
    payPeriodStart DATE NOT NULL,
    payPeriodEnd DATE NOT NULL,
    baseSalary DECIMAL(15, 2) NOT NULL,
    allowances DECIMAL(15, 2) DEFAULT 0.00,
    overtime DECIMAL(15, 2) DEFAULT 0.00,
    bonuses DECIMAL(15, 2) DEFAULT 0.00,
    deductions DECIMAL(15, 2) DEFAULT 0.00,
    tax DECIMAL(15, 2) DEFAULT 0.00,
    nhif DECIMAL(15, 2) DEFAULT 0.00,
    nssf DECIMAL(15, 2) DEFAULT 0.00,
    otherDeductions DECIMAL(15, 2) DEFAULT 0.00,
    grossSalary DECIMAL(15, 2) NOT NULL,
    netSalary DECIMAL(15, 2) NOT NULL,
    paymentDate DATE NOT NULL,
    paymentStatus ENUM('pending', 'processed', 'paid', 'cancelled') DEFAULT 'pending',
    paymentMethod VARCHAR(50),
    referenceNumber VARCHAR(100),
    processedBy INT NULL,
    processedDate DATETIME NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (payrollId),
    FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
    FOREIGN KEY (salaryId) REFERENCES employee_salaries(salaryId) ON DELETE RESTRICT,
    FOREIGN KEY (processedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_payroll_number (payrollNumber),
    INDEX idx_employee (employeeId),
    INDEX idx_pay_period (payPeriodStart, payPeriodEnd),
    INDEX idx_payment_status (paymentStatus),
    INDEX idx_payment_date (paymentDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employee position history (promotions, transfers, demotions)
CREATE TABLE IF NOT EXISTS employee_position_history (
    historyId INT NOT NULL AUTO_INCREMENT,
    employeeId INT NOT NULL,
    previousPositionId INT NULL,
    newPositionId INT NOT NULL,
    previousDepartmentId INT NULL,
    newDepartmentId INT NULL,
    changeType ENUM('promotion', 'demotion', 'transfer', 'lateral', 'appointment') DEFAULT 'transfer',
    effectiveDate DATE NOT NULL,
    reason TEXT,
    approvedBy INT NULL,
    approvedDate DATE NULL,
    salaryChange DECIMAL(15, 2) NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (historyId),
    FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
    FOREIGN KEY (previousPositionId) REFERENCES employee_positions(positionId) ON DELETE SET NULL,
    FOREIGN KEY (newPositionId) REFERENCES employee_positions(positionId) ON DELETE RESTRICT,
    FOREIGN KEY (previousDepartmentId) REFERENCES departments(departmentId) ON DELETE SET NULL,
    FOREIGN KEY (newDepartmentId) REFERENCES departments(departmentId) ON DELETE SET NULL,
    FOREIGN KEY (approvedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_employee (employeeId),
    INDEX idx_effective_date (effectiveDate),
    INDEX idx_change_type (changeType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employee leave balance (track leave days available)
CREATE TABLE IF NOT EXISTS employee_leave_balance (
    balanceId INT NOT NULL AUTO_INCREMENT,
    employeeId INT NOT NULL,
    leaveType ENUM('annual', 'sick', 'maternity', 'paternity', 'compassionate', 'study', 'unpaid', 'other') NOT NULL,
    year INT NOT NULL,
    allocatedDays DECIMAL(5, 2) DEFAULT 0.00,
    usedDays DECIMAL(5, 2) DEFAULT 0.00,
    balanceDays DECIMAL(5, 2) DEFAULT 0.00,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (balanceId),
    FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
    UNIQUE KEY unique_balance (employeeId, leaveType, year),
    INDEX idx_employee (employeeId),
    INDEX idx_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

