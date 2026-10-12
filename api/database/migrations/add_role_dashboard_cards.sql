-- Migration: Add dashboard card visibility configuration for roles
-- This allows each role to have custom dashboard card visibility settings

-- Create table to store role-specific dashboard card visibility
CREATE TABLE IF NOT EXISTS role_dashboard_cards (
    roleId INT NOT NULL,
    cardId VARCHAR(50) NOT NULL,
    isVisible BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (roleId, cardId),
    FOREIGN KEY (roleId) REFERENCES roles(roleId) ON DELETE CASCADE,
    INDEX idx_roleId (roleId),
    INDEX idx_cardId (cardId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment explaining the table
ALTER TABLE role_dashboard_cards COMMENT = 'Stores role-specific dashboard card visibility settings. If a role has an entry here, it overrides privilege-based visibility.';
