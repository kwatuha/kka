# Procedures and Orders Implementation Plan

## Overview
Add Procedures and Orders/Consumables sections to the Patient Encounter form for tracking and billing.

## Database Changes

### 1. Enhance service_charges table
- Add `chargeType` enum: 'Service', 'Procedure', 'Consumable', 'Medication', 'Other'
- Add `duration` (minutes) for procedures
- Add `unit` for consumables (e.g., "per item", "per box")

### 2. Link procedures to service_charges
- Add `chargeId` to `procedures` table
- This allows procedures to use the unified billing system

## API Routes Needed

### Procedures API (`/api/procedures`)
- GET /api/procedures - List all procedures (with filters)
- GET /api/procedures/:id - Get single procedure
- POST /api/procedures - Create procedure
- PUT /api/procedures/:id - Update procedure
- DELETE /api/procedures/:id - Delete/deactivate procedure

### Patient Procedures API (`/api/patient-procedures`)
- GET /api/patient-procedures?patientId=X&date=Y - Get patient procedures
- POST /api/patient-procedures - Record procedure performed

### Orders/Consumables
- Use existing `/api/billing/charges?chargeType=Consumable` endpoint

## Frontend Changes

### Encounter Form Updates
1. Add "Procedures" tab/section
   - Search/autocomplete from procedures table
   - Select procedure, add notes, complications
   - Link to service_charges for billing

2. Add "Orders/Consumables" tab/section
   - Search/autocomplete from service_charges (chargeType='Consumable')
   - Select consumable, quantity
   - Auto-populate price from service_charges

### Components to Create
- `procedure-combobox.tsx` - Autocomplete for procedures
- `orders-autocomplete.tsx` - Autocomplete for consumables
- Update `patient-encounter-form.tsx` to include new sections

## Billing Integration
When encounter is saved:
1. Create `patient_procedures` records
2. Create invoice items for procedures (using linked service_charges)
3. Create invoice items for orders/consumables (using service_charges)

## Prepopulation
- Load today's procedures and orders when form opens (similar to medications/lab tests)
