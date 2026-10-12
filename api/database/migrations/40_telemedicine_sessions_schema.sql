-- Telemedicine: sessions + consent + audit (Zoom link mode; optional legacy 'daily' provider)
-- Run this once on kiplombe_hmis (or run: npm run migrate:telemedicine from api/)

CREATE TABLE IF NOT EXISTS telemedicine_sessions (
  sessionId INT NOT NULL AUTO_INCREMENT,
  sessionUuid CHAR(36) NOT NULL UNIQUE,

  -- Origin
  originType ENUM('appointment','inpatient','standalone') NOT NULL,
  appointmentId INT NULL,
  admissionId INT NULL,

  -- Participants
  patientId INT NOT NULL,
  doctorId INT NOT NULL,

  -- Provider: zoom_manual = paste Zoom join link; daily = legacy Daily.co rows only
  provider ENUM('daily','zoom_manual') NOT NULL DEFAULT 'zoom_manual',
  roomName VARCHAR(128) NULL,
  roomUrl TEXT NULL,
  zoomJoinUrl TEXT NULL,
  zoomPassword VARCHAR(100) NULL,

  -- State machine
  status ENUM(
    'created',
    'waiting_for_consent',
    'in_progress',
    'ended',
    'recording_started',
    'recording_ready',
    'recording_failed'
  ) NOT NULL DEFAULT 'created',

  -- Age + consent requirements (computed from DOB at consent time)
  ageAtConsentYears INT NULL,
  minorRequired BOOLEAN NOT NULL DEFAULT 0,

  patientConsentGranted BOOLEAN NOT NULL DEFAULT 0,
  patientConsentAt DATETIME NULL,
  patientConsentBy INT NULL,

  guardianConsentRequired BOOLEAN NOT NULL DEFAULT 0,
  guardianConsentGranted BOOLEAN NOT NULL DEFAULT 0,
  guardianConsentAt DATETIME NULL,
  guardianConsentBy INT NULL,

  guardianName VARCHAR(200) NULL,
  guardianPhone VARCHAR(20) NULL,
  guardianRelationship VARCHAR(50) NULL,

  -- Recording policy intent + gating (optional / legacy)
  recordingPolicyEnabled BOOLEAN NOT NULL DEFAULT 1,
  recordingConsentSatisfiedAt DATETIME NULL,
  recordingStartedAt DATETIME NULL,

  -- Recording metadata (optional / legacy)
  recordingId VARCHAR(200) NULL,
  recordingReadyAt DATETIME NULL,

  -- App audit
  notes TEXT NULL,
  createdBy INT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (sessionId),
  INDEX idx_tm_patient (patientId),
  INDEX idx_tm_doctor (doctorId),
  INDEX idx_tm_origin (originType, appointmentId, admissionId),
  INDEX idx_tm_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS telemedicine_session_audit (
  auditId INT NOT NULL AUTO_INCREMENT,
  sessionId INT NOT NULL,
  eventType VARCHAR(80) NOT NULL,
  actorUserId INT NULL,
  eventAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details TEXT NULL,
  PRIMARY KEY (auditId),
  FOREIGN KEY (sessionId) REFERENCES telemedicine_sessions(sessionId) ON DELETE CASCADE,
  INDEX idx_tm_audit_session (sessionId),
  INDEX idx_tm_audit_event (eventType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
