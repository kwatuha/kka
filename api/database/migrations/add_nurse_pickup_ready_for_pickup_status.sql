-- Add 'ready_for_pickup' status to nurse_pickups (pharmacy has dispensed, waiting for nurse to collect)
ALTER TABLE nurse_pickups
MODIFY COLUMN status ENUM('pending', 'ready_for_pickup', 'picked_up', 'cancelled') DEFAULT 'pending';
