-- ============================================
-- FINANCE MODULE ADDITIONS
-- ============================================

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
    methodId INT NOT NULL AUTO_INCREMENT,
    methodCode VARCHAR(50) UNIQUE,
    methodName VARCHAR(100) NOT NULL, -- Cash, Card, Mobile Money, Bank Transfer, Insurance, etc.
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (methodId),
    INDEX idx_method_code (methodCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments (payment transactions)
CREATE TABLE IF NOT EXISTS payments (
    paymentId INT NOT NULL AUTO_INCREMENT,
    paymentNumber VARCHAR(50) UNIQUE NOT NULL,
    invoiceId INT NOT NULL,
    paymentMethodId INT NOT NULL,
    paymentDate DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    referenceNumber VARCHAR(100), -- Receipt number, transaction ID, etc.
    receivedBy INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (paymentId),
    FOREIGN KEY (invoiceId) REFERENCES invoices(invoiceId) ON DELETE RESTRICT,
    FOREIGN KEY (paymentMethodId) REFERENCES payment_methods(methodId) ON DELETE RESTRICT,
    FOREIGN KEY (receivedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_payment_number (paymentNumber),
    INDEX idx_invoice (invoiceId),
    INDEX idx_payment_date (paymentDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chart of accounts (for general ledger)
CREATE TABLE IF NOT EXISTS accounts (
    accountId INT NOT NULL AUTO_INCREMENT,
    accountCode VARCHAR(50) UNIQUE NOT NULL,
    accountName VARCHAR(200) NOT NULL,
    accountType ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense') NOT NULL,
    parentAccountId INT NULL, -- For sub-accounts
    isActive BOOLEAN DEFAULT TRUE,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (accountId),
    FOREIGN KEY (parentAccountId) REFERENCES accounts(accountId) ON DELETE SET NULL,
    INDEX idx_account_code (accountCode),
    INDEX idx_account_type (accountType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- General ledger transactions (journal entries)
CREATE TABLE IF NOT EXISTS transactions (
    transactionId INT NOT NULL AUTO_INCREMENT,
    transactionNumber VARCHAR(50) UNIQUE NOT NULL,
    transactionDate DATE NOT NULL,
    description TEXT NOT NULL,
    referenceNumber VARCHAR(100), -- Invoice number, PO number, etc.
    referenceType VARCHAR(50), -- invoice, payment, purchase_order, etc.
    debitAccountId INT NOT NULL,
    creditAccountId INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    postedBy INT,
    postedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transactionId),
    FOREIGN KEY (debitAccountId) REFERENCES accounts(accountId) ON DELETE RESTRICT,
    FOREIGN KEY (creditAccountId) REFERENCES accounts(accountId) ON DELETE RESTRICT,
    FOREIGN KEY (postedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_transaction_number (transactionNumber),
    INDEX idx_transaction_date (transactionDate),
    INDEX idx_debit_account (debitAccountId),
    INDEX idx_credit_account (creditAccountId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
    budgetId INT NOT NULL AUTO_INCREMENT,
    budgetCode VARCHAR(50) UNIQUE,
    budgetName VARCHAR(200) NOT NULL,
    departmentId INT NULL,
    accountId INT NULL,
    budgetPeriod VARCHAR(50), -- e.g., "2024", "Q1 2024", "January 2024"
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    allocatedAmount DECIMAL(15, 2) NOT NULL,
    spentAmount DECIMAL(15, 2) DEFAULT 0,
    status ENUM('draft', 'approved', 'active', 'closed') DEFAULT 'draft',
    approvedBy INT NULL,
    approvedDate DATE NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (budgetId),
    FOREIGN KEY (departmentId) REFERENCES departments(departmentId) ON DELETE SET NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(accountId) ON DELETE SET NULL,
    FOREIGN KEY (approvedBy) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_budget_code (budgetCode),
    INDEX idx_department (departmentId),
    INDEX idx_budget_period (budgetPeriod),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fixed assets
CREATE TABLE IF NOT EXISTS assets (
    assetId INT NOT NULL AUTO_INCREMENT,
    assetCode VARCHAR(50) UNIQUE NOT NULL,
    assetName VARCHAR(200) NOT NULL,
    category VARCHAR(100), -- Equipment, Furniture, Vehicle, Building, etc.
    assetType VARCHAR(100),
    purchaseDate DATE,
    purchaseCost DECIMAL(15, 2) NOT NULL,
    currentValue DECIMAL(15, 2),
    depreciationMethod VARCHAR(50), -- Straight-line, Declining balance, etc.
    depreciationRate DECIMAL(5, 2) NULL,
    accumulatedDepreciation DECIMAL(15, 2) DEFAULT 0,
    location VARCHAR(200),
    serialNumber VARCHAR(100),
    manufacturer VARCHAR(200),
    model VARCHAR(100),
    status ENUM('active', 'disposed', 'maintenance', 'retired') DEFAULT 'active',
    disposedDate DATE NULL,
    disposedValue DECIMAL(15, 2) NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (assetId),
    INDEX idx_asset_code (assetCode),
    INDEX idx_category (category),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Accounts receivable (patient outstanding balances)
CREATE TABLE IF NOT EXISTS receivables (
    receivableId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    invoiceId INT NOT NULL,
    totalAmount DECIMAL(15, 2) NOT NULL,
    paidAmount DECIMAL(15, 2) DEFAULT 0,
    outstandingAmount DECIMAL(15, 2) NOT NULL,
    dueDate DATE,
    status ENUM('current', 'overdue', 'paid', 'written_off') DEFAULT 'current',
    lastPaymentDate DATE NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (receivableId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (invoiceId) REFERENCES invoices(invoiceId) ON DELETE RESTRICT,
    INDEX idx_patient (patientId),
    INDEX idx_invoice (invoiceId),
    INDEX idx_status (status),
    INDEX idx_due_date (dueDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Accounts payable (supplier invoices)
CREATE TABLE IF NOT EXISTS payables (
    payableId INT NOT NULL AUTO_INCREMENT,
    vendorId INT NOT NULL,
    purchaseOrderId INT NULL,
    invoiceNumber VARCHAR(100) NOT NULL,
    invoiceDate DATE NOT NULL,
    totalAmount DECIMAL(15, 2) NOT NULL,
    paidAmount DECIMAL(15, 2) DEFAULT 0,
    outstandingAmount DECIMAL(15, 2) NOT NULL,
    dueDate DATE,
    status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    lastPaymentDate DATE NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (payableId),
    FOREIGN KEY (vendorId) REFERENCES vendors(vendorId) ON DELETE RESTRICT,
    FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(purchaseOrderId) ON DELETE SET NULL,
    INDEX idx_vendor (vendorId),
    INDEX idx_invoice_number (invoiceNumber),
    INDEX idx_status (status),
    INDEX idx_due_date (dueDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cash transactions (cash register transactions)
CREATE TABLE IF NOT EXISTS cash_transactions (
    cashTransactionId INT NOT NULL AUTO_INCREMENT,
    transactionNumber VARCHAR(50) UNIQUE NOT NULL,
    transactionDate DATE NOT NULL,
    transactionType ENUM('receipt', 'payment', 'transfer', 'adjustment') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    referenceNumber VARCHAR(100),
    referenceType VARCHAR(50), -- invoice, payment, etc.
    cashRegister VARCHAR(100),
    handledBy INT NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cashTransactionId),
    FOREIGN KEY (handledBy) REFERENCES users(userId) ON DELETE RESTRICT,
    INDEX idx_transaction_number (transactionNumber),
    INDEX idx_transaction_date (transactionDate),
    INDEX idx_transaction_type (transactionType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revenue share allocations
CREATE TABLE IF NOT EXISTS revenue_share (
    revenueShareId INT NOT NULL AUTO_INCREMENT,
    shareCode VARCHAR(50) UNIQUE,
    shareName VARCHAR(200) NOT NULL,
    departmentId INT NULL,
    accountId INT NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL, -- Percentage of revenue
    amount DECIMAL(15, 2) NULL, -- Fixed amount (alternative to percentage)
    startDate DATE NOT NULL,
    endDate DATE NULL, -- NULL = ongoing
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (revenueShareId),
    FOREIGN KEY (departmentId) REFERENCES departments(departmentId) ON DELETE SET NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(accountId) ON DELETE RESTRICT,
    INDEX idx_share_code (shareCode),
    INDEX idx_department (departmentId),
    INDEX idx_is_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment plans (installment payment agreements)
CREATE TABLE IF NOT EXISTS payment_plans (
    planId INT NOT NULL AUTO_INCREMENT,
    planNumber VARCHAR(50) UNIQUE NOT NULL,
    invoiceId INT NOT NULL,
    patientId INT NOT NULL,
    totalAmount DECIMAL(15, 2) NOT NULL,
    numberOfInstallments INT NOT NULL,
    installmentAmount DECIMAL(15, 2) NOT NULL,
    startDate DATE NOT NULL,
    status ENUM('active', 'completed', 'defaulted', 'cancelled') DEFAULT 'active',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (planId),
    FOREIGN KEY (invoiceId) REFERENCES invoices(invoiceId) ON DELETE RESTRICT,
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_plan_number (planNumber),
    INDEX idx_invoice (invoiceId),
    INDEX idx_patient (patientId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment plan installments
CREATE TABLE IF NOT EXISTS payment_plan_installments (
    installmentId INT NOT NULL AUTO_INCREMENT,
    planId INT NOT NULL,
    installmentNumber INT NOT NULL,
    dueDate DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    paidAmount DECIMAL(15, 2) DEFAULT 0,
    status ENUM('pending', 'partial', 'paid', 'overdue') DEFAULT 'pending',
    paymentDate DATE NULL,
    paymentId INT NULL, -- Link to payment if paid
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (installmentId),
    FOREIGN KEY (planId) REFERENCES payment_plans(planId) ON DELETE CASCADE,
    FOREIGN KEY (paymentId) REFERENCES payments(paymentId) ON DELETE SET NULL,
    INDEX idx_plan (planId),
    INDEX idx_due_date (dueDate),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mobile payment logs (mobile money transaction history)
CREATE TABLE IF NOT EXISTS mobile_payment_logs (
    logId INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    refNo VARCHAR(100) NOT NULL, -- Reference/Transaction number
    phoneNumber VARCHAR(20) NOT NULL,
    mobileProvider VARCHAR(50) NOT NULL, -- M-Pesa, Airtel Money, T-Kash, etc.
    accountNumber VARCHAR(100),
    transactionDate DATETIME NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdBy INT,
    PRIMARY KEY (logId),
    FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_ref_no (refNo),
    INDEX idx_phone_number (phoneNumber),
    INDEX idx_mobile_provider (mobileProvider),
    INDEX idx_transaction_date (transactionDate),
    INDEX idx_account_number (accountNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

