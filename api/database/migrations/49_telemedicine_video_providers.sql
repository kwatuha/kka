-- Extend telemedicine_sessions.provider for manual link-based video platforms (Zoom, Meet, Teams, etc.)
-- Run after 40_telemedicine_sessions_schema.sql

ALTER TABLE telemedicine_sessions
  MODIFY COLUMN provider ENUM(
    'daily',
    'zoom_manual',
    'google_meet',
    'microsoft_teams',
    'other_link'
  ) NOT NULL DEFAULT 'zoom_manual';
