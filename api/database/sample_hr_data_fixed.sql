-- Sample HR Data - Leave, Payroll, and Promotions (Fixed Version)
-- This script adds realistic sample data for HR features
-- Uses INSERT IGNORE to avoid duplicate errors

-- Clear existing sample data (optional - comment out if you want to keep existing data)
-- DELETE FROM employee_leave_balance;
-- DELETE FROM employee_position_history;
-- DELETE FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%';
-- DELETE FROM employee_salaries WHERE bankAccount LIKE '%7890%' OR bankAccount LIKE '%8901%';
-- DELETE FROM employee_leave WHERE notes LIKE '%vacation%' OR notes LIKE '%Holiday%' OR notes LIKE '%Christmas%';

-- Get employee IDs (use first 5 employees)
SET @emp1 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1);
SET @emp2 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1 OFFSET 1);
SET @emp3 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1 OFFSET 2);
SET @emp4 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1 OFFSET 3);
SET @emp5 = (SELECT employeeId FROM employees ORDER BY employeeId LIMIT 1 OFFSET 4);

-- Get any position IDs (use first available)
SET @pos1 = (SELECT positionId FROM employee_positions LIMIT 1);
SET @pos2 = (SELECT positionId FROM employee_positions LIMIT 1 OFFSET 1);
SET @pos3 = (SELECT positionId FROM employee_positions LIMIT 1 OFFSET 2);

-- Get department IDs
SET @dept1 = (SELECT departmentId FROM departments LIMIT 1);
SET @dept2 = (SELECT departmentId FROM departments LIMIT 1 OFFSET 1);

-- Only proceed if we have employees
INSERT IGNORE INTO employee_leave (employeeId, leaveType, startDate, endDate, daysRequested, status, requestedDate, notes)
SELECT @emp1, 'annual', '2025-12-20', '2025-12-27', 8, 'approved', '2025-12-01', 'Year-end vacation'
WHERE @emp1 IS NOT NULL;

INSERT IGNORE INTO employee_leave (employeeId, leaveType, startDate, endDate, daysRequested, status, requestedDate, notes)
SELECT @emp2, 'sick', '2025-12-15', '2025-12-17', 3, 'approved', '2025-12-14', 'Medical treatment'
WHERE @emp2 IS NOT NULL;

INSERT IGNORE INTO employee_leave (employeeId, leaveType, startDate, endDate, daysRequested, status, requestedDate, notes)
SELECT @emp3, 'annual', '2026-01-10', '2026-01-20', 11, 'pending', '2025-12-10', 'Holiday leave'
WHERE @emp3 IS NOT NULL;

INSERT IGNORE INTO employee_leave (employeeId, leaveType, startDate, endDate, daysRequested, status, requestedDate, notes)
SELECT @emp4, 'maternity', '2026-02-01', '2026-05-01', 90, 'approved', '2025-11-15', 'Maternity leave'
WHERE @emp4 IS NOT NULL;

INSERT IGNORE INTO employee_leave (employeeId, leaveType, startDate, endDate, daysRequested, status, requestedDate, notes)
SELECT @emp5, 'annual', '2025-12-25', '2026-01-05', 12, 'pending', '2025-12-01', 'Christmas and New Year'
WHERE @emp5 IS NOT NULL;

-- Insert salary records (only if employee doesn't have an active salary)
INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp1, @pos1, 250000.00, 50000.00, 25000.00, 275000.00, CURDATE(), 'monthly', 'Equity Bank', '1234567890', 'Nairobi', TRUE
WHERE @emp1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp1 AND isActive = TRUE);

INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp2, @pos2, 180000.00, 30000.00, 18000.00, 192000.00, CURDATE(), 'monthly', 'KCB', '2345678901', 'Nairobi', TRUE
WHERE @emp2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp2 AND isActive = TRUE);

INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp3, @pos3, 200000.00, 35000.00, 20000.00, 215000.00, CURDATE(), 'monthly', 'Cooperative Bank', '3456789012', 'Nairobi', TRUE
WHERE @emp3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp3 AND isActive = TRUE);

INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp4, @pos1, 200000.00, 35000.00, 20000.00, 215000.00, CURDATE(), 'monthly', 'Standard Chartered', '4567890123', 'Nairobi', TRUE
WHERE @emp4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp4 AND isActive = TRUE);

INSERT IGNORE INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive)
SELECT @emp5, @pos2, 150000.00, 25000.00, 15000.00, 160000.00, CURDATE(), 'monthly', 'Absa Bank', '5678901234', 'Nairobi', TRUE
WHERE @emp5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employee_salaries WHERE employeeId = @emp5 AND isActive = TRUE);

-- Get salary IDs for payroll
SET @sal1 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp1 AND isActive = TRUE LIMIT 1);
SET @sal2 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp2 AND isActive = TRUE LIMIT 1);
SET @sal3 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp3 AND isActive = TRUE LIMIT 1);

-- Insert payroll transactions (generate unique payroll numbers)
INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')), 
       @emp1, @sal1, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)), 
       250000.00, 50000.00, 0.00, 0.00, 25000.00, 15000.00, 1500.00, 2000.00, 6500.00, 300000.00, 275000.00, 
       CURDATE(), 'paid', 'Bank Transfer', CONCAT('TXN-', DATE_FORMAT(CURDATE(), '%Y-%m-%d'), '-001')
WHERE @emp1 IS NOT NULL AND @sal1 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')), 
       @emp2, @sal2, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)), 
       180000.00, 30000.00, 5000.00, 0.00, 18000.00, 10800.00, 1080.00, 1440.00, 4680.00, 215000.00, 192000.00, 
       CURDATE(), 'paid', 'Bank Transfer', CONCAT('TXN-', DATE_FORMAT(CURDATE(), '%Y-%m-%d'), '-002')
WHERE @emp2 IS NOT NULL AND @sal2 IS NOT NULL;

INSERT IGNORE INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber)
SELECT CONCAT('PAY-', LPAD(COALESCE((SELECT MAX(CAST(SUBSTRING(payrollNumber, 5) AS UNSIGNED)) FROM payroll_transactions WHERE payrollNumber LIKE 'PAY-%'), 0) + 1, 6, '0')), 
       @emp3, @sal3, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)), 
       200000.00, 35000.00, 0.00, 10000.00, 20000.00, 12000.00, 1200.00, 1600.00, 5200.00, 245000.00, 215000.00, 
       CURDATE(), 'paid', 'Bank Transfer', CONCAT('TXN-', DATE_FORMAT(CURDATE(), '%Y-%m-%d'), '-003')
WHERE @emp3 IS NOT NULL AND @sal3 IS NOT NULL;

-- Insert position history (promotions) - only if we have positions
INSERT IGNORE INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp2, NULL, @pos1, @dept1, @dept1, 'promotion', DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'Promoted based on performance and experience', 1, DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'Excellent performance review'
WHERE @emp2 IS NOT NULL AND @pos1 IS NOT NULL;

INSERT IGNORE INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp3, NULL, @pos2, @dept2, @dept2, 'appointment', DATE_SUB(CURDATE(), INTERVAL 12 MONTH), 'Initial appointment', 1, DATE_SUB(CURDATE(), INTERVAL 12 MONTH), 'New hire'
WHERE @emp3 IS NOT NULL AND @pos2 IS NOT NULL;

-- Insert leave balance
INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp1, 'annual', YEAR(CURDATE()), 21, 8, 13
WHERE @emp1 IS NOT NULL;

INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp1, 'sick', YEAR(CURDATE()), 10, 2, 8
WHERE @emp1 IS NOT NULL;

INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp2, 'annual', YEAR(CURDATE()), 21, 3, 18
WHERE @emp2 IS NOT NULL;

INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp2, 'sick', YEAR(CURDATE()), 10, 0, 10
WHERE @emp2 IS NOT NULL;

INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp3, 'annual', YEAR(CURDATE()), 21, 0, 21
WHERE @emp3 IS NOT NULL;

INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp3, 'sick', YEAR(CURDATE()), 10, 0, 10
WHERE @emp3 IS NOT NULL;

INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp4, 'annual', YEAR(CURDATE()), 21, 0, 21
WHERE @emp4 IS NOT NULL;

INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp4, 'maternity', YEAR(CURDATE()), 90, 0, 90
WHERE @emp4 IS NOT NULL;

INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp5, 'annual', YEAR(CURDATE()), 21, 0, 21
WHERE @emp5 IS NOT NULL;

INSERT IGNORE INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays)
SELECT @emp5, 'sick', YEAR(CURDATE()), 10, 0, 10
WHERE @emp5 IS NOT NULL;

