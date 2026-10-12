# Frontend "Loading..." Issue Fix

## Problem
The production frontend at http://41.89.173.8:80/ shows only "Loading..." text and never loads, while localhost:3002 works fine.

## Root Cause
The authentication check in `ProtectedRoute` component is stuck in loading state because:
1. The API call to `/api/auth/verify` is failing or timing out
2. CORS might be blocking the request
3. The loading state isn't being cleared on error

## Fixes Applied

### 1. Improved Auth Context (`lib/auth/auth-context.tsx`)
- Added safety timeout (10 seconds max) to ensure loading always resolves
- Improved error handling with JWT decode fallback
- Added `credentials: 'include'` to fetch requests for CORS
- Better logging for debugging

### 2. Fixed CORS Configuration (`api/app.js`)
- Updated CORS to allow requests from server IP on ports 80 and 8081
- Made CORS origin matching more flexible for production

### 3. Enhanced Deployment Script (`deploy/remote-deploy.sh`)
- Added diagnostic checks for API connectivity
- Shows environment variables and container health

## Verification Steps

### 1. Check Container Status
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
cd ~/kiplombe-hmis
docker ps --filter "name=kiplombe"
```

### 2. Check Frontend Logs
```bash
docker logs --tail=50 kiplombe_frontend
```

Look for:
- Build errors
- API connection errors
- Environment variable issues

### 3. Check API Logs
```bash
docker logs --tail=50 kiplombe_api
```

Look for:
- CORS errors
- Authentication endpoint errors
- Database connection issues

### 4. Test API Endpoint Directly
```bash
# From the server
curl -v http://localhost:3001/api/auth/verify -H "Authorization: Bearer test"
```

### 5. Test from Browser Console
Open http://41.89.173.8:80/ and in browser console:
```javascript
// Test API connectivity
fetch('/api/auth/verify', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test',
    'Content-Type': 'application/json'
  }
}).then(r => console.log('Status:', r.status)).catch(e => console.error('Error:', e))

// Check environment variables (if accessible)
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
```

### 6. Check Environment Variables
```bash
docker exec kiplombe_frontend printenv | grep NEXT_PUBLIC
docker exec kiplombe_api printenv | grep FRONTEND_URL
```

Expected:
- `NEXT_PUBLIC_API_URL` should be empty (for relative URLs) or set to `http://41.89.173.8:8081`
- `FRONTEND_URL` should be `http://41.89.173.8` or include port 80/8081

## Common Issues and Fixes

### Issue 1: API Not Reachable
**Symptoms:** Network errors in browser console
**Fix:**
```bash
docker compose -f docker-compose.deploy.yml restart api
docker compose -f docker-compose.deploy.yml restart frontend
```

### Issue 2: CORS Errors
**Symptoms:** CORS errors in browser console
**Fix:**
- Check `FRONTEND_URL` in `.env` includes the correct port
- Restart API container after CORS changes

### Issue 3: Build Issues
**Symptoms:** Frontend container shows build errors
**Fix:**
```bash
docker compose -f docker-compose.deploy.yml build --no-cache frontend
docker compose -f docker-compose.deploy.yml up -d frontend
```

### Issue 4: Environment Variables Not Set
**Symptoms:** API calls fail or use wrong URLs
**Fix:**
- Check `.env` file exists in `~/kiplombe-hmis/`
- Ensure `NEXT_PUBLIC_API_URL` is set correctly (or empty for relative URLs)
- Restart containers after changing `.env`

## Quick Fix Script

Run the diagnostic script:
```bash
./deploy/diagnose-frontend.sh
```

This will check:
- Container health
- API connectivity
- Environment variables
- Build status
- Network connectivity

## Expected Behavior After Fix

1. **No Token:** Should redirect to `/login` immediately (no loading)
2. **Valid Token:** Should verify and load dashboard (loading for max 5 seconds)
3. **Invalid Token:** Should clear token and redirect to `/login` (loading for max 5 seconds)
4. **API Unreachable:** Should fall back to JWT decode or redirect to login (loading for max 10 seconds with safety timeout)

## Next Steps

1. Deploy the fixes:
   ```bash
   ./deploy/remote-deploy.sh 41.89.173.8 ~/.ssh/id_asusme
   ```

2. Monitor the deployment logs for any errors

3. After deployment, test the application:
   - Open http://41.89.173.8:80/
   - Should see login page (not stuck on "Loading...")
   - Try logging in
   - Check browser console for any errors

4. If still stuck, run diagnostic script and share output







