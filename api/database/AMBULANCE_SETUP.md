# Ambulance Management Module Setup

## Overview

The Ambulance Management module provides functionality for managing ambulance fleet and tracking emergency transport services.

## Database Setup

### Step 1: Create Schema

Run the schema file to create the necessary tables:

```bash
mysql -u root -p kiplombe_hmis < api/database/27_ambulance_schema.sql
```

Or using Docker:

```bash
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/27_ambulance_schema.sql
```

### Step 2: Insert Sample Data

After creating the schema, insert sample data:

```bash
mysql -u root -p kiplombe_hmis < api/database/28_ambulance_sample_data.sql
```

Or using Docker:

```bash
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/28_ambulance_sample_data.sql
```

## Tables Created

### 1. `ambulances`
Stores ambulance vehicle information:
- Vehicle number, type (basic, advanced, mobile_icu, standard)
- Driver information
- Capacity and equipment
- Status (available, on_trip, maintenance, out_of_service)

### 2. `ambulance_trips`
Stores trip/dispatch information:
- Trip details (pickup, destination, type)
- Patient information
- Status tracking (scheduled, dispatched, in_progress, completed, cancelled)
- Timestamps for each stage
- Cost and payment information

### 3. `ambulance_trip_logs`
Tracks trip progress with detailed logs:
- Log types (dispatched, en_route, arrived_pickup, patient_loaded, etc.)
- Location tracking
- Notes and timestamps

## Sample Data Included

The sample data script includes:

### Ambulances (9 vehicles):
- 3 Basic Life Support ambulances
- 2 Advanced Life Support ambulances
- 1 Mobile ICU ambulance
- 3 Standard ambulances

### Trips (7 sample trips):
- Completed emergency trip
- In-progress emergency trip
- Scheduled transfer trip
- Completed discharge trip
- Scheduled emergency trip
- Completed transfer trip
- Cancelled trip

### Trip Logs:
- Detailed logs for completed and in-progress trips

## Verification

After setup, verify the data:

```sql
-- Check ambulances
SELECT vehicleNumber, vehicleType, driverName, status FROM ambulances;

-- Check trips
SELECT tripNumber, patientName, tripType, status FROM ambulance_trips;

-- Check trip logs
SELECT tripId, logType, logDateTime, location FROM ambulance_trip_logs;
```

## Next Steps

1. **Backend API**: Create API endpoints in `api/routes/ambulanceRoutes.js`
2. **Frontend Integration**: Connect the frontend page to the API endpoints
3. **Real-time Updates**: Consider adding real-time tracking for active trips

## Notes

- The sample data uses conditional inserts to work with or without existing patient data
- Trip numbers are auto-generated (format: TRIP-YYYY-XXX)
- All timestamps are set to recent dates for testing
- Foreign keys reference existing tables (users, patients) where applicable




