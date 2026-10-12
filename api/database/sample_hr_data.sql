-- Sample HR Data - Leave, Payroll, and Promotions
-- This script adds realistic sample data for HR features

-- Get employee IDs (use any existing employees)
SET @emp1 = (SELECT employeeId FROM employees LIMIT 1);
SET @emp2 = (SELECT employeeId FROM employees LIMIT 1 OFFSET 1);
SET @emp3 = (SELECT employeeId FROM employees LIMIT 1 OFFSET 2);
SET @emp4 = (SELECT employeeId FROM employees LIMIT 1 OFFSET 3);
SET @emp5 = (SELECT employeeId FROM employees LIMIT 1 OFFSET 4);

-- Get position IDs
SET @cmo_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'CMO' LIMIT 1);
SET @doc_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'DOC' LIMIT 1);
SET @spec_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'SPEC' LIMIT 1);

-- Get department IDs
SET @med_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'MED' LIMIT 1);
SET @fin_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'FIN' LIMIT 1);

-- Insert leave records
INSERT INTO employee_leave (employeeId, leaveType, startDate, endDate, daysRequested, status, requestedDate, notes) VALUES
(@emp1, 'annual', '2025-12-20', '2025-12-27', 8, 'approved', '2025-12-01', 'Year-end vacation'),
(@emp2, 'sick', '2025-12-15', '2025-12-17', 3, 'approved', '2025-12-14', 'Medical treatment'),
(@emp3, 'annual', '2026-01-10', '2026-01-20', 11, 'pending', '2025-12-10', 'Holiday leave'),
(@emp4, 'maternity', '2026-02-01', '2026-05-01', 90, 'approved', '2025-11-15', 'Maternity leave'),
(@emp5, 'annual', '2025-12-25', '2026-01-05', 12, 'pending', '2025-12-01', 'Christmas and New Year');

-- Insert salary records
INSERT INTO employee_salaries (employeeId, positionId, baseSalary, allowances, deductions, netSalary, effectiveDate, payFrequency, bankName, bankAccount, bankBranch, isActive) VALUES
(@emp1, @cmo_pos, 250000.00, 50000.00, 25000.00, 275000.00, '2020-01-15', 'monthly', 'Equity Bank', '1234567890', 'Nairobi', TRUE),
(@emp2, @doc_pos, 180000.00, 30000.00, 18000.00, 192000.00, '2020-03-10', 'monthly', 'KCB', '2345678901', 'Nairobi', TRUE),
(@emp3, @spec_pos, 200000.00, 35000.00, 20000.00, 215000.00, '2021-02-05', 'monthly', 'Cooperative Bank', '3456789012', 'Nairobi', TRUE),
(@emp4, @spec_pos, 200000.00, 35000.00, 20000.00, 215000.00, '2021-05-20', 'monthly', 'Standard Chartered', '4567890123', 'Nairobi', TRUE),
(@emp5, NULL, 150000.00, 25000.00, 15000.00, 160000.00, '2020-06-15', 'monthly', 'Absa Bank', '5678901234', 'Nairobi', TRUE);

-- Insert payroll transactions
SET @sal1 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp1 AND isActive = TRUE LIMIT 1);
SET @sal2 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp2 AND isActive = TRUE LIMIT 1);
SET @sal3 = (SELECT salaryId FROM employee_salaries WHERE employeeId = @emp3 AND isActive = TRUE LIMIT 1);

INSERT INTO payroll_transactions (payrollNumber, employeeId, salaryId, payPeriodStart, payPeriodEnd, baseSalary, allowances, overtime, bonuses, deductions, tax, nhif, nssf, otherDeductions, grossSalary, netSalary, paymentDate, paymentStatus, paymentMethod, referenceNumber) VALUES
('PAY-000001', @emp1, @sal1, '2025-11-01', '2025-11-30', 250000.00, 50000.00, 0.00, 0.00, 25000.00, 15000.00, 1500.00, 2000.00, 6500.00, 300000.00, 275000.00, '2025-12-05', 'paid', 'Bank Transfer', 'TXN-2025-001'),
('PAY-000002', @emp2, @sal2, '2025-11-01', '2025-11-30', 180000.00, 30000.00, 5000.00, 0.00, 18000.00, 10800.00, 1080.00, 1440.00, 4680.00, 215000.00, 192000.00, '2025-12-05', 'paid', 'Bank Transfer', 'TXN-2025-002'),
('PAY-000003', @emp3, @sal3, '2025-11-01', '2025-11-30', 200000.00, 35000.00, 0.00, 10000.00, 20000.00, 12000.00, 1200.00, 1600.00, 5200.00, 245000.00, 215000.00, '2025-12-05', 'paid', 'Bank Transfer', 'TXN-2025-003'),
('PAY-000004', @emp1, @sal1, '2025-12-01', '2025-12-31', 250000.00, 50000.00, 0.00, 0.00, 25000.00, 15000.00, 1500.00, 2000.00, 6500.00, 300000.00, 275000.00, '2026-01-05', 'pending', 'Bank Transfer', NULL),
('PAY-000005', @emp2, @sal2, '2025-12-01', '2025-12-31', 180000.00, 30000.00, 0.00, 0.00, 18000.00, 10800.00, 1080.00, 1440.00, 4680.00, 210000.00, 192000.00, '2026-01-05', 'pending', 'Bank Transfer', NULL);

-- Insert position history (promotions) - only if positions exist
INSERT INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp2, @doc_pos, @spec_pos, @med_dept, @med_dept, 'promotion', '2023-06-01', 'Promoted to Specialist based on performance and experience', 1, '2023-05-15', 'Excellent performance review'
WHERE @doc_pos IS NOT NULL AND @spec_pos IS NOT NULL;

INSERT INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp3, NULL, @spec_pos, NULL, @med_dept, 'appointment', '2021-02-05', 'Initial appointment as Specialist', 1, '2021-01-20', 'New hire'
WHERE @spec_pos IS NOT NULL;

INSERT INTO employee_position_history (employeeId, previousPositionId, newPositionId, previousDepartmentId, newDepartmentId, changeType, effectiveDate, reason, approvedBy, approvedDate, notes)
SELECT @emp1, NULL, @cmo_pos, NULL, @med_dept, 'appointment', '2020-01-15', 'Appointed as Chief Medical Officer', 1, '2019-12-10', 'Leadership role'
WHERE @cmo_pos IS NOT NULL;

-- Insert leave balance
INSERT INTO employee_leave_balance (employeeId, leaveType, year, allocatedDays, usedDays, balanceDays) VALUES
(@emp1, 'annual', 2025, 21, 8, 13),
(@emp1, 'sick', 2025, 10, 2, 8),
(@emp2, 'annual', 2025, 21, 3, 18),
(@emp2, 'sick', 2025, 10, 0, 10),
(@emp3, 'annual', 2025, 21, 0, 21),
(@emp3, 'sick', 2025, 10, 0, 10),
(@emp4, 'annual', 2025, 21, 0, 21),
(@emp4, 'maternity', 2025, 90, 0, 90),
(@emp5, 'annual', 2025, 21, 0, 21),
(@emp5, 'sick', 2025, 10, 0, 10);

