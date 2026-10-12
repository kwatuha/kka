-- Add doctorId column to queue_entries table
-- This allows queue entries to be associated with a specific doctor

ALTER TABLE queue_entries 
ADD COLUMN doctorId INT NULL AFTER patientId,
ADD FOREIGN KEY (doctorId) REFERENCES users(userId) ON DELETE SET NULL,
ADD INDEX idx_doctor (doctorId);





