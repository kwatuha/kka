# Testing Guide: Procedures and Orders

## Current Implementation Status

### ✅ Backend (COMPLETE)
- Procedures API routes implemented (`/api/procedures`)
- Patient procedures API routes implemented (`/api/procedures/patient/:patientId`)
- Database schema supports procedures and patient_procedures
- Service charges enhanced with `chargeType`, `duration`, and `unit` fields
- Billing API supports filtering by `chargeType=Consumable`

### ❌ Frontend (INCOMPLETE)
- Missing `proceduresApi` in `lib/api.ts`
- No Procedures section in patient encounter form
- No Orders/Consumables section in patient encounter form

## How to Test Backend (Current Implementation)

### Prerequisites
1. Ensure the API server is running
2. Get an authentication token (login via frontend or API)
3. Have a patient ID available (e.g., patient ID 110)

### 1. Test Procedures API

#### Create a Procedure
```bash
curl -X POST "http://localhost:3001/api/procedures" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "procedureName": "Tooth Extraction",
    "category": "Dental",
    "description": "Simple tooth extraction procedure",
    "duration": 30,
    "cost": 5000
  }'
```

#### List All Procedures
```bash
curl -X GET "http://localhost:3001/api/procedures" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Procedure by ID
```bash
curl -X GET "http://localhost:3001/api/procedures/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Update a Procedure
```bash
curl -X PUT "http://localhost:3001/api/procedures/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "procedureName": "Tooth Extraction - Updated",
    "duration": 45,
    "cost": 6000
  }'
```

### 2. Test Patient Procedures API

#### Record a Procedure for a Patient
```bash
curl -X POST "http://localhost:3001/api/procedures/patient" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "patientId": 110,
    "procedureId": 1,
    "procedureDate": "2026-01-08",
    "notes": "Tooth #32 extracted successfully",
    "complications": null
  }'
```

#### Get Patient Procedures
```bash
curl -X GET "http://localhost:3001/api/procedures/patient/110" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Patient Procedures for Specific Date
```bash
curl -X GET "http://localhost:3001/api/procedures/patient/110?date=2026-01-08" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Consumables/Orders API

#### Create a Consumable Charge
```bash
curl -X POST "http://localhost:3001/api/billing/charges" \
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

#### List Consumables
```bash
curl -X GET "http://localhost:3001/api/billing/charges?chargeType=Consumable" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### List Procedures (as Service Charges)
```bash
curl -X GET "http://localhost:3001/api/billing/charges?chargeType=Procedure" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing with Postman or Browser

### Using Browser DevTools (if logged in)
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to your application
4. Check localStorage for token: `localStorage.getItem('token')`
5. Use the token in your API calls

### Using Postman
1. Import the collection or create new requests
2. Set Authorization header: `Bearer <token>`
3. Set Content-Type: `application/json`
4. Test each endpoint above

## Expected Results

### Successful Procedure Creation
```json
{
  "procedureId": 1,
  "procedureCode": "TOO-EXT",
  "procedureName": "Tooth Extraction",
  "category": "Dental",
  "description": "Simple tooth extraction procedure",
  "duration": 30,
  "cost": 5000,
  "isActive": 1,
  "chargeId": null,
  "createdAt": "2026-01-08T10:00:00.000Z",
  "updatedAt": "2026-01-08T10:00:00.000Z"
}
```

### Successful Patient Procedure Recording
```json
{
  "patientProcedureId": 1,
  "patientId": 110,
  "procedureId": 1,
  "procedureCode": "TOO-EXT",
  "procedureName": "Tooth Extraction",
  "procedureDate": "2026-01-08",
  "performedBy": 1,
  "notes": "Tooth #32 extracted successfully",
  "complications": null,
  "createdAt": "2026-01-08T10:00:00.000Z"
}
```

## Common Issues and Solutions

### Issue: 401 Unauthorized
**Solution**: Make sure you have a valid token. Login first and get the token.

### Issue: 404 Not Found
**Solution**: Check that the API server is running and the endpoint path is correct.

### Issue: 400 Bad Request
**Solution**: Check the request body format and required fields.

### Issue: 500 Internal Server Error
**Solution**: Check server logs for detailed error messages.

## Next Steps (Frontend Implementation)

To complete the implementation, you need to:

1. **Add Procedures API to `lib/api.ts`**
   - Create `proceduresApi` object with CRUD methods
   - Add methods for patient procedures

2. **Update Service Charges API**
   - Add `chargeType` parameter support to `serviceChargeApi.getAll()`

3. **Create Frontend Components**
   - Procedure combobox/autocomplete component
   - Orders/Consumables autocomplete component
   - Add Procedures section to encounter form
   - Add Orders section to encounter form

4. **Update Encounter Form Submission**
   - Save procedures to `patient_procedures` table
   - Create invoice items for procedures and consumables
   - Link procedures to service charges for billing

## Database Verification

To verify the database schema is correct:

```sql
-- Check procedures table
SELECT * FROM procedures LIMIT 5;

-- Check patient_procedures table
SELECT * FROM patient_procedures LIMIT 5;

-- Check service_charges enhancements
DESCRIBE service_charges;
-- Should show: chargeType, duration, unit columns

-- Check procedures with charges
SELECT p.*, sc.name as chargeName, sc.cost as chargeCost
FROM procedures p
LEFT JOIN service_charges sc ON p.chargeId = sc.chargeId
LIMIT 5;
```

