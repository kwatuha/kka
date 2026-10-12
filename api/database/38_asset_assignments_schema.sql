-- ============================================
-- ASSET ASSIGNMENTS
-- ============================================
-- This migration adds support for tracking asset assignments to staff/users

-- Create asset assignments table
CREATE TABLE IF NOT EXISTS asset_assignments (
    assignmentId INT NOT NULL AUTO_INCREMENT,
    assetId INT NOT NULL,
    assignedTo INT NOT NULL, -- User ID (staff member)
    assignedBy INT NULL, -- User who made the assignment
    assignmentDate DATE NOT NULL,
    returnDate DATE NULL, -- When asset was returned
    status ENUM('active', 'returned', 'lost', 'damaged') DEFAULT 'active',
    conditionAtAssignment ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
    conditionAtReturn ENUM('excellent', 'good', 'fair', 'poor') NULL,
    location VARCHAR(200) NULL, -- Location where asset is being used
    department VARCHAR(100) NULL, -- Department/unit
    notes TEXT, -- Assignment notes
    returnNotes TEXT, -- Return notes (damage, issues, etc.)
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (assignmentId),
    FOREIGN KEY (assetId) REFERENCES assets(assetId) ON DELETE CASCADE,
    FOREIGN KEY (assignedTo) REFERENCES users(userId) ON DELETE CASCADE,
    FOREIGN KEY (assignedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_asset (assetId),
    INDEX idx_assigned_to (assignedTo),
    INDEX idx_status (status),
    INDEX idx_assignment_date (assignmentDate),
    INDEX idx_return_date (returnDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create view for current asset assignments
CREATE OR REPLACE VIEW vw_current_asset_assignments AS
SELECT
    a.assignmentId,
    a.assetId,
    ast.assetCode,
    ast.assetName,
    ast.category,
    ast.serialNumber,
    ast.status as assetStatus,
    a.assignedTo,
    u.firstName as assignedToFirstName,
    u.lastName as assignedToLastName,
    u.email as assignedToEmail,
    u.phone as assignedToPhone,
    u.department as assignedToDepartment,
    a.assignedBy,
    assigner.firstName as assignedByFirstName,
    assigner.lastName as assignedByLastName,
    a.assignmentDate,
    a.returnDate,
    a.status,
    a.conditionAtAssignment,
    a.conditionAtReturn,
    a.location,
    a.department,
    a.notes,
    a.returnNotes,
    DATEDIFF(CURDATE(), a.assignmentDate) as daysAssigned,
    a.createdAt,
    a.updatedAt
FROM asset_assignments a
INNER JOIN assets ast ON a.assetId = ast.assetId
INNER JOIN users u ON a.assignedTo = u.userId
LEFT JOIN users assigner ON a.assignedBy = assigner.userId
WHERE a.status = 'active'
ORDER BY a.assignmentDate DESC;

-- Create view for asset assignment history
CREATE OR REPLACE VIEW vw_asset_assignment_history AS
SELECT
    a.assignmentId,
    a.assetId,
    ast.assetCode,
    ast.assetName,
    ast.category,
    a.assignedTo,
    u.firstName as assignedToFirstName,
    u.lastName as assignedToLastName,
    u.email as assignedToEmail,
    u.department as assignedToDepartment,
    a.assignedBy,
    assigner.firstName as assignedByFirstName,
    assigner.lastName as assignedByLastName,
    a.assignmentDate,
    a.returnDate,
    a.status,
    a.conditionAtAssignment,
    a.conditionAtReturn,
    a.location,
    a.department,
    a.notes,
    a.returnNotes,
    CASE
        WHEN a.returnDate IS NOT NULL THEN DATEDIFF(a.returnDate, a.assignmentDate)
        WHEN a.status = 'active' THEN DATEDIFF(CURDATE(), a.assignmentDate)
        ELSE NULL
    END as daysAssigned,
    a.createdAt,
    a.updatedAt
FROM asset_assignments a
INNER JOIN assets ast ON a.assetId = ast.assetId
INNER JOIN users u ON a.assignedTo = u.userId
LEFT JOIN users assigner ON a.assignedBy = assigner.userId
ORDER BY a.assignmentDate DESC, a.createdAt DESC;
