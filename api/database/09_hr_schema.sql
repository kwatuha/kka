-- ============================================
-- HR MODULE
-- ============================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    departmentId INT NOT NULL AUTO_INCREMENT,
    departmentCode VARCHAR(50) UNIQUE,
    departmentName VARCHAR(200) NOT NULL,
    description TEXT,
    headOfDepartmentId INT NULL, -- User ID of department head
    location VARCHAR(200),
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (departmentId),
    FOREIGN KEY (headOfDepartmentId) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_department_code (departmentCode),
    INDEX idx_department_name (departmentName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employee positions/job titles (create before employees to satisfy FK)
CREATE TABLE IF NOT EXISTS employee_positions (
    positionId INT NOT NULL AUTO_INCREMENT,
    positionCode VARCHAR(50) UNIQUE,
    positionTitle VARCHAR(200) NOT NULL,
    departmentId INT,
    jobDescription TEXT,
    requirements TEXT,
    salaryScaleMin DECIMAL(15, 2) NULL,
    salaryScaleMax DECIMAL(15, 2) NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (positionId),
    FOREIGN KEY (departmentId) REFERENCES departments(departmentId) ON DELETE SET NULL,
    INDEX idx_position_code (positionCode),
    INDEX idx_position_title (positionTitle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employees (HR records - extends users)
CREATE TABLE IF NOT EXISTS employees (
    employeeId INT NOT NULL AUTO_INCREMENT,
    userId INT NULL, -- Link to users table (optional, for system users)
    employeeNumber VARCHAR(50) UNIQUE NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    middleName VARCHAR(100),
    dateOfBirth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    idNumber VARCHAR(50),
    hireDate DATE NOT NULL,
    terminationDate DATE NULL,
    employmentType ENUM('full_time', 'part_time', 'contract', 'temporary') DEFAULT 'full_time',
    departmentId INT,
    positionId INT, -- Link to employee_positions
    status ENUM('active', 'on_leave', 'terminated', 'resigned') DEFAULT 'active',
    emergencyContactName VARCHAR(200),
    emergencyContactPhone VARCHAR(20),
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (employeeId),
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE SET NULL,
    FOREIGN KEY (departmentId) REFERENCES departments(departmentId) ON DELETE SET NULL,
    FOREIGN KEY (positionId) REFERENCES employee_positions(positionId) ON DELETE SET NULL,
    INDEX idx_employee_number (employeeNumber),
    INDEX idx_user (userId),
    INDEX idx_department (departmentId),
    INDEX idx_position (positionId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employee leave
CREATE TABLE IF NOT EXISTS employee_leave (
    leaveId INT NOT NULL AUTO_INCREMENT,
    employeeId INT NOT NULL,
    leaveType ENUM('annual', 'sick', 'maternity', 'paternity', 'compassionate', 'study', 'unpaid', 'other') NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    daysRequested DECIMAL(5, 2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    requestedDate DATE NOT NULL,
    approvedBy INT NULL,
    approvedDate DATE NULL,
    rejectionReason TEXT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (leaveId),
    FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
    FOREIGN KEY (approvedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_employee (employeeId),
    INDEX idx_status (status),
    INDEX idx_leave_type (leaveType),
    INDEX idx_start_date (startDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employee attendance
CREATE TABLE IF NOT EXISTS employee_attendance (
    attendanceId INT NOT NULL AUTO_INCREMENT,
    employeeId INT NOT NULL,
    attendanceDate DATE NOT NULL,
    checkInTime DATETIME NULL,
    checkOutTime DATETIME NULL,
    hoursWorked DECIMAL(5, 2) NULL,
    status ENUM('present', 'absent', 'late', 'half_day', 'on_leave') DEFAULT 'absent',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (attendanceId),
    FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (employeeId, attendanceDate),
    INDEX idx_employee (employeeId),
    INDEX idx_attendance_date (attendanceDate),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

