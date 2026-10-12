-- Migration: Add Role-Based Menu and Tab Access Control
-- Description: Adds tables to control which top menus, sidebar items, and page tabs each role can access
-- Date: 2024

USE kiplombe_hmis;

-- Table: role_menu_categories
-- Maps roles to top menu categories (navigation categories)
CREATE TABLE IF NOT EXISTS role_menu_categories (
    roleId INT NOT NULL,
    categoryId VARCHAR(50) NOT NULL,  -- e.g., "overview", "patient-care", "clinical-services"
    isAllowed BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (roleId, categoryId),
    FOREIGN KEY (roleId) REFERENCES roles(roleId) ON DELETE CASCADE,
    INDEX idx_role (roleId),
    INDEX idx_category (categoryId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: role_menu_items
-- Maps roles to sidebar menu items within categories
CREATE TABLE IF NOT EXISTS role_menu_items (
    roleId INT NOT NULL,
    categoryId VARCHAR(50) NOT NULL,  -- Parent category
    menuItemPath VARCHAR(255) NOT NULL,  -- e.g., "/patients", "/triaging", "/pharmacy"
    isAllowed BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (roleId, categoryId, menuItemPath),
    FOREIGN KEY (roleId) REFERENCES roles(roleId) ON DELETE CASCADE,
    INDEX idx_role (roleId),
    INDEX idx_path (menuItemPath),
    INDEX idx_category_path (categoryId, menuItemPath)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: role_page_tabs
-- Maps roles to tabs within specific pages
CREATE TABLE IF NOT EXISTS role_page_tabs (
    roleId INT NOT NULL,
    pagePath VARCHAR(255) NOT NULL,  -- e.g., "/patients/[id]", "/procurement/vendors/[id]"
    tabId VARCHAR(100) NOT NULL,  -- e.g., "overview", "vitals", "lab-results", "products"
    isAllowed BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (roleId, pagePath, tabId),
    FOREIGN KEY (roleId) REFERENCES roles(roleId) ON DELETE CASCADE,
    INDEX idx_role (roleId),
    INDEX idx_page (pagePath),
    INDEX idx_tab (tabId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default permissions for existing roles (grant all access)
-- This ensures existing roles continue to work until explicitly configured
INSERT INTO role_menu_categories (roleId, categoryId, isAllowed)
SELECT r.roleId, 'overview', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_menu_categories (roleId, categoryId, isAllowed)
SELECT r.roleId, 'patient-care', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_menu_categories (roleId, categoryId, isAllowed)
SELECT r.roleId, 'clinical-services', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_menu_categories (roleId, categoryId, isAllowed)
SELECT r.roleId, 'financial', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_menu_categories (roleId, categoryId, isAllowed)
SELECT r.roleId, 'procurement', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_menu_categories (roleId, categoryId, isAllowed)
SELECT r.roleId, 'administrative', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;
