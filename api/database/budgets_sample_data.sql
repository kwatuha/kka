-- ============================================
-- BUDGETS SAMPLE DATA
-- ============================================
-- This script creates sample data for budgets

-- Get department IDs (assuming departments exist)
SET @dept1 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 0);
SET @dept2 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 1);
SET @dept3 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 2);
SET @dept4 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 3);
SET @dept5 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 4);

-- Get account IDs if they exist (optional)
SET @account1 = (SELECT accountId FROM accounts WHERE accountType = 'Expense' LIMIT 1 OFFSET 0);
SET @account2 = (SELECT accountId FROM accounts WHERE accountType = 'Expense' LIMIT 1 OFFSET 1);

-- Get current year
SET @currentYear = YEAR(CURDATE());
SET @fiscalYear = CONCAT(@currentYear);

-- Create sample budgets for different departments
INSERT IGNORE INTO budgets (
    budgetCode, budgetName, departmentId, accountId, budgetPeriod, 
    startDate, endDate, allocatedAmount, spentAmount, status, notes, createdAt
)
VALUES
    -- Medical Department Budget
    (CONCAT('BUD-', @fiscalYear, '-MED-001'), 
     'Medical Department Annual Budget', 
     @dept1, 
     @account1, 
     @fiscalYear,
     CONCAT(@currentYear, '-01-01'), 
     CONCAT(@currentYear, '-12-31'), 
     12500000.00, 
     5250000.00, 
     'active',
     'Annual budget for medical department operations, equipment, and supplies',
     DATE_SUB(CURDATE(), INTERVAL 60 DAY)),
    
    -- Laboratory Department Budget
    (CONCAT('BUD-', @fiscalYear, '-LAB-001'), 
     'Laboratory Department Annual Budget', 
     @dept2, 
     @account1, 
     @fiscalYear,
     CONCAT(@currentYear, '-01-01'), 
     CONCAT(@currentYear, '-12-31'), 
     5000000.00, 
     2800000.00, 
     'active',
     'Budget for laboratory equipment, reagents, and supplies',
     DATE_SUB(CURDATE(), INTERVAL 55 DAY)),
    
    -- Pharmacy Department Budget
    (CONCAT('BUD-', @fiscalYear, '-PHARM-001'), 
     'Pharmacy Department Annual Budget', 
     @dept3, 
     @account1, 
     @fiscalYear,
     CONCAT(@currentYear, '-01-01'), 
     CONCAT(@currentYear, '-12-31'), 
     8000000.00, 
     3500000.00, 
     'active',
     'Budget for pharmacy inventory and medication supplies',
     DATE_SUB(CURDATE(), INTERVAL 50 DAY)),
    
    -- Administration Department Budget
    (CONCAT('BUD-', @fiscalYear, '-ADMIN-001'), 
     'Administration Department Annual Budget', 
     @dept4, 
     @account2, 
     @fiscalYear,
     CONCAT(@currentYear, '-01-01'), 
     CONCAT(@currentYear, '-12-31'), 
     4500000.00, 
     2100000.00, 
     'active',
     'Budget for administrative operations and utilities',
     DATE_SUB(CURDATE(), INTERVAL 45 DAY)),
    
    -- Maintenance Department Budget
    (CONCAT('BUD-', @fiscalYear, '-MAINT-001'), 
     'Maintenance Department Annual Budget', 
     @dept5, 
     @account2, 
     @fiscalYear,
     CONCAT(@currentYear, '-01-01'), 
     CONCAT(@currentYear, '-12-31'), 
     3000000.00, 
     1200000.00, 
     'active',
     'Budget for facility maintenance and repairs',
     DATE_SUB(CURDATE(), INTERVAL 40 DAY)),
    
    -- Draft Budget (not yet approved)
    (CONCAT('BUD-', @fiscalYear, '-RAD-001'), 
     'Radiology Department Annual Budget', 
     @dept1, 
     @account1, 
     @fiscalYear,
     CONCAT(@currentYear, '-01-01'), 
     CONCAT(@currentYear, '-12-31'), 
     6000000.00, 
     0.00, 
     'draft',
     'Draft budget for radiology department - pending approval',
     DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
    
    -- Approved but not yet active
    (CONCAT('BUD-', @fiscalYear, '-NURS-001'), 
     'Nursing Department Annual Budget', 
     @dept2, 
     @account1, 
     @fiscalYear,
     CONCAT(@currentYear, '-01-01'), 
     CONCAT(@currentYear, '-12-31'), 
     7000000.00, 
     0.00, 
     'approved',
     'Approved budget for nursing department',
     DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
    
    -- Closed budget (previous period)
    (CONCAT('BUD-', @currentYear - 1, '-MED-001'), 
     'Medical Department Budget - Previous Year', 
     @dept1, 
     @account1, 
     CONCAT(@currentYear - 1),
     CONCAT(@currentYear - 1, '-01-01'), 
     CONCAT(@currentYear - 1, '-12-31'), 
     11000000.00, 
     10800000.00, 
     'closed',
     'Completed budget from previous fiscal year',
     CONCAT(@currentYear - 1, '-01-15'));

-- Verify the data
SELECT 
    status,
    COUNT(*) as count,
    SUM(allocatedAmount) as total_allocated,
    SUM(spentAmount) as total_spent,
    SUM(allocatedAmount - COALESCE(spentAmount, 0)) as total_remaining
FROM budgets
GROUP BY status
ORDER BY status;

