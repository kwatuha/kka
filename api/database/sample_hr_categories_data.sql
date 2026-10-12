-- Sample HR Data for Employee Categories
-- This script ensures employees exist in all three categories: Medical, Administrative, and Support

-- First, ensure we have departments in all categories
INSERT IGNORE INTO departments (departmentCode, departmentName, description, isActive) VALUES
-- Medical departments
('MED', 'Medical', 'Medical department', TRUE),
('CONS', 'Consultation', 'Doctor consultations', TRUE),
('NUR', 'Nursing', 'Nursing department', TRUE),
('LAB', 'Laboratory', 'Laboratory department', TRUE),
('PHAR', 'Pharmacy', 'Pharmacy department', TRUE),
('RAD', 'Radiology', 'Radiology department', TRUE),
-- Administrative departments
('ADM', 'Administration', 'Administration department', TRUE),
('FIN', 'Finance', 'Finance department', TRUE),
('HR', 'Human Resources', 'HR department', TRUE),
('MREC', 'Medical Records', 'Medical Records department', TRUE),
-- Support departments
('IT', 'Information Technology', 'IT department', TRUE),
('PROC', 'Procurement', 'Procurement department', TRUE),
('REG', 'Registration', 'Registration department', TRUE);

-- Get department IDs
SET @med_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'MED' OR departmentName = 'Medical' LIMIT 1);
SET @cons_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'CONS' OR departmentName = 'Consultation' LIMIT 1);
SET @nur_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'NUR' OR departmentName = 'Nursing' LIMIT 1);
SET @lab_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'LAB' OR departmentName = 'Laboratory' LIMIT 1);
SET @phar_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'PHAR' OR departmentName = 'Pharmacy' LIMIT 1);
SET @rad_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'RAD' OR departmentName = 'Radiology' LIMIT 1);
SET @adm_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'ADM' OR departmentName = 'Administration' LIMIT 1);
SET @fin_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'FIN' OR departmentName = 'Finance' LIMIT 1);
SET @hr_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'HR' OR departmentName = 'Human Resources' LIMIT 1);
SET @mrec_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'MREC' OR departmentName = 'Medical Records' LIMIT 1);
SET @it_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'IT' OR departmentName = 'Information Technology' LIMIT 1);
SET @proc_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'PROC' OR departmentName = 'Procurement' LIMIT 1);
SET @reg_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'REG' OR departmentName = 'Registration' LIMIT 1);

-- Create positions for each category
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, isActive) VALUES
-- Medical positions
('CMO', 'Chief Medical Officer', @med_dept, TRUE),
('DOC', 'Doctor', @cons_dept, TRUE),
('SPEC', 'Specialist', @cons_dept, TRUE),
('NUR', 'Nurse', @nur_dept, TRUE),
('LAB_TECH', 'Laboratory Technician', @lab_dept, TRUE),
('PHAR_TECH', 'Pharmacy Technician', @phar_dept, TRUE),
('RAD_TECH', 'Radiology Technician', @rad_dept, TRUE),
-- Administrative positions
('ADM_MGR', 'Administration Manager', @adm_dept, TRUE),
('FIN_MGR', 'Finance Manager', @fin_dept, TRUE),
('HR_MGR', 'HR Manager', @hr_dept, TRUE),
('MREC_CLK', 'Medical Records Clerk', @mrec_dept, TRUE),
-- Support positions
('IT_MGR', 'IT Manager', @it_dept, TRUE),
('IT_TECH', 'IT Technician', @it_dept, TRUE),
('PROC_OFF', 'Procurement Officer', @proc_dept, TRUE),
('REG_CLK', 'Registration Clerk', @reg_dept, TRUE);

-- Get position IDs
SET @cmo_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'CMO' LIMIT 1);
SET @doc_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'DOC' LIMIT 1);
SET @spec_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'SPEC' LIMIT 1);
SET @nur_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'NUR' LIMIT 1);
SET @lab_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'LAB_TECH' LIMIT 1);
SET @phar_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'PHAR_TECH' LIMIT 1);
SET @rad_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'RAD_TECH' LIMIT 1);
SET @adm_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'ADM_MGR' LIMIT 1);
SET @fin_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'FIN_MGR' LIMIT 1);
SET @hr_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'HR_MGR' LIMIT 1);
SET @mrec_clk_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'MREC_CLK' LIMIT 1);
SET @it_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'IT_MGR' LIMIT 1);
SET @it_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'IT_TECH' LIMIT 1);
SET @proc_off_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'PROC_OFF' LIMIT 1);
SET @reg_clk_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'REG_CLK' LIMIT 1);

-- Insert employees in MEDICAL category
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
-- Medical Department
('EMP-MED-001', 'James', 'Ndiwa', NULL, '1980-05-15', 'Male', '+254 712 345 678', 'james.ndiwa@transelgon.co.ke', 'Nairobi, Kenya', '12345678', '2020-01-15', 'full_time', @med_dept, @cmo_pos, 'active', 'Mary Ndiwa', '+254 723 456 789', 'Chief Medical Officer'),
-- Consultation Department
('EMP-CONS-001', 'Sarah', 'Isuvi', NULL, '1985-03-20', 'Female', '+254 723 456 789', 'sarah.isuvi@transelgon.co.ke', 'Nairobi, Kenya', '23456789', '2020-03-10', 'full_time', @cons_dept, @doc_pos, 'active', 'John Isuvi', '+254 734 567 890', 'Senior Doctor'),
('EMP-CONS-002', 'Michael', 'Siva', NULL, '1988-07-12', 'Male', '+254 734 567 890', 'michael.siva@transelgon.co.ke', 'Nairobi, Kenya', '34567890', '2021-02-05', 'full_time', @cons_dept, @spec_pos, 'active', 'Jane Siva', '+254 745 678 901', 'Cardiologist Specialist'),
('EMP-CONS-003', 'Emily', 'Logovane', NULL, '1990-11-25', 'Female', '+254 745 678 901', 'emily.logovane@transelgon.co.ke', 'Nairobi, Kenya', '45678901', '2021-05-20', 'full_time', @cons_dept, @spec_pos, 'active', 'David Logovane', '+254 756 789 012', 'Pediatric Specialist'),
-- Nursing Department
('EMP-NUR-001', 'Mary', 'Wanjiku', NULL, '1992-06-22', 'Female', '+254 789 012 345', 'mary.wanjiku@transelgon.co.ke', 'Nairobi, Kenya', '89012345', '2021-08-15', 'full_time', @nur_dept, @nur_pos, 'active', 'James Wanjiku', '+254 790 123 456', 'Registered Nurse'),
('EMP-NUR-002', 'Ruth', 'Achieng', NULL, '1993-01-17', 'Female', '+254 723 456 790', 'ruth.achieng@transelgon.co.ke', 'Nairobi, Kenya', '23456790', '2022-01-05', 'full_time', @nur_dept, @nur_pos, 'active', 'David Achieng', '+254 734 567 891', 'Nurse'),
-- Laboratory Department
('EMP-LAB-001', 'John', 'Kamau', NULL, '1989-10-05', 'Male', '+254 790 123 456', 'john.kamau@transelgon.co.ke', 'Nairobi, Kenya', '90123456', '2021-09-01', 'full_time', @lab_dept, @lab_tech_pos, 'active', 'Ann Kamau', '+254 701 234 567', 'Laboratory Technician'),
('EMP-LAB-002', 'Joseph', 'Kipchoge', NULL, '1990-12-03', 'Male', '+254 756 789 013', 'joseph.kipchoge@transelgon.co.ke', 'Nairobi, Kenya', '56789013', '2022-02-10', 'contract', @lab_dept, @lab_tech_pos, 'active', 'Faith Kipchoge', '+254 767 890 124', 'Contract Laboratory Technician'),
-- Pharmacy Department
('EMP-PHAR-001', 'Ann', 'Njeri', NULL, '1991-02-14', 'Female', '+254 701 234 567', 'ann.njeri@transelgon.co.ke', 'Nairobi, Kenya', '01234567', '2021-10-20', 'full_time', @phar_dept, @phar_tech_pos, 'active', 'Paul Njeri', '+254 712 345 678', 'Pharmacy Technician'),
-- Radiology Department
('EMP-RAD-001', 'David', 'Ochieng', NULL, '1986-08-30', 'Male', '+254 712 345 679', 'david.ochieng@transelgon.co.ke', 'Nairobi, Kenya', '12345679', '2020-11-12', 'full_time', @rad_dept, @rad_tech_pos, 'active', 'Ruth Ochieng', '+254 723 456 790', 'Radiology Technician');

-- Insert employees in ADMINISTRATIVE category
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
-- Administration Department
('EMP-ADM-001', 'Paul', 'Mwangi', NULL, '1984-03-25', 'Male', '+254 734 567 891', 'paul.mwangi@transelgon.co.ke', 'Nairobi, Kenya', '34567891', '2020-04-20', 'full_time', @adm_dept, @adm_mgr_pos, 'active', 'Esther Mwangi', '+254 745 678 902', 'Administration Manager'),
-- Finance Department
('EMP-FIN-001', 'Daniel', 'Mirenja', NULL, '1982-09-08', 'Male', '+254 756 789 012', 'daniel.mirenja@transelgon.co.ke', 'Nairobi, Kenya', '56789012', '2020-06-15', 'full_time', @fin_dept, @fin_mgr_pos, 'active', 'Susan Mirenja', '+254 767 890 123', 'Finance Manager'),
('EMP-FIN-002', 'Lucy', 'Wanjala', NULL, '1987-04-12', 'Female', '+254 767 890 124', 'lucy.wanjala@transelgon.co.ke', 'Nairobi, Kenya', '67890124', '2021-07-01', 'full_time', @fin_dept, NULL, 'active', 'Peter Wanjala', '+254 778 901 235', 'Finance Officer'),
-- Human Resources Department
('EMP-HR-001', 'Grace', 'Savai', NULL, '1987-12-30', 'Female', '+254 767 890 123', 'grace.savai@transelgon.co.ke', 'Nairobi, Kenya', '67890123', '2020-08-01', 'full_time', @hr_dept, @hr_mgr_pos, 'active', 'Peter Savai', '+254 778 901 234', 'HR Manager'),
('EMP-HR-002', 'Esther', 'Wambui', NULL, '1988-07-08', 'Female', '+254 745 678 902', 'esther.wambui@transelgon.co.ke', 'Nairobi, Kenya', '45678902', '2021-03-15', 'full_time', @hr_dept, NULL, 'active', 'Joseph Wambui', '+254 756 789 013', 'HR Officer'),
-- Medical Records Department
('EMP-MREC-001', 'Faith', 'Kipchoge', NULL, '1992-05-20', 'Female', '+254 778 901 235', 'faith.kipchoge@transelgon.co.ke', 'Nairobi, Kenya', '78901235', '2021-11-10', 'full_time', @mrec_dept, @mrec_clk_pos, 'active', 'Joseph Kipchoge', '+254 789 012 346', 'Medical Records Clerk');

-- Insert employees in SUPPORT category
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
-- Information Technology Department
('EMP-IT-001', 'Peter', 'Livambula', NULL, '1985-04-18', 'Male', '+254 778 901 234', 'peter.livambula@transelgon.co.ke', 'Nairobi, Kenya', '78901234', '2021-01-10', 'full_time', @it_dept, @it_mgr_pos, 'active', 'Lucy Livambula', '+254 789 012 345', 'IT Manager'),
('EMP-IT-002', 'Brian', 'Omondi', NULL, '1991-08-15', 'Male', '+254 789 012 346', 'brian.omondi@transelgon.co.ke', 'Nairobi, Kenya', '89012346', '2022-03-01', 'full_time', @it_dept, @it_tech_pos, 'active', 'Sarah Omondi', '+254 790 123 457', 'IT Technician'),
-- Procurement Department
('EMP-PROC-001', 'Susan', 'Muthoni', NULL, '1989-06-30', 'Female', '+254 790 123 457', 'susan.muthoni@transelgon.co.ke', 'Nairobi, Kenya', '90123457', '2021-12-05', 'full_time', @proc_dept, @proc_off_pos, 'active', 'James Muthoni', '+254 701 234 568', 'Procurement Officer'),
-- Registration Department
('EMP-REG-001', 'Kevin', 'Mutua', NULL, '1993-03-10', 'Male', '+254 701 234 568', 'kevin.mutua@transelgon.co.ke', 'Nairobi, Kenya', '01234568', '2022-04-15', 'full_time', @reg_dept, @reg_clk_pos, 'active', 'Grace Mutua', '+254 712 345 680', 'Registration Clerk'),
('EMP-REG-002', 'Patricia', 'Njoroge', NULL, '1994-09-22', 'Female', '+254 712 345 680', 'patricia.njoroge@transelgon.co.ke', 'Nairobi, Kenya', '12345680', '2022-05-20', 'full_time', @reg_dept, @reg_clk_pos, 'active', 'John Njoroge', '+254 723 456 791', 'Registration Clerk');

