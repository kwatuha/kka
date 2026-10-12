-- Add recordedPickupBy to nurse_pickups (pharmacist who recorded the pickup)
ALTER TABLE nurse_pickups
ADD COLUMN recordedPickupBy INT NULL AFTER pickedUpBy,
ADD CONSTRAINT fk_nurse_pickups_recorded_pickup_by
  FOREIGN KEY (recordedPickupBy) REFERENCES users(userId) ON DELETE SET NULL;
