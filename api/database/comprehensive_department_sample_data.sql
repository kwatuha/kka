-- Comprehensive Department Sample Data
-- This script ensures all departments have employees and positions
-- It uses the actual department IDs from the database

-- ============================================
-- STEP 1: Get Department IDs
-- ============================================
SET @reg_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Registration' LIMIT 1);
SET @cons_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Consultation' LIMIT 1);
SET @lab_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Laboratory' LIMIT 1);
SET @phar_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Pharmacy' LIMIT 1);
SET @rad_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Radiology' LIMIT 1);
SET @nur_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Nursing' LIMIT 1);
SET @mrec_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Medical Records' LIMIT 1);
SET @adm_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Administration' LIMIT 1);
SET @fin_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Finance' LIMIT 1);
SET @hr_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Human Resources' LIMIT 1);
SET @proc_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Procurement' LIMIT 1);
SET @inpatient_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Inpatient' LIMIT 1);
SET @icu_dept = (SELECT departmentId FROM departments WHERE departmentName = 'ICU' LIMIT 1);
SET @maternity_dept = (SELECT departmentId FROM departments WHERE departmentName = 'Maternity' LIMIT 1);

-- ============================================
-- STEP 2: Create Positions for Each Department
-- ============================================
-- Registration Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('REG_CLK', 'Registration Clerk', @reg_dept, 'Patient registration and data entry', TRUE),
('REG_SUP', 'Registration Supervisor', @reg_dept, 'Supervise registration operations', TRUE);

-- Consultation Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('CONS_DOC', 'Consultant Doctor', @cons_dept, 'Medical consultations and patient care', TRUE),
('CONS_SPEC', 'Specialist Doctor', @cons_dept, 'Specialized medical consultations', TRUE),
('CONS_RES', 'Resident Doctor', @cons_dept, 'Junior doctor in training', TRUE);

-- Laboratory Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('LAB_TECH', 'Laboratory Technician', @lab_dept, 'Perform laboratory tests and analysis', TRUE),
('LAB_SUP', 'Laboratory Supervisor', @lab_dept, 'Supervise laboratory operations', TRUE),
('LAB_MGR', 'Laboratory Manager', @lab_dept, 'Manage laboratory department', TRUE);

-- Pharmacy Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('PHAR_PHARM', 'Pharmacist', @phar_dept, 'Dispense medications and provide pharmaceutical care', TRUE),
('PHAR_TECH', 'Pharmacy Technician', @phar_dept, 'Assist pharmacist in dispensing medications', TRUE),
('PHAR_MGR', 'Pharmacy Manager', @phar_dept, 'Manage pharmacy operations', TRUE);

-- Radiology Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('RAD_TECH', 'Radiology Technician', @rad_dept, 'Perform imaging procedures', TRUE),
('RAD_RAD', 'Radiologist', @rad_dept, 'Interpret imaging studies', TRUE),
('RAD_SUP', 'Radiology Supervisor', @rad_dept, 'Supervise radiology operations', TRUE);

-- Nursing Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('NUR_RN', 'Registered Nurse', @nur_dept, 'Provide nursing care to patients', TRUE),
('NUR_SRN', 'Senior Registered Nurse', @nur_dept, 'Senior nursing position with supervisory duties', TRUE),
('NUR_CN', 'Charge Nurse', @nur_dept, 'Supervise nursing unit', TRUE);

-- Medical Records Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('MREC_CLK', 'Medical Records Clerk', @mrec_dept, 'Manage and organize medical records', TRUE),
('MREC_MGR', 'Medical Records Manager', @mrec_dept, 'Manage medical records department', TRUE);

-- Administration Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('ADM_MGR', 'Administration Manager', @adm_dept, 'Manage administrative operations', TRUE),
('ADM_OFF', 'Administrative Officer', @adm_dept, 'Handle administrative tasks', TRUE),
('ADM_SEC', 'Administrative Secretary', @adm_dept, 'Provide secretarial support', TRUE);

-- Finance Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('FIN_MGR', 'Finance Manager', @fin_dept, 'Manage financial operations', TRUE),
('FIN_ACC', 'Accountant', @fin_dept, 'Handle accounting and financial records', TRUE),
('FIN_CLK', 'Finance Clerk', @fin_dept, 'Assist with financial operations', TRUE);

-- Human Resources Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('HR_MGR', 'HR Manager', @hr_dept, 'Manage human resources operations', TRUE),
('HR_OFF', 'HR Officer', @hr_dept, 'Handle HR tasks and employee relations', TRUE),
('HR_REC', 'HR Recruiter', @hr_dept, 'Recruit and hire new employees', TRUE);

-- Procurement Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('PROC_MGR', 'Procurement Manager', @proc_dept, 'Manage procurement operations', TRUE),
('PROC_OFF', 'Procurement Officer', @proc_dept, 'Handle procurement and purchasing', TRUE),
('PROC_CLK', 'Procurement Clerk', @proc_dept, 'Assist with procurement tasks', TRUE);

-- Inpatient Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('INP_NUR', 'Inpatient Nurse', @inpatient_dept, 'Provide nursing care to inpatients', TRUE),
('INP_DOC', 'Inpatient Doctor', @inpatient_dept, 'Provide medical care to inpatients', TRUE);

-- ICU Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('ICU_NUR', 'ICU Nurse', @icu_dept, 'Provide critical care nursing', TRUE),
('ICU_DOC', 'ICU Doctor', @icu_dept, 'Provide critical care medicine', TRUE),
('ICU_TECH', 'ICU Technician', @icu_dept, 'Operate and maintain ICU equipment', TRUE);

-- Maternity Department Positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, jobDescription, isActive) VALUES
('MAT_MID', 'Midwife', @maternity_dept, 'Provide maternity and delivery care', TRUE),
('MAT_DOC', 'Obstetrician', @maternity_dept, 'Provide obstetric and gynecological care', TRUE),
('MAT_NUR', 'Maternity Nurse', @maternity_dept, 'Provide nursing care in maternity ward', TRUE);

-- ============================================
-- STEP 3: Get Position IDs
-- ============================================
SET @reg_clk_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'REG_CLK' LIMIT 1);
SET @reg_sup_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'REG_SUP' LIMIT 1);
SET @cons_doc_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'CONS_DOC' LIMIT 1);
SET @cons_spec_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'CONS_SPEC' LIMIT 1);
SET @cons_res_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'CONS_RES' LIMIT 1);
SET @lab_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'LAB_TECH' LIMIT 1);
SET @lab_sup_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'LAB_SUP' LIMIT 1);
SET @lab_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'LAB_MGR' LIMIT 1);
SET @phar_pharm_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'PHAR_PHARM' LIMIT 1);
SET @phar_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'PHAR_TECH' LIMIT 1);
SET @phar_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'PHAR_MGR' LIMIT 1);
SET @rad_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'RAD_TECH' LIMIT 1);
SET @rad_rad_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'RAD_RAD' LIMIT 1);
SET @rad_sup_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'RAD_SUP' LIMIT 1);
SET @nur_rn_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'NUR_RN' LIMIT 1);
SET @nur_srn_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'NUR_SRN' LIMIT 1);
SET @nur_cn_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'NUR_CN' LIMIT 1);
SET @mrec_clk_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'MREC_CLK' LIMIT 1);
SET @mrec_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'MREC_MGR' LIMIT 1);
SET @adm_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'ADM_MGR' LIMIT 1);
SET @adm_off_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'ADM_OFF' LIMIT 1);
SET @adm_sec_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'ADM_SEC' LIMIT 1);
SET @fin_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'FIN_MGR' LIMIT 1);
SET @fin_acc_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'FIN_ACC' LIMIT 1);
SET @fin_clk_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'FIN_CLK' LIMIT 1);
SET @hr_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'HR_MGR' LIMIT 1);
SET @hr_off_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'HR_OFF' LIMIT 1);
SET @hr_rec_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'HR_REC' LIMIT 1);
SET @proc_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'PROC_MGR' LIMIT 1);
SET @proc_off_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'PROC_OFF' LIMIT 1);
SET @proc_clk_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'PROC_CLK' LIMIT 1);
SET @inp_nur_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'INP_NUR' LIMIT 1);
SET @inp_doc_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'INP_DOC' LIMIT 1);
SET @icu_nur_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'ICU_NUR' LIMIT 1);
SET @icu_doc_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'ICU_DOC' LIMIT 1);
SET @icu_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'ICU_TECH' LIMIT 1);
SET @mat_mid_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'MAT_MID' LIMIT 1);
SET @mat_doc_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'MAT_DOC' LIMIT 1);
SET @mat_nur_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'MAT_NUR' LIMIT 1);

-- ============================================
-- STEP 4: Insert Employees for Each Department
-- ============================================

-- Registration Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-REG-001', 'Kevin', 'Mutua', NULL, '1993-03-10', 'Male', '+254 701 234 568', 'kevin.mutua@transelgon.co.ke', 'Nairobi, Kenya', '01234568', '2022-04-15', 'full_time', @reg_dept, @reg_clk_pos, 'active', 'Grace Mutua', '+254 712 345 680', 'Registration Clerk'),
('EMP-REG-002', 'Patricia', 'Njoroge', NULL, '1994-09-22', 'Female', '+254 712 345 680', 'patricia.njoroge@transelgon.co.ke', 'Nairobi, Kenya', '12345680', '2022-05-20', 'full_time', @reg_dept, @reg_clk_pos, 'active', 'John Njoroge', '+254 723 456 791', 'Registration Clerk'),
('EMP-REG-003', 'Brian', 'Kipchoge', NULL, '1992-11-15', 'Male', '+254 723 456 791', 'brian.kipchoge@transelgon.co.ke', 'Nairobi, Kenya', '23456791', '2021-08-10', 'full_time', @reg_dept, @reg_sup_pos, 'active', 'Mary Kipchoge', '+254 734 567 892', 'Registration Supervisor');

-- Consultation Department Employees (add more if needed)
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-CONS-004', 'Dr. Peter', 'Omondi', NULL, '1983-05-20', 'Male', '+254 734 567 892', 'peter.omondi@transelgon.co.ke', 'Nairobi, Kenya', '34567892', '2020-09-01', 'full_time', @cons_dept, @cons_spec_pos, 'active', 'Jane Omondi', '+254 745 678 903', 'Cardiologist'),
('EMP-CONS-005', 'Dr. Anne', 'Wanjala', NULL, '1986-08-14', 'Female', '+254 745 678 903', 'anne.wanjala@transelgon.co.ke', 'Nairobi, Kenya', '45678903', '2021-01-15', 'full_time', @cons_dept, @cons_spec_pos, 'active', 'James Wanjala', '+254 756 789 014', 'Pediatrician');

-- Laboratory Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-LAB-003', 'Joseph', 'Kipchoge', NULL, '1990-12-03', 'Male', '+254 756 789 013', 'joseph.kipchoge@transelgon.co.ke', 'Nairobi, Kenya', '56789013', '2022-02-10', 'contract', @lab_dept, @lab_tech_pos, 'active', 'Faith Kipchoge', '+254 767 890 124', 'Contract Laboratory Technician'),
('EMP-LAB-004', 'Ruth', 'Achieng', NULL, '1988-07-22', 'Female', '+254 767 890 124', 'ruth.achieng@transelgon.co.ke', 'Nairobi, Kenya', '67890124', '2021-06-01', 'full_time', @lab_dept, @lab_sup_pos, 'active', 'David Achieng', '+254 778 901 235', 'Laboratory Supervisor'),
('EMP-LAB-005', 'James', 'Mwangi', NULL, '1985-03-15', 'Male', '+254 778 901 235', 'james.mwangi@transelgon.co.ke', 'Nairobi, Kenya', '78901235', '2020-02-20', 'full_time', @lab_dept, @lab_mgr_pos, 'active', 'Mary Mwangi', '+254 789 012 346', 'Laboratory Manager');

-- Pharmacy Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-PHAR-002', 'Susan', 'Kamau', NULL, '1989-04-18', 'Female', '+254 789 012 346', 'susan.kamau@transelgon.co.ke', 'Nairobi, Kenya', '89012346', '2021-03-10', 'full_time', @phar_dept, @phar_pharm_pos, 'active', 'John Kamau', '+254 790 123 457', 'Pharmacist'),
('EMP-PHAR-003', 'Michael', 'Ochieng', NULL, '1987-09-25', 'Male', '+254 790 123 457', 'michael.ochieng@transelgon.co.ke', 'Nairobi, Kenya', '90123457', '2020-11-05', 'full_time', @phar_dept, @phar_mgr_pos, 'active', 'Lucy Ochieng', '+254 701 234 568', 'Pharmacy Manager');

-- Radiology Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-RAD-002', 'Dr. Sarah', 'Njeri', NULL, '1984-06-12', 'Female', '+254 701 234 568', 'sarah.njeri@transelgon.co.ke', 'Nairobi, Kenya', '01234568', '2020-05-15', 'full_time', @rad_dept, @rad_rad_pos, 'active', 'Peter Njeri', '+254 712 345 679', 'Radiologist'),
('EMP-RAD-003', 'Paul', 'Wanjala', NULL, '1989-10-08', 'Male', '+254 712 345 679', 'paul.wanjala@transelgon.co.ke', 'Nairobi, Kenya', '12345679', '2021-07-20', 'full_time', @rad_dept, @rad_sup_pos, 'active', 'Esther Wanjala', '+254 723 456 790', 'Radiology Supervisor');

-- Nursing Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-NUR-003', 'Ruth', 'Achieng', NULL, '1993-01-17', 'Female', '+254 723 456 790', 'ruth.achieng@transelgon.co.ke', 'Nairobi, Kenya', '23456790', '2022-01-05', 'full_time', @nur_dept, @nur_rn_pos, 'active', 'David Achieng', '+254 734 567 891', 'Registered Nurse'),
('EMP-NUR-004', 'Esther', 'Mwangi', NULL, '1991-05-30', 'Female', '+254 734 567 891', 'esther.mwangi@transelgon.co.ke', 'Nairobi, Kenya', '34567891', '2021-09-12', 'full_time', @nur_dept, @nur_srn_pos, 'active', 'James Mwangi', '+254 745 678 902', 'Senior Registered Nurse'),
('EMP-NUR-005', 'Grace', 'Ochieng', NULL, '1989-08-22', 'Female', '+254 745 678 902', 'grace.ochieng@transelgon.co.ke', 'Nairobi, Kenya', '45678902', '2020-12-01', 'full_time', @nur_dept, @nur_cn_pos, 'active', 'Peter Ochieng', '+254 756 789 013', 'Charge Nurse');

-- Medical Records Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-MREC-002', 'Faith', 'Kipchoge', NULL, '1992-05-20', 'Female', '+254 756 789 013', 'faith.kipchoge@transelgon.co.ke', 'Nairobi, Kenya', '56789013', '2021-11-10', 'full_time', @mrec_dept, @mrec_clk_pos, 'active', 'Joseph Kipchoge', '+254 767 890 124', 'Medical Records Clerk'),
('EMP-MREC-003', 'Daniel', 'Mwangi', NULL, '1987-12-05', 'Male', '+254 767 890 124', 'daniel.mwangi@transelgon.co.ke', 'Nairobi, Kenya', '67890124', '2020-07-20', 'full_time', @mrec_dept, @mrec_mgr_pos, 'active', 'Mary Mwangi', '+254 778 901 235', 'Medical Records Manager');

-- Administration Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-ADM-002', 'Paul', 'Mwangi', NULL, '1984-03-25', 'Male', '+254 778 901 235', 'paul.mwangi@transelgon.co.ke', 'Nairobi, Kenya', '78901235', '2020-04-20', 'full_time', @adm_dept, @adm_mgr_pos, 'active', 'Esther Mwangi', '+254 789 012 346', 'Administration Manager'),
('EMP-ADM-003', 'Lucy', 'Njeri', NULL, '1990-07-18', 'Female', '+254 789 012 346', 'lucy.njeri@transelgon.co.ke', 'Nairobi, Kenya', '89012346', '2021-05-10', 'full_time', @adm_dept, @adm_off_pos, 'active', 'John Njeri', '+254 790 123 457', 'Administrative Officer'),
('EMP-ADM-004', 'Peter', 'Kamau', NULL, '1992-11-30', 'Male', '+254 790 123 457', 'peter.kamau@transelgon.co.ke', 'Nairobi, Kenya', '90123457', '2022-02-15', 'full_time', @adm_dept, @adm_sec_pos, 'active', 'Mary Kamau', '+254 701 234 568', 'Administrative Secretary');

-- Finance Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-FIN-003', 'Daniel', 'Mirenja', NULL, '1982-09-08', 'Male', '+254 701 234 568', 'daniel.mirenja@transelgon.co.ke', 'Nairobi, Kenya', '01234568', '2020-06-15', 'full_time', @fin_dept, @fin_mgr_pos, 'active', 'Susan Mirenja', '+254 712 345 679', 'Finance Manager'),
('EMP-FIN-004', 'Lucy', 'Wanjala', NULL, '1987-04-12', 'Female', '+254 712 345 679', 'lucy.wanjala@transelgon.co.ke', 'Nairobi, Kenya', '12345679', '2021-07-01', 'full_time', @fin_dept, @fin_acc_pos, 'active', 'Peter Wanjala', '+254 723 456 790', 'Accountant'),
('EMP-FIN-005', 'John', 'Ochieng', NULL, '1991-02-28', 'Male', '+254 723 456 790', 'john.ochieng@transelgon.co.ke', 'Nairobi, Kenya', '23456790', '2022-03-20', 'full_time', @fin_dept, @fin_clk_pos, 'active', 'Grace Ochieng', '+254 734 567 891', 'Finance Clerk');

-- Human Resources Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-HR-003', 'Grace', 'Savai', NULL, '1987-12-30', 'Female', '+254 734 567 891', 'grace.savai@transelgon.co.ke', 'Nairobi, Kenya', '34567891', '2020-08-01', 'full_time', @hr_dept, @hr_mgr_pos, 'active', 'Peter Savai', '+254 745 678 902', 'HR Manager'),
('EMP-HR-004', 'Esther', 'Wambui', NULL, '1988-07-08', 'Female', '+254 745 678 902', 'esther.wambui@transelgon.co.ke', 'Nairobi, Kenya', '45678902', '2021-03-15', 'full_time', @hr_dept, @hr_off_pos, 'active', 'Joseph Wambui', '+254 756 789 013', 'HR Officer'),
('EMP-HR-005', 'David', 'Kipchoge', NULL, '1990-10-12', 'Male', '+254 756 789 013', 'david.kipchoge@transelgon.co.ke', 'Nairobi, Kenya', '56789013', '2022-01-10', 'full_time', @hr_dept, @hr_rec_pos, 'active', 'Faith Kipchoge', '+254 767 890 124', 'HR Recruiter');

-- Procurement Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-PROC-002', 'Susan', 'Muthoni', NULL, '1989-06-30', 'Female', '+254 767 890 124', 'susan.muthoni@transelgon.co.ke', 'Nairobi, Kenya', '67890124', '2021-12-05', 'full_time', @proc_dept, @proc_mgr_pos, 'active', 'James Muthoni', '+254 778 901 235', 'Procurement Manager'),
('EMP-PROC-003', 'James', 'Mwangi', NULL, '1991-04-15', 'Male', '+254 778 901 235', 'james.mwangi@transelgon.co.ke', 'Nairobi, Kenya', '78901235', '2022-05-01', 'full_time', @proc_dept, @proc_off_pos, 'active', 'Mary Mwangi', '+254 789 012 346', 'Procurement Officer'),
('EMP-PROC-004', 'Patricia', 'Njoroge', NULL, '1993-08-22', 'Female', '+254 789 012 346', 'patricia.njoroge@transelgon.co.ke', 'Nairobi, Kenya', '89012346', '2022-06-15', 'full_time', @proc_dept, @proc_clk_pos, 'active', 'John Njoroge', '+254 790 123 457', 'Procurement Clerk');

-- Inpatient Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-INP-001', 'Dr. Michael', 'Ochieng', NULL, '1985-09-10', 'Male', '+254 790 123 457', 'michael.ochieng@transelgon.co.ke', 'Nairobi, Kenya', '90123457', '2020-10-01', 'full_time', @inpatient_dept, @inp_doc_pos, 'active', 'Lucy Ochieng', '+254 701 234 568', 'Inpatient Doctor'),
('EMP-INP-002', 'Mary', 'Wanjiku', NULL, '1992-06-22', 'Female', '+254 701 234 568', 'mary.wanjiku@transelgon.co.ke', 'Nairobi, Kenya', '01234568', '2021-08-15', 'full_time', @inpatient_dept, @inp_nur_pos, 'active', 'James Wanjiku', '+254 712 345 679', 'Inpatient Nurse');

-- ICU Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-ICU-001', 'Dr. Sarah', 'Mwangi', NULL, '1983-07-25', 'Female', '+254 712 345 679', 'sarah.mwangi@transelgon.co.ke', 'Nairobi, Kenya', '12345679', '2020-03-15', 'full_time', @icu_dept, @icu_doc_pos, 'active', 'Peter Mwangi', '+254 723 456 790', 'ICU Doctor'),
('EMP-ICU-002', 'Ruth', 'Achieng', NULL, '1990-11-18', 'Female', '+254 723 456 790', 'ruth.achieng@transelgon.co.ke', 'Nairobi, Kenya', '23456790', '2021-04-20', 'full_time', @icu_dept, @icu_nur_pos, 'active', 'David Achieng', '+254 734 567 891', 'ICU Nurse'),
('EMP-ICU-003', 'John', 'Kamau', NULL, '1988-05-12', 'Male', '+254 734 567 891', 'john.kamau@transelgon.co.ke', 'Nairobi, Kenya', '34567891', '2021-09-10', 'full_time', @icu_dept, @icu_tech_pos, 'active', 'Mary Kamau', '+254 745 678 902', 'ICU Technician');

-- Maternity Department Employees
INSERT IGNORE INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-MAT-001', 'Dr. Anne', 'Njeri', NULL, '1986-08-14', 'Female', '+254 745 678 902', 'anne.njeri@transelgon.co.ke', 'Nairobi, Kenya', '45678902', '2020-12-01', 'full_time', @maternity_dept, @mat_doc_pos, 'active', 'James Njeri', '+254 756 789 013', 'Obstetrician'),
('EMP-MAT-002', 'Faith', 'Kipchoge', NULL, '1991-03-20', 'Female', '+254 756 789 013', 'faith.kipchoge@transelgon.co.ke', 'Nairobi, Kenya', '56789013', '2021-06-15', 'full_time', @maternity_dept, @mat_mid_pos, 'active', 'Joseph Kipchoge', '+254 767 890 124', 'Midwife'),
('EMP-MAT-003', 'Esther', 'Mwangi', NULL, '1992-09-10', 'Female', '+254 767 890 124', 'esther.mwangi@transelgon.co.ke', 'Nairobi, Kenya', '67890124', '2022-01-20', 'full_time', @maternity_dept, @mat_nur_pos, 'active', 'James Mwangi', '+254 778 901 235', 'Maternity Nurse');

-- ============================================
-- Verification Queries
-- ============================================
-- Uncomment to verify data after running:
-- SELECT d.departmentName, COUNT(e.employeeId) as employee_count
-- FROM departments d
-- LEFT JOIN employees e ON d.departmentId = e.departmentId AND e.status = 'active'
-- GROUP BY d.departmentId, d.departmentName
-- ORDER BY d.departmentName;

-- SELECT d.departmentName, COUNT(p.positionId) as position_count
-- FROM departments d
-- LEFT JOIN employee_positions p ON d.departmentId = p.departmentId AND p.isActive = TRUE
-- GROUP BY d.departmentId, d.departmentName
-- ORDER BY d.departmentName;

