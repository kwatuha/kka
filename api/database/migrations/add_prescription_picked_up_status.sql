-- Add 'picked_up' to prescriptions.status (nurse has collected the drugs)
ALTER TABLE prescriptions
MODIFY COLUMN status ENUM('pending', 'dispensed', 'picked_up', 'cancelled', 'expired') DEFAULT 'pending';
