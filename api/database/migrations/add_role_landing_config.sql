-- Migration: Add landing page configuration to roles
-- This allows each role to have a custom landing page/app view
-- Note: MySQL doesn't support IF NOT EXISTS in ALTER TABLE, so run this migration only once

-- Check if columns exist before adding (using stored procedure approach)
-- For simplicity, we'll add columns one by one and ignore errors if they exist

ALTER TABLE roles
ADD COLUMN landingPageType ENUM('dashboard', 'app_view', 'redirect') DEFAULT 'dashboard' AFTER description;

ALTER TABLE roles
ADD COLUMN landingPageLabel VARCHAR(100) NULL AFTER landingPageType;

ALTER TABLE roles
ADD COLUMN landingPageUrl VARCHAR(255) NULL AFTER landingPageLabel;

ALTER TABLE roles
ADD COLUMN landingPageIcon VARCHAR(50) NULL AFTER landingPageUrl;

ALTER TABLE roles
ADD COLUMN landingPageDescription TEXT NULL AFTER landingPageIcon;

ALTER TABLE roles
ADD COLUMN defaultServicePoint VARCHAR(50) NULL AFTER landingPageDescription;

-- Update existing roles with default configurations
UPDATE roles SET
  landingPageType = 'dashboard',
  landingPageLabel = NULL,
  landingPageUrl = NULL
WHERE landingPageType IS NULL;

-- Example: Configure triage role for app view
-- Uncomment and modify as needed:
-- UPDATE roles SET
--   landingPageType = 'app_view',
--   landingPageLabel = 'Triage Service Point',
--   landingPageUrl = '/queue/service',
--   landingPageIcon = 'Activity',
--   landingPageDescription = 'Access your service point dashboard'
-- WHERE roleName = 'triage';
