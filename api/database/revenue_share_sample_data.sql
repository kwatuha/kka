-- ============================================
-- REVENUE SHARE SAMPLE DATA
-- ============================================
-- This script creates sample data for revenue share rules and distributions

-- Get sample departments
SET @dept1 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 0);
SET @dept2 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 1);
SET @dept3 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 2);
SET @dept4 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 3);
SET @dept5 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 4);

-- Get sample users
SET @user1 = (SELECT userId FROM users LIMIT 1 OFFSET 0);
SET @user2 = (SELECT userId FROM users LIMIT 1 OFFSET 1);

-- Insert Revenue Share Rules
INSERT IGNORE INTO revenue_share_rules (
    ruleName, ruleType, departmentId, allocationPercentage, effectiveFrom, effectiveTo, isActive, description, notes, createdBy, createdAt
)
VALUES
    -- Department-based rules
    ('Emergency Department Revenue Share', 'department', @dept1, 25.00,
     DATE_SUB(CURDATE(), INTERVAL 24 MONTH), DATE_ADD(CURDATE(), INTERVAL 12 MONTH), TRUE,
     '25% of emergency department revenue', 'Standard allocation for emergency services', @user1, DATE_SUB(CURDATE(), INTERVAL 24 MONTH)),
    
    ('Cardiology Department Revenue Share', 'department', @dept2, 20.00,
     DATE_SUB(CURDATE(), INTERVAL 18 MONTH), DATE_ADD(CURDATE(), INTERVAL 18 MONTH), TRUE,
     '20% of cardiology department revenue', 'Allocation for cardiology services', @user1, DATE_SUB(CURDATE(), INTERVAL 18 MONTH)),
    
    ('Laboratory Services Revenue Share', 'department', @dept3, 15.00,
     DATE_SUB(CURDATE(), INTERVAL 12 MONTH), DATE_ADD(CURDATE(), INTERVAL 24 MONTH), TRUE,
     '15% of laboratory services revenue', 'Lab services revenue allocation', @user1, DATE_SUB(CURDATE(), INTERVAL 12 MONTH)),
    
    ('Radiology Department Revenue Share', 'department', @dept4, 18.00,
     DATE_SUB(CURDATE(), INTERVAL 10 MONTH), DATE_ADD(CURDATE(), INTERVAL 26 MONTH), TRUE,
     '18% of radiology department revenue', 'Radiology services allocation', @user1, DATE_SUB(CURDATE(), INTERVAL 10 MONTH)),
    
    ('Pharmacy Revenue Share', 'department', @dept5, 12.00,
     DATE_SUB(CURDATE(), INTERVAL 8 MONTH), DATE_ADD(CURDATE(), INTERVAL 28 MONTH), TRUE,
     '12% of pharmacy revenue', 'Pharmacy revenue allocation', @user1, DATE_SUB(CURDATE(), INTERVAL 8 MONTH)),
    
    -- Service category rules
    ('Surgical Services Revenue Share', 'category', NULL, 22.00,
     DATE_SUB(CURDATE(), INTERVAL 15 MONTH), DATE_ADD(CURDATE(), INTERVAL 21 MONTH), TRUE,
     '22% of all surgical services revenue', 'Surgery category allocation', @user1, DATE_SUB(CURDATE(), INTERVAL 15 MONTH)),
    
    ('Outpatient Consultations Revenue Share', 'category', NULL, 10.00,
     DATE_SUB(CURDATE(), INTERVAL 6 MONTH), DATE_ADD(CURDATE(), INTERVAL 30 MONTH), TRUE,
     '10% of outpatient consultation revenue', 'Outpatient services allocation', @user1, DATE_SUB(CURDATE(), INTERVAL 6 MONTH)),
    
    -- Expired rule (for testing)
    ('Old Emergency Department Rule', 'department', @dept1, 30.00,
     DATE_SUB(CURDATE(), INTERVAL 36 MONTH), DATE_SUB(CURDATE(), INTERVAL 12 MONTH), FALSE,
     'Previous allocation rule (expired)', 'Replaced by new rule', @user1, DATE_SUB(CURDATE(), INTERVAL 36 MONTH));

-- Get rule IDs for distributions
SET @rule1 = (SELECT ruleId FROM revenue_share_rules WHERE ruleName = 'Emergency Department Revenue Share');
SET @rule2 = (SELECT ruleId FROM revenue_share_rules WHERE ruleName = 'Cardiology Department Revenue Share');
SET @rule3 = (SELECT ruleId FROM revenue_share_rules WHERE ruleName = 'Laboratory Services Revenue Share');
SET @rule4 = (SELECT ruleId FROM revenue_share_rules WHERE ruleName = 'Radiology Department Revenue Share');
SET @rule5 = (SELECT ruleId FROM revenue_share_rules WHERE ruleName = 'Pharmacy Revenue Share');

-- Insert Revenue Share Distributions
INSERT IGNORE INTO revenue_share_distributions (
    distributionNumber, distributionDate, periodStart, periodEnd, totalRevenue, totalDistributed,
    status, approvedBy, approvedDate, distributedDate, notes, createdBy, createdAt
)
VALUES
    -- Distributed distribution
    ('RSD-000001', DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 
     DATE_SUB(CURDATE(), INTERVAL 3 MONTH), DATE_SUB(CURDATE(), INTERVAL 2 MONTH),
     2500000.00, 2500000.00, 'distributed', @user2,
     DATE_SUB(CURDATE(), INTERVAL 2 MONTH), DATE_SUB(CURDATE(), INTERVAL 2 MONTH),
     'Q3 2024 revenue share distribution', @user1, DATE_SUB(CURDATE(), INTERVAL 2 MONTH)),
    
    -- Approved distribution
    ('RSD-000002', DATE_SUB(CURDATE(), INTERVAL 1 MONTH),
     DATE_SUB(CURDATE(), INTERVAL 2 MONTH), DATE_SUB(CURDATE(), INTERVAL 1 MONTH),
     2800000.00, 2800000.00, 'approved', @user2,
     DATE_SUB(CURDATE(), INTERVAL 1 MONTH), NULL,
     'Q4 2024 revenue share distribution - pending payment', @user1, DATE_SUB(CURDATE(), INTERVAL 1 MONTH)),
    
    -- Draft distribution
    ('RSD-000003', CURDATE(),
     DATE_SUB(CURDATE(), INTERVAL 1 MONTH), CURDATE(),
     3200000.00, 3200000.00, 'draft', NULL, NULL, NULL,
     'Current month revenue share - in review', @user1, DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
    
    -- Older distributed distribution
    ('RSD-000004', DATE_SUB(CURDATE(), INTERVAL 5 MONTH),
     DATE_SUB(CURDATE(), INTERVAL 6 MONTH), DATE_SUB(CURDATE(), INTERVAL 5 MONTH),
     2300000.00, 2300000.00, 'distributed', @user2,
     DATE_SUB(CURDATE(), INTERVAL 5 MONTH), DATE_SUB(CURDATE(), INTERVAL 5 MONTH),
     'Q2 2024 revenue share distribution', @user1, DATE_SUB(CURDATE(), INTERVAL 5 MONTH)),
    
    -- Pending approval
    ('RSD-000005', DATE_SUB(CURDATE(), INTERVAL 1 DAY),
     DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY),
     1800000.00, 1800000.00, 'pending', NULL, NULL, NULL,
     'Weekly revenue share - awaiting approval', @user1, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

-- Get distribution IDs for items
SET @dist1 = (SELECT distributionId FROM revenue_share_distributions WHERE distributionNumber = 'RSD-000001');
SET @dist2 = (SELECT distributionId FROM revenue_share_distributions WHERE distributionNumber = 'RSD-000002');
SET @dist3 = (SELECT distributionId FROM revenue_share_distributions WHERE distributionNumber = 'RSD-000003');
SET @dist4 = (SELECT distributionId FROM revenue_share_distributions WHERE distributionNumber = 'RSD-000004');
SET @dist5 = (SELECT distributionId FROM revenue_share_distributions WHERE distributionNumber = 'RSD-000005');

-- Insert Distribution Items for RSD-000001
INSERT IGNORE INTO revenue_share_distribution_items (
    distributionId, departmentId, ruleId, revenueAmount, allocationPercentage, distributedAmount, notes, createdAt
)
VALUES
    (@dist1, @dept1, @rule1, 625000.00, 25.00, 625000.00, 'Emergency department allocation', DATE_SUB(CURDATE(), INTERVAL 2 MONTH)),
    (@dist1, @dept2, @rule2, 500000.00, 20.00, 500000.00, 'Cardiology department allocation', DATE_SUB(CURDATE(), INTERVAL 2 MONTH)),
    (@dist1, @dept3, @rule3, 375000.00, 15.00, 375000.00, 'Laboratory services allocation', DATE_SUB(CURDATE(), INTERVAL 2 MONTH)),
    (@dist1, @dept4, @rule4, 450000.00, 18.00, 450000.00, 'Radiology department allocation', DATE_SUB(CURDATE(), INTERVAL 2 MONTH)),
    (@dist1, @dept5, @rule5, 550000.00, 22.00, 550000.00, 'Other services allocation', DATE_SUB(CURDATE(), INTERVAL 2 MONTH));

-- Insert Distribution Items for RSD-000002
INSERT IGNORE INTO revenue_share_distribution_items (
    distributionId, departmentId, ruleId, revenueAmount, allocationPercentage, distributedAmount, notes, createdAt
)
VALUES
    (@dist2, @dept1, @rule1, 700000.00, 25.00, 700000.00, 'Emergency department allocation', DATE_SUB(CURDATE(), INTERVAL 1 MONTH)),
    (@dist2, @dept2, @rule2, 560000.00, 20.00, 560000.00, 'Cardiology department allocation', DATE_SUB(CURDATE(), INTERVAL 1 MONTH)),
    (@dist2, @dept3, @rule3, 420000.00, 15.00, 420000.00, 'Laboratory services allocation', DATE_SUB(CURDATE(), INTERVAL 1 MONTH)),
    (@dist2, @dept4, @rule4, 504000.00, 18.00, 504000.00, 'Radiology department allocation', DATE_SUB(CURDATE(), INTERVAL 1 MONTH)),
    (@dist2, @dept5, @rule5, 616000.00, 22.00, 616000.00, 'Other services allocation', DATE_SUB(CURDATE(), INTERVAL 1 MONTH));

-- Insert Distribution Items for RSD-000003 (Draft)
INSERT IGNORE INTO revenue_share_distribution_items (
    distributionId, departmentId, ruleId, revenueAmount, allocationPercentage, distributedAmount, notes, createdAt
)
VALUES
    (@dist3, @dept1, @rule1, 800000.00, 25.00, 800000.00, 'Emergency department allocation', DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
    (@dist3, @dept2, @rule2, 640000.00, 20.00, 640000.00, 'Cardiology department allocation', DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
    (@dist3, @dept3, @rule3, 480000.00, 15.00, 480000.00, 'Laboratory services allocation', DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
    (@dist3, @dept4, @rule4, 576000.00, 18.00, 576000.00, 'Radiology department allocation', DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
    (@dist3, @dept5, @rule5, 704000.00, 22.00, 704000.00, 'Other services allocation', DATE_SUB(CURDATE(), INTERVAL 3 DAY));

-- Insert Distribution Items for RSD-000004
INSERT IGNORE INTO revenue_share_distribution_items (
    distributionId, departmentId, ruleId, revenueAmount, allocationPercentage, distributedAmount, notes, createdAt
)
VALUES
    (@dist4, @dept1, @rule1, 575000.00, 25.00, 575000.00, 'Emergency department allocation', DATE_SUB(CURDATE(), INTERVAL 5 MONTH)),
    (@dist4, @dept2, @rule2, 460000.00, 20.00, 460000.00, 'Cardiology department allocation', DATE_SUB(CURDATE(), INTERVAL 5 MONTH)),
    (@dist4, @dept3, @rule3, 345000.00, 15.00, 345000.00, 'Laboratory services allocation', DATE_SUB(CURDATE(), INTERVAL 5 MONTH)),
    (@dist4, @dept4, @rule4, 414000.00, 18.00, 414000.00, 'Radiology department allocation', DATE_SUB(CURDATE(), INTERVAL 5 MONTH)),
    (@dist4, @dept5, @rule5, 506000.00, 22.00, 506000.00, 'Other services allocation', DATE_SUB(CURDATE(), INTERVAL 5 MONTH));

-- Insert Distribution Items for RSD-000005
INSERT IGNORE INTO revenue_share_distribution_items (
    distributionId, departmentId, ruleId, revenueAmount, allocationPercentage, distributedAmount, notes, createdAt
)
VALUES
    (@dist5, @dept1, @rule1, 450000.00, 25.00, 450000.00, 'Emergency department allocation', DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
    (@dist5, @dept2, @rule2, 360000.00, 20.00, 360000.00, 'Cardiology department allocation', DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
    (@dist5, @dept3, @rule3, 270000.00, 15.00, 270000.00, 'Laboratory services allocation', DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
    (@dist5, @dept4, @rule4, 324000.00, 18.00, 324000.00, 'Radiology department allocation', DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
    (@dist5, @dept5, @rule5, 396000.00, 22.00, 396000.00, 'Other services allocation', DATE_SUB(CURDATE(), INTERVAL 1 DAY));

-- Verify the data
SELECT 
    ruleType,
    COUNT(*) as count,
    SUM(allocationPercentage) as total_percentage,
    COUNT(CASE WHEN isActive = 1 AND (effectiveTo IS NULL OR effectiveTo >= CURDATE()) THEN 1 END) as active_count
FROM revenue_share_rules
GROUP BY ruleType
ORDER BY ruleType;

SELECT 
    status,
    COUNT(*) as count,
    SUM(totalRevenue) as total_revenue,
    SUM(totalDistributed) as total_distributed
FROM revenue_share_distributions
GROUP BY status
ORDER BY status;

SELECT 
    d.departmentName,
    COUNT(rsdi.itemId) as distribution_count,
    SUM(rsdi.distributedAmount) as total_distributed
FROM revenue_share_distribution_items rsdi
LEFT JOIN departments d ON rsdi.departmentId = d.departmentId
GROUP BY d.departmentId, d.departmentName
ORDER BY total_distributed DESC;

