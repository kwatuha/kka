-- Idempotent mobile consultation sync log (offline outbox replay)
CREATE TABLE IF NOT EXISTS mobile_consultation_sync (
  clientActionId VARCHAR(64) NOT NULL PRIMARY KEY,
  recordId INT NULL,
  prescriptionId INT NULL,
  queueId INT NULL,
  patientId INT NULL,
  doctorId INT NULL,
  payload JSON NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mobile_consultation_sync_patient (patientId, createdAt)
);
