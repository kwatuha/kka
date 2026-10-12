# NetworkError Fix - Root Cause and Solution

## Root Cause

The NetworkError was caused by **missing database tables**. The new vendor routes I added (`vendorProductsRoutes`, `vendorContractsRoutes`, `vendorDocumentsRoutes`, `vendorIssuesRoutes`) were trying to query tables that don't exist yet:

- `vendor_products`
- `vendor_contracts`
- `vendor_documents`
- `vendor_issues`

When these routes tried to execute SQL queries on non-existent tables, the database threw errors that crashed the entire API server, causing "Empty reply from server" and "Connection reset by peer" errors.

## Solution Applied

I've updated all the new routes to:

1. **Check if tables exist** before querying them
2. **Return empty arrays** instead of crashing if tables don't exist
3. **Gracefully handle errors** to prevent server crashes

### Files Updated:
- ✅ `api/routes/vendorProductsRoutes.js` - GET route now checks for table existence
- ✅ `api/routes/vendorContractsRoutes.js` - GET route now checks for table existence
- ✅ `api/routes/vendorDocumentsRoutes.js` - GET route now checks for table existence
- ✅ `api/routes/vendorIssuesRoutes.js` - GET route now checks for table existence

## Next Steps

### Option 1: Create the Tables (Recommended)
Run the database migration to create the tables:

```bash
mysql -u root -p kiplombe_hmis < api/database/08_procurement_schema_extensions.sql
```

### Option 2: Restart API Server
The server should now work even without the tables (returning empty arrays), but you need to restart it:

```bash
# If using nodemon, it should auto-restart
# Otherwise, restart manually:
cd api
npm start
# or
npm run dev
```

## Testing

After restarting the API server, test:

```bash
# Should work now (returns empty array if tables don't exist)
curl http://localhost:3001/api/procurement/vendors/31/products

# Main vendors endpoint should work
curl http://localhost:3001/api/procurement/vendors
```

## Why the Command Was Hanging

The command `node -e "const routes = require('./routes/vendorProductsRoutes'); ..."` was hanging because:

1. Requiring the route file loads the database connection pool
2. The database connection pool keeps the Node.js event loop alive
3. The process doesn't exit until you explicitly call `process.exit(0)` or close the connection pool

This is normal behavior - the connection pool is designed to keep connections alive for reuse.

