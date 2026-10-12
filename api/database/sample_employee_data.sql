-- Sample Employee Data
-- This script adds realistic sample data for employees

-- First, ensure we have some departments (if not already present)
INSERT IGNORE INTO departments (departmentCode, departmentName, description, isActive) VALUES
('MED', 'Medical', 'Medical department', TRUE),
('FIN', 'Finance', 'Finance department', TRUE),
('HR', 'Human Resources', 'HR department', TRUE),
('IT', 'Information Technology', 'IT department', TRUE),
('ADM', 'Administration', 'Administration department', TRUE),
('NUR', 'Nursing', 'Nursing department', TRUE),
('LAB', 'Laboratory', 'Laboratory department', TRUE),
('PHAR', 'Pharmacy', 'Pharmacy department', TRUE);

-- Get department IDs
SET @med_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'MED' LIMIT 1);
SET @fin_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'FIN' LIMIT 1);
SET @hr_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'HR' LIMIT 1);
SET @it_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'IT' LIMIT 1);
SET @adm_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'ADM' LIMIT 1);
SET @nur_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'NUR' LIMIT 1);
SET @lab_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'LAB' LIMIT 1);
SET @phar_dept = (SELECT departmentId FROM departments WHERE departmentCode = 'PHAR' LIMIT 1);

-- Insert employee positions
INSERT IGNORE INTO employee_positions (positionCode, positionTitle, departmentId, isActive) VALUES
('CMO', 'Chief Medical Officer', @med_dept, TRUE),
('DOC', 'Doctor', @med_dept, TRUE),
('SPEC', 'Specialist', @med_dept, TRUE),
('NUR', 'Nurse', @nur_dept, TRUE),
('FIN_MGR', 'Finance Manager', @fin_dept, TRUE),
('HR_MGR', 'HR Manager', @hr_dept, TRUE),
('IT_MGR', 'IT Manager', @it_dept, TRUE),
('ADM_MGR', 'Administration Manager', @adm_dept, TRUE),
('LAB_TECH', 'Laboratory Technician', @lab_dept, TRUE),
('PHAR_TECH', 'Pharmacy Technician', @phar_dept, TRUE);

-- Get position IDs
SET @cmo_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'CMO' LIMIT 1);
SET @doc_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'DOC' LIMIT 1);
SET @spec_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'SPEC' LIMIT 1);
SET @nur_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'NUR' LIMIT 1);
SET @fin_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'FIN_MGR' LIMIT 1);
SET @hr_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'HR_MGR' LIMIT 1);
SET @it_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'IT_MGR' LIMIT 1);
SET @adm_mgr_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'ADM_MGR' LIMIT 1);
SET @lab_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'LAB_TECH' LIMIT 1);
SET @phar_tech_pos = (SELECT positionId FROM employee_positions WHERE positionCode = 'PHAR_TECH' LIMIT 1);

-- Insert employees
INSERT INTO employees (
    employeeNumber, firstName, lastName, middleName, dateOfBirth, gender,
    phone, email, address, idNumber, hireDate, employmentType,
    departmentId, positionId, status, emergencyContactName, emergencyContactPhone, notes
) VALUES
('EMP-1001', 'James', 'Ndiwa', NULL, '1980-05-15', 'Male', '+254 712 345 678', 'james.ndiwa@transelgon.co.ke', 'Nairobi, Kenya', '12345678', '2020-01-15', 'full_time', @med_dept, @cmo_pos, 'active', 'Mary Ndiwa', '+254 723 456 789', 'Chief Medical Officer'),
('EMP-1002', 'Sarah', 'Isuvi', NULL, '1985-03-20', 'Female', '+254 723 456 789', 'sarah.isuvi@transelgon.co.ke', 'Nairobi, Kenya', '23456789', '2020-03-10', 'full_time', @med_dept, @doc_pos, 'active', 'John Isuvi', '+254 734 567 890', 'Senior Doctor'),
('EMP-1003', 'Michael', 'Siva', NULL, '1988-07-12', 'Male', '+254 734 567 890', 'michael.siva@transelgon.co.ke', 'Nairobi, Kenya', '34567890', '2021-02-05', 'full_time', @med_dept, @spec_pos, 'active', 'Jane Siva', '+254 745 678 901', 'Cardiologist Specialist'),
('EMP-1004', 'Emily', 'Logovane', NULL, '1990-11-25', 'Female', '+254 745 678 901', 'emily.logovane@transelgon.co.ke', 'Nairobi, Kenya', '45678901', '2021-05-20', 'full_time', @med_dept, @spec_pos, 'active', 'David Logovane', '+254 756 789 012', 'Pediatric Specialist'),
('EMP-1005', 'Daniel', 'Mirenja', NULL, '1982-09-08', 'Male', '+254 756 789 012', 'daniel.mirenja@transelgon.co.ke', 'Nairobi, Kenya', '56789012', '2020-06-15', 'full_time', @fin_dept, @fin_mgr_pos, 'active', 'Susan Mirenja', '+254 767 890 123', 'Finance Manager'),
('EMP-1006', 'Grace', 'Savai', NULL, '1987-12-30', 'Female', '+254 767 890 123', 'grace.savai@transelgon.co.ke', 'Nairobi, Kenya', '67890123', '2020-08-01', 'full_time', @hr_dept, @hr_mgr_pos, 'active', 'Peter Savai', '+254 778 901 234', 'HR Manager'),
('EMP-1007', 'Peter', 'Livambula', NULL, '1985-04-18', 'Male', '+254 778 901 234', 'peter.livambula@transelgon.co.ke', 'Nairobi, Kenya', '78901234', '2021-01-10', 'full_time', @it_dept, @it_mgr_pos, 'active', 'Lucy Livambula', '+254 789 012 345', 'IT Manager'),
('EMP-1008', 'Mary', 'Wanjiku', NULL, '1992-06-22', 'Female', '+254 789 012 345', 'mary.wanjiku@transelgon.co.ke', 'Nairobi, Kenya', '89012345', '2021-08-15', 'full_time', @nur_dept, @nur_pos, 'active', 'James Wanjiku', '+254 790 123 456', 'Registered Nurse'),
('EMP-1009', 'John', 'Kamau', NULL, '1989-10-05', 'Male', '+254 790 123 456', 'john.kamau@transelgon.co.ke', 'Nairobi, Kenya', '90123456', '2021-09-01', 'full_time', @lab_dept, @lab_tech_pos, 'active', 'Ann Kamau', '+254 701 234 567', 'Laboratory Technician'),
('EMP-1010', 'Ann', 'Njeri', NULL, '1991-02-14', 'Female', '+254 701 234 567', 'ann.njeri@transelgon.co.ke', 'Nairobi, Kenya', '01234567', '2021-10-20', 'full_time', @phar_dept, @phar_tech_pos, 'active', 'Paul Njeri', '+254 712 345 678', 'Pharmacy Technician'),
('EMP-1011', 'David', 'Ochieng', NULL, '1986-08-30', 'Male', '+254 712 345 679', 'david.ochieng@transelgon.co.ke', 'Nairobi, Kenya', '12345679', '2020-11-12', 'full_time', @med_dept, @doc_pos, 'active', 'Ruth Ochieng', '+254 723 456 790', 'General Practitioner'),
('EMP-1012', 'Ruth', 'Achieng', NULL, '1993-01-17', 'Female', '+254 723 456 790', 'ruth.achieng@transelgon.co.ke', 'Nairobi, Kenya', '23456790', '2022-01-05', 'full_time', @nur_dept, @nur_pos, 'active', 'David Achieng', '+254 734 567 891', 'Nurse'),
('EMP-1013', 'Paul', 'Mwangi', NULL, '1984-03-25', 'Male', '+254 734 567 891', 'paul.mwangi@transelgon.co.ke', 'Nairobi, Kenya', '34567891', '2020-04-20', 'full_time', @adm_dept, @adm_mgr_pos, 'active', 'Esther Mwangi', '+254 745 678 902', 'Administration Manager'),
('EMP-1014', 'Esther', 'Wambui', NULL, '1988-07-08', 'Female', '+254 745 678 902', 'esther.wambui@transelgon.co.ke', 'Nairobi, Kenya', '45678902', '2021-03-15', 'full_time', @med_dept, @spec_pos, 'on_leave', 'Joseph Wambui', '+254 756 789 013', 'Gynecologist - Currently on leave'),
('EMP-1015', 'Joseph', 'Kipchoge', NULL, '1990-12-03', 'Male', '+254 756 789 013', 'joseph.kipchoge@transelgon.co.ke', 'Nairobi, Kenya', '56789013', '2022-02-10', 'contract', @lab_dept, @lab_tech_pos, 'active', 'Faith Kipchoge', '+254 767 890 124', 'Contract Laboratory Technician');


