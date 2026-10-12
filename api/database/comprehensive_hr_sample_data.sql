-- Comprehensive HR Sample Data
-- Payroll, Promotions, and Attendance

-- Get employee IDs
SET @emp1 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1);
SET @emp2 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1 OFFSET 1);
SET @emp3 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1 OFFSET 2);
SET @emp4 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1 OFFSET 3);
SET @emp5 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1 OFFSET 4);
SET @emp6 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1 OFFSET 5);

-- Get position IDs (create if they don't exist)
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, isActive) VALUES
('MGR', 'Manager', TRUE),
('SEN', 'Senior Staff', TRUE),
('STF', 'Staff', TRUE),
('INT', 'Intern', TRUE);

SET @pos1 = (SELECT positionId FROM employee_positions WHERE positionCode = 'MGR' LIMIT 1);
SET @pos2 = (SELECT positionId FROM employee_positions WHERE positionCode = 'SEN' LIMIT 1);
SET @pos3 = (SELECT positionId FROM employee_positions WHERE positionCode = 'STF' LIMIT 1);
SET @pos4 = (SELECT positionId FROM employee_positions WHERE positionCode = 'INT' LIMIT 1);

-- Get department IDs
SET @dept1 = (SELECT departmentId FROM departments ORDER BY departmentId LIMIT 1);
SET @dept2 = (SELECT departmentId FROM departments ORDER BY departmentId LIMIT 1 OFFSET 1);

-- ============================================
-- PAYROLL SAMPLE DATA
-- ============================================

-- Ensure employees have active salaries
INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp1, COALESCE(@pos1, NULL), 250000.00, 50000.00, 25000.00, 275000.00, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'monthly', 'Equity Bank', '1234567890', 'Nairobi', TRUE
WHERE @emp1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp1 AND isActive = TRUE);

INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp2, COALESCE(@pos2, NULL), 180000.00, 30000.00, 18000.00, 192000.00, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'monthly', 'KCB', '2345678901', 'Nairobi', TRUE
WHERE @emp2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp2 AND isActive = TRUE);

INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp3, COALESCE(@pos3, NULL), 200000.00, 35000.00, 20000.00, 215000.00, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'monthly', 'Cooperative Bank', '3456789012', 'Nairobi', TRUE
WHERE @emp3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp3 AND isActive = TRUE);

INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp4, COALESCE(@pos3, NULL), 150000.00, 25000.00, 15000.00, 160000.00, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'monthly', 'Standard Chartered', '4567890123', 'Nairobi', TRUE
WHERE @emp4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp4 AND isActive = TRUE);

INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp5, COALESCE(@pos4, NULL), 80000.00, 10000.00, 8000.00, 82000.00, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'monthly', 'Absa Bank', '5678901234', 'Nairobi', TRUE
WHERE @emp5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp5 AND isActive = TRUE);

-- Get salary IDs
SET @sal1 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp1 AND isActive = TRUE LIMIT 1);
SET @sal2 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp2 AND isActive = TRUE LIMIT 1);
SET @sal3 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp3 AND isActive = TRUE LIMIT 1);
SET @sal4 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp4 AND isActive = TRUE LIMIT 1);
SET @sal5 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp5 AND isActive = TRUE LIMIT 1);

-- Insert payroll transactions for the last 6 months
-- November 2025
INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp1, @sal1, '2025-11-01', '2025-11-30', 250000.00, 50000.00, 0.00, 0.00, 25000.00, 15000.00, 1500.00, 2000.00, 6500.00, 300000.00, 275000.00,
       '2025-12-05', 'paid', 'Bank Transfer', CONCAT('TXN-NOV-2025-', @emp1)
WHERE @emp1 IS NOT NULL AND @sal1 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp2, @sal2, '2025-11-01', '2025-11-30', 180000.00, 30000.00, 5000.00, 0.00, 18000.00, 10800.00, 1080.00, 1440.00, 4680.00, 215000.00, 192000.00,
       '2025-12-05', 'paid', 'Bank Transfer', CONCAT('TXN-NOV-2025-', @emp2)
WHERE @emp2 IS NOT NULL AND @sal2 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp3, @sal3, '2025-11-01', '2025-11-30', 200000.00, 35000.00, 0.00, 10000.00, 20000.00, 12000.00, 1200.00, 1600.00, 5200.00, 245000.00, 215000.00,
       '2025-12-05', 'paid', 'Bank Transfer', CONCAT('TXN-NOV-2025-', @emp3)
WHERE @emp3 IS NOT NULL AND @sal3 IS NOT NULL;

-- December 2025
INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp1, @sal1, '2025-12-01', '2025-12-31', 250000.00, 50000.00, 0.00, 25000.00, 25000.00, 15000.00, 1500.00, 2000.00, 6500.00, 325000.00, 300000.00,
       '2026-01-05', 'paid', 'Bank Transfer', CONCAT('TXN-DEC-2025-', @emp1)
WHERE @emp1 IS NOT NULL AND @sal1 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp2, @sal2, '2025-12-01', '2025-12-31', 180000.00, 30000.00, 0.00, 0.00, 18000.00, 10800.00, 1080.00, 1440.00, 4680.00, 210000.00, 192000.00,
       '2026-01-05', 'paid', 'Bank Transfer', CONCAT('TXN-DEC-2025-', @emp2)
WHERE @emp2 IS NOT NULL AND @sal2 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp3, @sal3, '2025-12-01', '2025-12-31', 200000.00, 35000.00, 0.00, 0.00, 20000.00, 12000.00, 1200.00, 1600.00, 5200.00, 235000.00, 215000.00,
       '2026-01-05', 'paid', 'Bank Transfer', CONCAT('TXN-DEC-2025-', @emp3)
WHERE @emp3 IS NOT NULL AND @sal3 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp4, @sal4, '2025-12-01', '2025-12-31', 150000.00, 25000.00, 0.00, 0.00, 15000.00, 9000.00, 900.00, 1200.00, 3900.00, 175000.00, 160000.00,
       '2026-01-05', 'paid', 'Bank Transfer', CONCAT('TXN-DEC-2025-', @emp4)
WHERE @emp4 IS NOT NULL AND @sal4 IS NOT NULL;

-- January 2026 (Pending)
INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp1, @sal1, '2026-01-01', '2026-01-31', 250000.00, 50000.00, 0.00, 0.00, 25000.00, 15000.00, 1500.00, 2000.00, 6500.00, 300000.00, 275000.00,
       '2026-02-05', 'pending', 'Bank Transfer', NULL
WHERE @emp1 IS NOT NULL AND @sal1 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp2, @sal2, '2026-01-01', '2026-01-31', 180000.00, 30000.00, 0.00, 0.00, 18000.00, 10800.00, 1080.00, 1440.00, 4680.00, 210000.00, 192000.00,
       '2026-02-05', 'pending', 'Bank Transfer', NULL
WHERE @emp2 IS NOT NULL AND @sal2 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp3, @sal3, '2026-01-01', '2026-01-31', 200000.00, 35000.00, 0.00, 0.00, 20000.00, 12000.00, 1200.00, 1600.00, 5200.00, 235000.00, 215000.00,
       '2026-02-05', 'pending', 'Bank Transfer', NULL
WHERE @emp3 IS NOT NULL AND @sal3 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp4, @sal4, '2026-01-01', '2026-01-31', 150000.00, 25000.00, 0.00, 0.00, 15000.00, 9000.00, 900.00, 1200.00, 3900.00, 175000.00, 160000.00,
       '2026-02-05', 'pending', 'Bank Transfer', NULL
WHERE @emp4 IS NOT NULL AND @sal4 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')),
       @emp5, @sal5, '2026-01-01', '2026-01-31', 80000.00, 10000.00, 0.00, 0.00, 8000.00, 4800.00, 480.00, 640.00, 2080.00, 90000.00, 82000.00,
       '2026-02-05', 'pending', 'Bank Transfer', NULL
WHERE @emp5 IS NOT NULL AND @sal5 IS NOT NULL;

-- ============================================
-- PROMOTIONS / POSITION HISTORY
-- ============================================

-- Only insert if positions exist
INSERT IGNORE INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp1, NULL, @pos1, NULL, @dept1, 'appointment', DATE_SUB(CURDATE(), INTERVAL 24 MONTH), 'Initial appointment as Manager', 1, DATE_SUB(CURDATE(), INTERVAL 24 MONTH), 'New hire - Manager position'
WHERE @emp1 IS NOT NULL AND @pos1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_position_history WHERE employeeId = @emp1);

INSERT IGNORE INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp2, NULL, @pos2, NULL, @dept1, 'appointment', DATE_SUB(CURDATE(), INTERVAL 18 MONTH), 'Initial appointment as Senior Staff', 1, DATE_SUB(CURDATE(), INTERVAL 18 MONTH), 'New hire'
WHERE @emp2 IS NOT NULL AND @pos2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_position_history WHERE employeeId = @emp2);

INSERT IGNORE INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp2, @pos2, @pos1, @dept1, @dept1, 'promotion', DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'Promoted to Manager based on excellent performance', 1, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'Performance review - outstanding results'
WHERE @emp2 IS NOT NULL AND @pos2 IS NOT NULL AND @pos1 IS NOT NULL;

INSERT IGNORE INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp3, NULL, @pos3, NULL, @dept2, 'appointment', DATE_SUB(CURDATE(), INTERVAL 12 MONTH), 'Initial appointment as Staff', 1, DATE_SUB(CURDATE(), INTERVAL 12 MONTH), 'New hire'
WHERE @emp3 IS NOT NULL AND @pos3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_position_history WHERE employeeId = @emp3);

INSERT IGNORE INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp3, @pos3, @pos2, @dept2, @dept2, 'promotion', DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'Promoted to Senior Staff', 1, DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'Consistent high performance'
WHERE @emp3 IS NOT NULL AND @pos3 IS NOT NULL AND @pos2 IS NOT NULL;

INSERT IGNORE INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp4, NULL, @pos3, NULL, @dept1, 'appointment', DATE_SUB(CURDATE(), INTERVAL 9 MONTH), 'Initial appointment as Staff', 1, DATE_SUB(CURDATE(), INTERVAL 9 MONTH), 'New hire'
WHERE @emp4 IS NOT NULL AND @pos3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_position_history WHERE employeeId = @emp4);

INSERT IGNORE INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp5, NULL, @pos4, NULL, @dept2, 'appointment', DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'Initial appointment as Intern', 1, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'Internship program'
WHERE @emp5 IS NOT NULL AND @pos4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_position_history WHERE employeeId = @emp5);

-- ============================================
-- ATTENDANCE SAMPLE DATA
-- ============================================

-- Insert attendance records for the last 30 days
-- Generate attendance for each employee for the past month
INSERT IGNORE INTO employee_attendance (employeeId, attendanceDate, checkInTime, checkOutTime, hoursWorked, status, notes)
SELECT @emp1, DATE_SUB(CURDATE(), INTERVAL n DAY), 
       CONCAT(DATE_SUB(CURDATE(), INTERVAL n DAY), ' 08:00:00'),
       CONCAT(DATE_SUB(CURDATE(), INTERVAL n DAY), ' 17:00:00'),
       8.0, 'present', NULL
FROM (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29) as days
WHERE @emp1 IS NOT NULL AND DAYOFWEEK(DATE_SUB(CURDATE(), INTERVAL n DAY)) NOT IN (1, 7) -- Exclude weekends
LIMIT 20;

INSERT IGNORE INTO employee_attendance (employeeId, attendanceDate, checkInTime, checkOutTime, hoursWorked, status, notes)
SELECT @emp2, DATE_SUB(CURDATE(), INTERVAL n DAY), 
       CONCAT(DATE_SUB(CURDATE(), INTERVAL n DAY), ' 08:15:00'),
       CONCAT(DATE_SUB(CURDATE(), INTERVAL n DAY), ' 17:15:00'),
       8.0, 'present', NULL
FROM (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29) as days
WHERE @emp2 IS NOT NULL AND DAYOFWEEK(DATE_SUB(CURDATE(), INTERVAL n DAY)) NOT IN (1, 7)
LIMIT 20;

INSERT IGNORE INTO employee_attendance (employeeId, attendanceDate, checkInTime, checkOutTime, hoursWorked, status, notes)
SELECT @emp3, DATE_SUB(CURDATE(), INTERVAL n DAY), 
       CONCAT(DATE_SUB(CURDATE(), INTERVAL n DAY), ' 08:00:00'),
       CONCAT(DATE_SUB(CURDATE(), INTERVAL n DAY), ' 16:30:00'),
       8.0, 'present', NULL
FROM (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29) as days
WHERE @emp3 IS NOT NULL AND DAYOFWEEK(DATE_SUB(CURDATE(), INTERVAL n DAY)) NOT IN (1, 7)
LIMIT 18;

-- Add some late entries
INSERT IGNORE INTO employee_attendance (employeeId, attendanceDate, checkInTime, checkOutTime, hoursWorked, status, notes)
SELECT @emp4, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 
       CONCAT(DATE_SUB(CURDATE(), INTERVAL 5 DAY), ' 09:30:00'),
       CONCAT(DATE_SUB(CURDATE(), INTERVAL 5 DAY), ' 17:00:00'),
       7.5, 'late', 'Arrived late due to traffic'
WHERE @emp4 IS NOT NULL;

INSERT IGNORE INTO employee_attendance (employeeId, attendanceDate, checkInTime, checkOutTime, hoursWorked, status, notes)
SELECT @emp4, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 
       CONCAT(DATE_SUB(CURDATE(), INTERVAL 10 DAY), ' 08:00:00'),
       CONCAT(DATE_SUB(CURDATE(), INTERVAL 10 DAY), ' 12:00:00'),
       4.0, 'half_day', 'Left early for personal appointment'
WHERE @emp4 IS NOT NULL;

-- Add some absent records
INSERT IGNORE INTO employee_attendance (employeeId, attendanceDate, checkInTime, checkOutTime, hoursWorked, status, notes)
SELECT @emp5, DATE_SUB(CURDATE(), INTERVAL 7 DAY), 
       NULL, NULL, 0, 'absent', 'Sick leave'
WHERE @emp5 IS NOT NULL;

INSERT IGNORE INTO employee_attendance (employeeId, attendanceDate, checkInTime, checkOutTime, hoursWorked, status, notes)
SELECT @emp5, DATE_SUB(CURDATE(), INTERVAL 14 DAY), 
       NULL, NULL, 0, 'on_leave', 'Annual leave'
WHERE @emp5 IS NOT NULL;

