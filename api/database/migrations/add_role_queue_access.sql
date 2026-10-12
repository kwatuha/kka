-- Migration: Add Role-Based Queue Access Control
-- Description: Adds table to control which queue service points each role can access
-- Date: 2024

USE kiplombe_hmis;

-- Table: role_queue_access
-- Maps roles to queue service points they can access
CREATE TABLE IF NOT EXISTS role_queue_access (
    roleId INT NOT NULL,
    servicePoint VARCHAR(50) NOT NULL,  -- e.g., "triage", "consultation", "pharmacy", "laboratory", "radiology", "billing", "cashier", "registration"
    isAllowed BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (roleId, servicePoint),
    FOREIGN KEY (roleId) REFERENCES roles(roleId) ON DELETE CASCADE,
    INDEX idx_role (roleId),
    INDEX idx_service_point (servicePoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default permissions for existing roles (grant all access)
-- This ensures existing roles continue to work until explicitly configured
INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'triage', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'registration', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'consultation', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'laboratory', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'radiology', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'pharmacy', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'billing', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'cashier', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;
