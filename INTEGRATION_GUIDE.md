# Database Integration Guide

This guide explains the changes made to connect the application to the database and replace hardcoded data.

## What Was Done

### 1. Sample Data Scripts Created

Created 12 sample data SQL scripts in `/api/database/sample_data/`:

- **00_base_data.sql** - Core data (users, roles, departments, service charges)
- **01_patients.sql** - Sample patients
- **02_employees.sql** - Employee data
- **03_doctors.sql** - Doctor specializations and schedules
- **04_inventory.sql** - Inventory items and categories
- **05_pharmacy.sql** - Medications and pharmacy inventory
- **06_laboratory.sql** - Lab test types
- **07_radiology.sql** - Radiology exam types
- **08_inpatient.sql** - Wards and beds
- **09_icu_maternity.sql** - ICU beds and equipment
- **10_insurance.sql** - Insurance providers and packages
- **11_procurement.sql** - Vendors
- **12_finance.sql** - Payment methods, accounts, budgets

**Helper Script**: `run_all.sh` - Runs all scripts in order

### 2. API Routes Updated

Enhanced API routes with full CRUD operations:

- **pharmacyRoutes.js** - Medications, prescriptions, inventory
- **laboratoryRoutes.js** - Lab test types and orders
- **radiologyRoutes.js** - Radiology exam types and orders
- **departmentRoutes.js** - Department management (NEW)
- **patientRoutes.js** - Already had CRUD (no changes needed)
- **inventoryRoutes.js** - Already had basic CRUD (no changes needed)

### 3. Frontend Updated

- **Created `/lib/api.ts`** - Centralized API utility functions
- **Updated `/app/(main)/patients/page.tsx`** - Now fetches from API
- **Updated `/app/(main)/departments/page.tsx`** - Now fetches from API

## How to Use

### Step 1: Load Sample Data

Run the sample data scripts:

```bash
# Option 1: Run all at once
cd /home/dev/transelgon
./api/database/sample_data/run_all.sh

# Option 2: Run individually (if timeouts occur)
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/sample_data/00_base_data.sql
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/sample_data/01_patients.sql
# ... continue with other files
```

### Step 2: Verify Data Loaded

```bash
# Check patient count
docker exec kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis -e "SELECT COUNT(*) FROM patients;"

# Check departments
docker exec kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis -e "SELECT * FROM departments;"
```

### Step 3: Test API Endpoints

The API requires authentication. You'll need to:

1. **Login to get a token** (set env vars locally — never commit credentials):
   ```bash
   export HMIS_TEST_USER='your_username'
   export HMIS_TEST_PASSWORD='your_password'
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"username\":\"${HMIS_TEST_USER}\",\"password\":\"${HMIS_TEST_PASSWORD}\"}"
   ```

2. **Use the token** in API calls:
   ```bash
   curl -X GET http://localhost:3001/api/patients \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

### Step 4: Test Frontend

1. Ensure API is running: `http://localhost:3001`
2. Ensure frontend is running: `http://localhost:3002`
3. Visit:
   - `/patients` - Should show patients from database
   - `/departments` - Should show departments from database

## Authentication Note

**Important**: The API currently requires JWT authentication for all `/api/*` routes (except `/api/auth/*`).

For development/testing, you have two options:

### Option A: Temporarily Disable Auth (Development Only)

Modify `/api/app.js` to skip authentication for certain routes:

```javascript
// Before: app.use('/api', authenticate);
// After: Only protect specific routes
app.use('/api/users', authenticate);
app.use('/api/patients', authenticate);
// ... etc
```

### Option B: Implement Login in Frontend

Create a login page that:
1. Calls `/api/auth/login`
2. Stores the JWT token
3. Includes it in all API requests

Update `/lib/api.ts` to include the token:

```typescript
const token = localStorage.getItem('token');
headers: {
  'Authorization': `Bearer ${token}`,
  ...
}
```

## Next Steps

1. **Load Sample Data**: Run the sample data scripts
2. **Handle Authentication**: Either disable auth for dev or implement login
3. **Update More Pages**: Update other pages that use hardcoded data:
   - `/app/(main)/billing/page.tsx`
   - `/app/(main)/laboratory/page.tsx`
   - `/app/(main)/inventory/page.tsx`
   - `/app/(main)/finance/*` pages
   - etc.

4. **Add More API Endpoints**: As needed for other modules
5. **Error Handling**: Add better error handling and loading states
6. **Pagination**: Implement pagination for large datasets

## File Structure

```
/api/database/sample_data/
  ├── README.md
  ├── run_all.sh
  ├── 00_base_data.sql
  ├── 01_patients.sql
  ├── 02_employees.sql
  ├── ... (other SQL files)

/api/routes/
  ├── pharmacyRoutes.js (UPDATED - Full CRUD)
  ├── laboratoryRoutes.js (UPDATED - Full CRUD)
  ├── radiologyRoutes.js (UPDATED - Full CRUD)
  ├── departmentRoutes.js (NEW - Full CRUD)
  └── ... (other routes)

/lib/
  └── api.ts (NEW - API utility functions)

/app/(main)/
  ├── patients/page.tsx (UPDATED - Uses API)
  └── departments/page.tsx (UPDATED - Uses API)
```

## Troubleshooting

### "401 Unauthorized" Errors

The API requires authentication. Either:
- Implement login and token storage
- Temporarily disable auth for development routes

### "Connection Refused" Errors

- Ensure API container is running: `docker ps | grep kiplombe_api`
- Check API logs: `docker logs kiplombe_api`
- Verify API is accessible: `curl http://localhost:3001`

### "No Data" in Frontend

- Verify sample data was loaded: Check database
- Check browser console for API errors
- Verify API endpoints are working: Test with curl/Postman
- Check CORS settings if calling from browser

### Timeout Errors When Loading Data

- Run SQL files individually instead of all at once
- Check database container resources
- Increase MySQL timeout settings if needed

## Summary

✅ Sample data scripts created (12 files)
✅ API routes updated with CRUD operations
✅ Frontend pages updated to use API
✅ API utility functions created
⏳ Authentication needs to be handled (login or disable for dev)
⏳ More pages need to be updated to use API

