-- ============================================
-- AMBULANCE MANAGEMENT SAMPLE DATA
-- ============================================
-- This script creates sample data for ambulance fleet and trips
-- Run this after creating the ambulance schema (27_ambulance_schema.sql)

-- ============================================
-- SAMPLE AMBULANCES
-- ============================================

INSERT IGNORE INTO ambulances (
    vehicleNumber, vehicleType, driverName, driverPhone, capacity, equipment, status, isActive, notes, createdAt
)
VALUES
    -- Basic Life Support Ambulances
    ('KCA 123A', 'basic', 'John Kamau', '0712345678', 1,
     'Oxygen tank, First aid kit, Stretcher, Blankets, Basic monitoring equipment',
     'available', TRUE, 'Primary response vehicle for emergency calls', '2024-01-15 08:00:00'),

    ('KCA 124B', 'basic', 'Mary Wanjiku', '0723456789', 1,
     'Oxygen tank, First aid kit, Stretcher, Blankets, Basic monitoring equipment',
     'available', TRUE, 'Backup vehicle for emergency calls', '2024-01-16 09:00:00'),

    ('KCA 125C', 'basic', 'Peter Ochieng', '0734567890', 1,
     'Oxygen tank, First aid kit, Stretcher, Blankets, Basic monitoring equipment',
     'on_trip', TRUE, 'Currently on active trip', '2024-01-17 10:00:00'),

    -- Advanced Life Support Ambulances
    ('KCA 201X', 'advanced', 'David Kimani', '0745678901', 1,
     'Advanced cardiac monitor, Defibrillator, Ventilator, IV pumps, Advanced medications, Oxygen, Stretcher',
     'available', TRUE, 'ALS vehicle for critical patients', '2024-01-18 11:00:00'),

    ('KCA 202Y', 'advanced', 'Grace Akinyi', '0756789012', 1,
     'Advanced cardiac monitor, Defibrillator, Ventilator, IV pumps, Advanced medications, Oxygen, Stretcher',
     'available', TRUE, 'ALS vehicle for critical patients', '2024-01-19 12:00:00'),

    -- Mobile ICU Ambulances
    ('KCA 301M', 'mobile_icu', 'James Mwangi', '0767890123', 1,
     'Full ICU equipment, Ventilator, Cardiac monitor, Defibrillator, IV pumps, Advanced life support, Critical care medications',
     'available', TRUE, 'Mobile ICU for critical care transport', '2024-01-20 13:00:00'),

    -- Standard Ambulances
    ('KCA 401S', 'standard', 'Sarah Wambui', '0778901234', 2,
     'Oxygen, First aid kit, Stretcher, Basic monitoring, Wheelchair',
     'available', TRUE, 'Standard transport for non-emergency transfers', '2024-01-21 14:00:00'),

    ('KCA 402T', 'standard', 'Michael Otieno', '0789012345', 2,
     'Oxygen, First aid kit, Stretcher, Basic monitoring, Wheelchair',
     'maintenance', TRUE, 'Routine maintenance - available next week', '2024-01-22 15:00:00'),

    ('KCA 403U', 'standard', 'Lucy Njeri', '0790123456', 2,
     'Oxygen, First aid kit, Stretcher, Basic monitoring, Wheelchair',
     'available', TRUE, 'Standard transport vehicle', '2024-01-23 16:00:00');

-- ============================================
-- SAMPLE AMBULANCE TRIPS
-- ============================================

-- Get ambulance IDs
SET @ambulance1 = (SELECT ambulanceId FROM ambulances WHERE vehicleNumber = 'KCA 123A' LIMIT 1);
SET @ambulance2 = (SELECT ambulanceId FROM ambulances WHERE vehicleNumber = 'KCA 124B' LIMIT 1);
SET @ambulance3 = (SELECT ambulanceId FROM ambulances WHERE vehicleNumber = 'KCA 125C' LIMIT 1);
SET @ambulance4 = (SELECT ambulanceId FROM ambulances WHERE vehicleNumber = 'KCA 201X' LIMIT 1);
SET @ambulance5 = (SELECT ambulanceId FROM ambulances WHERE vehicleNumber = 'KCA 301M' LIMIT 1);

-- Get sample patients (if they exist)
-- Use a safer approach that works with all MySQL versions
SET @patient1 = (SELECT patientId FROM patients ORDER BY patientId LIMIT 1);
SET @patient2 = (SELECT patientId FROM patients WHERE patientId > COALESCE(@patient1, 0) ORDER BY patientId LIMIT 1);
SET @patient3 = (SELECT patientId FROM patients WHERE patientId > COALESCE(@patient2, 0) ORDER BY patientId LIMIT 1);
SET @patient4 = (SELECT patientId FROM patients WHERE patientId > COALESCE(@patient3, 0) ORDER BY patientId LIMIT 1);

-- Get patient names separately
SET @patient1_name = (SELECT CONCAT(firstName, ' ', lastName) FROM patients WHERE patientId = @patient1);
SET @patient2_name = (SELECT CONCAT(firstName, ' ', lastName) FROM patients WHERE patientId = @patient2);
SET @patient3_name = (SELECT CONCAT(firstName, ' ', lastName) FROM patients WHERE patientId = @patient3);
SET @patient4_name = (SELECT CONCAT(firstName, ' ', lastName) FROM patients WHERE patientId = @patient4);

-- Get a sample user for createdBy (use JOIN instead of subquery with LIMIT)
SET @user1 = (SELECT u.userId FROM users u
              INNER JOIN roles r ON u.roleId = r.roleId
              WHERE r.roleName LIKE '%admin%' OR r.roleName LIKE '%doctor%'
              ORDER BY u.userId LIMIT 1);

-- If no admin/doctor user found, get any user
SET @user1 = COALESCE(@user1, (SELECT userId FROM users ORDER BY userId LIMIT 1));

-- Insert sample trips
INSERT IGNORE INTO ambulance_trips (
    tripNumber, ambulanceId, patientId, patientName, patientPhone, patientAge, patientGender,
    pickupLocation, destination, tripType, status, scheduledDateTime, dispatchedDateTime,
    pickupDateTime, arrivalDateTime, completedDateTime, distance, duration, cost,
    paymentStatus, notes, medicalCondition, priority, createdBy, createdAt
)
VALUES
    -- Completed Emergency Trip
    ('TRIP-2024-001', @ambulance1, @patient1,
     COALESCE(@patient1_name, 'Jane Doe'),
     '0711111111', 35, 'female',
     'Kiplombe Market, Main Street, Kiplombe', 'Kiplombe Medical Centre, Hospital Road',
     'emergency', 'completed',
     '2024-01-25 10:00:00', '2024-01-25 10:05:00', '2024-01-25 10:15:00',
     '2024-01-25 10:30:00', '2024-01-25 10:45:00',
     5.2, 45, 2500.00, 'paid',
     'Patient presented with chest pain. Stable during transport. Administered oxygen.',
     'Chest pain, suspected cardiac event', 'high', @user1, '2024-01-25 10:00:00'),

    -- In Progress Emergency Trip
    ('TRIP-2024-002', @ambulance3, @patient2,
     COALESCE(@patient2_name, 'John Smith'),
     '0722222222', 45, 'male',
     'Kiplombe Bus Station, Highway Road', 'Kiplombe Medical Centre, Hospital Road',
     'emergency', 'in_progress',
     '2024-01-26 14:30:00', '2024-01-26 14:35:00', '2024-01-26 14:50:00',
     NULL, NULL,
     8.5, NULL, 3500.00, 'pending',
     'Motor vehicle accident. Multiple injuries. Patient stable but requires immediate attention.',
     'MVA with multiple injuries', 'critical', @user1, '2024-01-26 14:30:00'),

    -- Scheduled Transfer Trip
    ('TRIP-2024-003', @ambulance2, @patient3,
     COALESCE(@patient3_name, 'Mary Wanjiru'),
     '0733333333', 28, 'female',
     'Kiplombe Medical Centre, Hospital Road', 'Nairobi Hospital, Argwings Kodhek Road, Nairobi',
     'transfer', 'scheduled',
     '2024-01-27 08:00:00', NULL, NULL,
     NULL, NULL,
     120.0, NULL, 15000.00, 'pending',
     'Patient requires specialized cardiac care. Transfer to tertiary facility.',
     'Cardiac condition requiring specialized care', 'high', @user1, '2024-01-26 16:00:00'),

    -- Completed Discharge Trip
    ('TRIP-2024-004', @ambulance4, @patient4,
     COALESCE(@patient4_name, 'Peter Ochieng'),
     '0744444444', 62, 'male',
     'Kiplombe Medical Centre, Hospital Road', 'Home Address, Kiplombe Estate, Block 5',
     'discharge', 'completed',
     '2024-01-24 15:00:00', '2024-01-24 15:05:00', '2024-01-24 15:10:00',
     '2024-01-24 15:20:00', '2024-01-24 15:30:00',
     3.5, 30, 1500.00, 'paid',
     'Patient discharged after recovery. Stable condition. Assisted with wheelchair.',
     'Post-operative recovery, stable', 'low', @user1, '2024-01-24 15:00:00'),

    -- Scheduled Emergency Trip
    ('TRIP-2024-005', @ambulance5, NULL,
     'Unknown Patient', '0755555555', NULL, NULL,
     'Rural Health Centre, 15km from Kiplombe', 'Kiplombe Medical Centre, Hospital Road',
     'emergency', 'scheduled',
     '2024-01-28 09:00:00', NULL, NULL,
     NULL, NULL,
     15.0, NULL, 5000.00, 'pending',
     'Emergency call from rural health centre. Patient requires immediate transfer.',
     'Severe abdominal pain, suspected appendicitis', 'critical', @user1, '2024-01-27 18:00:00'),

    -- Completed Transfer Trip
    ('TRIP-2024-006', @ambulance1, NULL,
     'Sarah Muthoni', '0766666666', 40, 'female',
     'Kiplombe Medical Centre, Hospital Road', 'Kenyatta National Hospital, Hospital Road, Nairobi',
     'transfer', 'completed',
     '2024-01-23 11:00:00', '2024-01-23 11:10:00', '2024-01-23 11:15:00',
     '2024-01-23 13:00:00', '2024-01-23 13:15:00',
     110.0, 135, 12000.00, 'insurance',
     'Patient transferred for specialized neurosurgery. Stable during transport.',
     'Brain tumor requiring neurosurgery', 'high', @user1, '2024-01-23 11:00:00'),

    -- Cancelled Trip
    ('TRIP-2024-007', @ambulance2, NULL,
     'James Kariuki', '0777777777', 50, 'male',
     'Kiplombe Estate, Block 3', 'Kiplombe Medical Centre, Hospital Road',
     'emergency', 'cancelled',
     '2024-01-22 16:00:00', '2024-01-22 16:05:00', NULL,
     NULL, NULL,
     NULL, NULL, 0.00, 'waived',
     'Trip cancelled - patient condition improved, no longer requires ambulance transport.',
     'Chest pain - resolved', 'medium', @user1, '2024-01-22 16:00:00');

-- ============================================
-- SAMPLE TRIP LOGS
-- ============================================

-- Get trip IDs
SET @trip1 = (SELECT tripId FROM ambulance_trips WHERE tripNumber = 'TRIP-2024-001' LIMIT 1);
SET @trip2 = (SELECT tripId FROM ambulance_trips WHERE tripNumber = 'TRIP-2024-002' LIMIT 1);
SET @trip3 = (SELECT tripId FROM ambulance_trips WHERE tripNumber = 'TRIP-2024-003' LIMIT 1);

-- Insert trip logs for completed trip
INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip1, 'dispatched', '2024-01-25 10:05:00', 'Kiplombe Medical Centre', 'Ambulance dispatched to pickup location', @user1, '2024-01-25 10:05:00'
WHERE @trip1 IS NOT NULL;

INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip1, 'arrived_pickup', '2024-01-25 10:15:00', 'Kiplombe Market, Main Street', 'Arrived at pickup location. Patient assessment in progress.', @user1, '2024-01-25 10:15:00'
WHERE @trip1 IS NOT NULL;

INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip1, 'patient_loaded', '2024-01-25 10:20:00', 'Kiplombe Market, Main Street', 'Patient loaded into ambulance. Stable condition. En route to hospital.', @user1, '2024-01-25 10:20:00'
WHERE @trip1 IS NOT NULL;

INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip1, 'arrived_destination', '2024-01-25 10:30:00', 'Kiplombe Medical Centre', 'Arrived at destination. Transferring patient to emergency department.', @user1, '2024-01-25 10:30:00'
WHERE @trip1 IS NOT NULL;

INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip1, 'completed', '2024-01-25 10:45:00', 'Kiplombe Medical Centre', 'Trip completed. Patient transferred to emergency department. Ambulance available for next call.', @user1, '2024-01-25 10:45:00'
WHERE @trip1 IS NOT NULL;

-- Insert trip logs for in-progress trip
INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip2, 'dispatched', '2024-01-26 14:35:00', 'Kiplombe Medical Centre', 'Ambulance dispatched to MVA scene', @user1, '2024-01-26 14:35:00'
WHERE @trip2 IS NOT NULL;

INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip2, 'en_route', '2024-01-26 14:40:00', 'Highway Road, 2km from scene', 'En route to accident scene. ETA 10 minutes.', @user1, '2024-01-26 14:40:00'
WHERE @trip2 IS NOT NULL;

INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip2, 'arrived_pickup', '2024-01-26 14:50:00', 'Kiplombe Bus Station, Highway Road', 'Arrived at scene. Patient assessment and stabilization in progress.', @user1, '2024-01-26 14:50:00'
WHERE @trip2 IS NOT NULL;

INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip2, 'patient_loaded', '2024-01-26 15:00:00', 'Kiplombe Bus Station, Highway Road', 'Patient stabilized and loaded. En route to hospital. Critical condition.', @user1, '2024-01-26 15:00:00'
WHERE @trip2 IS NOT NULL;

INSERT IGNORE INTO ambulance_trip_logs (tripId, logType, logDateTime, location, notes, loggedBy, createdAt)
SELECT @trip2, 'en_route_destination', '2024-01-26 15:05:00', 'Highway Road, en route', 'En route to hospital. Patient receiving advanced life support.', @user1, '2024-01-26 15:05:00'
WHERE @trip2 IS NOT NULL;

-- ============================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================

-- Uncomment to verify data was inserted correctly:
-- SELECT COUNT(*) as total_ambulances FROM ambulances;
-- SELECT COUNT(*) as total_trips FROM ambulance_trips;
-- SELECT COUNT(*) as total_logs FROM ambulance_trip_logs;
--
-- SELECT vehicleNumber, vehicleType, driverName, status FROM ambulances;
-- SELECT tripNumber, patientName, tripType, status FROM ambulance_trips;

