# Patient Workflow Implementation Plan

## Overview
This document outlines the implementation plan for the complete patient workflow from registration to pharmacy.

## Workflow Steps

### 1. Patient Registration → Cashier (Registration Fees)
- Patient is registered in the system
- After registration, automatically create queue entry for "cashier" service point
- Patient pays registration fees
- After payment, create queue entry for "triage" service point

### 2. Triage Queue → Triage Form → Cashier (Consultation Fees)
- Patient in triage queue
- Fill triage form with:
  - Vital signs
  - Chief complaint
  - Priority level
  - **NEW: Service point/Doctor selection**
- After saving triage form, create queue entry for "cashier" service point (consultation fees)
- After payment, create queue entry for "consultation" service point

### 3. Consultation Queue → Doctor Examination
- Patient in consultation queue
- Doctor examines patient and:
  - Makes observations
  - Either sends to Laboratory queue for tests
  - OR creates prescription

### 4. After Prescription → Cashier → Pharmacy
- After prescription is created, create queue entry for "cashier" service point (drug payment)
- After payment, create queue entry for "pharmacy" service point
- Patient collects drugs from pharmacy

### 5. Time Tracking
- Track time spent in each queue:
  - Arrival time (when patient enters queue)
  - Called time (when patient is called)
  - Start time (when service starts)
  - End time (when service completes)
- Calculate wait time, service time, total time

## Implementation Components

### Database Changes
- ✅ Queue table already has: arrivalTime, calledTime, startTime, endTime
- ✅ Triage table already has: assignedToDoctorId, assignedToDepartment
- Need to ensure workflow tracking fields exist

### API Endpoints Needed
1. **Workflow Transition Endpoints:**
   - POST `/api/workflow/register-to-cashier` - After patient registration
   - POST `/api/workflow/triage-to-cashier` - After triage completion
   - POST `/api/workflow/cashier-to-queue` - After payment (consultation fees)
   - POST `/api/workflow/consultation-to-lab` - After consultation (send to lab)
   - POST `/api/workflow/prescription-to-cashier` - After prescription
   - POST `/api/workflow/cashier-to-pharmacy` - After drug payment

2. **Time Tracking:**
   - GET `/api/queue/:id/time-summary` - Get time breakdown for a queue entry
   - GET `/api/patients/:id/queue-history` - Get all queue entries with time tracking

### UI Changes
1. **Triage Form Enhancement:**
   - Add service point selection (consultation, laboratory, etc.)
   - Add doctor selection dropdown
   - Save assigned doctor/department to triage record

2. **Queue Management:**
   - Show time spent in queue
   - Display wait time, service time
   - Workflow buttons for transitions

3. **Payment Integration:**
   - After payment, automatically create next queue entry
   - Show workflow status

### Service/Helper Functions
- Workflow transition helper functions
- Time calculation utilities
- Queue creation utilities

## Implementation Priority
1. ✅ Enhance triage form (add service point/doctor selection)
2. ✅ Create workflow API endpoints
3. ✅ Update triage API to handle workflow transitions
4. ✅ Add time tracking calculations
5. ✅ Integrate with payment system
6. ✅ Update UI components


