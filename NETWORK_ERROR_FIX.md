# NetworkError Fix Guide

## Issue
NetworkError when attempting to fetch resource from vendor detail page.

## Root Cause
1. **Route Path Mismatch**: The GET route in `vendorProductsRoutes.js` was missing `/products` in the path
2. **API Server Restart Required**: New routes need server restart
3. **Database Tables Missing**: New tables may not exist yet

## Fixes Applied

### 1. Fixed Route Path
✅ Updated `api/routes/vendorProductsRoutes.js`:
- Changed `router.get('/:vendorId', ...)` 
- To `router.get('/:vendorId/products', ...)`

This matches the other routes (POST, PUT, DELETE) and prevents route conflicts.

### 2. Next Steps Required

#### A. Restart API Server
The API server needs to be restarted to load the new routes:

```bash
# If using nodemon, it should auto-restart
# Otherwise, restart manually:
cd api
npm start
# or
npm run dev
```

#### B. Create Database Tables
Run the migration to create the new tables:

```bash
mysql -u root -p kiplombe_hmis < api/database/08_procurement_schema_extensions.sql
```

Or manually run the SQL from `api/database/08_procurement_schema_extensions.sql`

#### C. Verify API Endpoints
Test the endpoints:

```bash
# Test vendor endpoint
curl http://localhost:3001/api/procurement/vendors/31

# Test products endpoint (should return empty array if no products)
curl http://localhost:3001/api/procurement/vendors/31/products

# Test contracts endpoint
curl http://localhost:3001/api/procurement/vendors/31/contracts

# Test documents endpoint
curl http://localhost:3001/api/procurement/vendors/31/documents

# Test issues endpoint
curl http://localhost:3001/api/procurement/vendors/31/issues
```

## Route Structure

All vendor sub-routes are mounted at `/api/procurement/vendors`:

- `GET /api/procurement/vendors/:vendorId/products` ✅
- `POST /api/procurement/vendors/:vendorId/products` ✅
- `GET /api/procurement/vendors/:vendorId/contracts` ✅
- `GET /api/procurement/vendors/:vendorId/documents` ✅
- `GET /api/procurement/vendors/:vendorId/issues` ✅
- `GET /api/procurement/vendors/:id` (main vendor route) ✅
- `GET /api/procurement/vendors/:id/ratings` ✅

The sub-routes are mounted BEFORE the main vendor routes to avoid conflicts.

## Troubleshooting

If NetworkError persists:

1. **Check API server is running**:
   ```bash
   ps aux | grep node
   ```

2. **Check API server logs** for errors:
   ```bash
   # Check console output where server is running
   ```

3. **Check CORS configuration** in `api/app.js`

4. **Check browser console** for specific error messages

5. **Verify API_BASE_URL** in frontend matches server URL



