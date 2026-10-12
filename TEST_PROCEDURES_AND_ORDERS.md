# Testing Procedures and Orders - Step by Step Guide

## ✅ Backend Implementation Status

### Completed:
1. ✅ Database migration deployed (chargeType, duration, unit added to service_charges)
2. ✅ Procedures API routes deployed and working
3. ✅ Billing API updated to support chargeType filtering
4. ✅ API endpoints tested and functional

### Still Needed (Frontend):
1. ❌ Frontend API client functions in lib/api.ts
2. ❌ Procedure combobox component
3. ❌ Orders/Consumables autocomplete component
4. ❌ Add Procedures section to encounter form
5. ❌ Add Orders section to encounter form
6. ❌ Update form submission to save procedures and orders

## How to Test Backend (Current Implementation)

### 1. Test Procedures API

#### Create a Procedure:
```bash
curl -X POST "http://41.89.173.8/api/procedures" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "procedureName": "Tooth Extraction",
    "category": "Dental",
    "description": "Simple tooth extraction",
    "duration": 30,
    "cost": 5000
  }'
```

#### List Procedures:
```bash
curl -X GET "http://41.89.173.8/api/procedures" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Patient Procedures:
```bash
curl -X GET "http://41.89.173.8/api/procedures/patient/110" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Consumables Charges

#### Create a Consumable Charge:
```bash
curl -X POST "http://41.89.173.8/api/billing/charges" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Surgical Gloves",
    "chargeType": "Consumable",
    "category": "Medical Supplies",
    "cost": 2500,
    "unit": "per box"
  }'
```

#### List Consumables:
```bash
curl -X GET "http://41.89.173.8/api/billing/charges?chargeType=Consumable" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Recording a Procedure for a Patient

```bash
curl -X POST "http://41.89.173.8/api/procedures/patient" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "patientId": 110,
    "procedureId": 1,
    "procedureDate": "2026-01-08",
    "notes": "Tooth #32 extracted",
    "complications": null
  }'
```

## Frontend Implementation Needed

The frontend components still need to be created and added to the encounter form.
