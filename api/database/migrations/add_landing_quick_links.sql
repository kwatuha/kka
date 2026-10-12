-- Migration: Add multiple quick-action links for role landing page
-- Allows roles (e.g. Nurse) to show several buttons: Inpatient, Nursing Department, etc.
-- JSON array format: [{"label":"Inpatient","url":"/inpatient","icon":"Bed"}, ...]

ALTER TABLE roles
ADD COLUMN landingQuickLinks TEXT NULL COMMENT 'JSON array of {label, url, icon} for multiple landing buttons' AFTER defaultServicePoint;
