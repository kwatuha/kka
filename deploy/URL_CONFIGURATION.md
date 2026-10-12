# URL Configuration Guide

## Summary of Changes

The codebase has been updated to properly handle URLs in production. Here's what changed:

### ✅ Code Changes Made

1. **`lib/api.ts`**:
   - Updated `API_BASE_URL` to use relative URLs in browser (empty string = same origin)
   - Updated `createDocument()` and `downloadDocument()` to use relative URLs when in browser
   - Server-side rendering still uses absolute URLs when needed

2. **`lib/auth/auth-context.tsx`**:
   - Updated login function to use relative URLs in browser
   - Falls back to public URL only when needed

3. **`docker-compose.deploy.yml`**:
   - Changed `NEXT_PUBLIC_API_URL` default from `http://localhost:3001` to empty string
   - Empty string = relative URLs (recommended for nginx setup)
   - Updated `API_BASE_URL` to use internal Docker network name

### 🔧 Configuration Options

#### Option 1: Relative URLs (Recommended)
**Best for:** Production behind nginx reverse proxy

Set `NEXT_PUBLIC_API_URL` to empty or don't set it:
```bash
NEXT_PUBLIC_API_URL=
```

**How it works:**
- Browser makes requests to `/api/...` (relative)
- Nginx routes `/api/` to the API container
- No hardcoded IP addresses in the code

#### Option 2: Absolute Public URL
**Best for:** When you need explicit public URLs

Set `NEXT_PUBLIC_API_URL` to your public URL:
```bash
NEXT_PUBLIC_API_URL=http://41.89.173.8:8081
```

**How it works:**
- Browser makes requests to `http://41.89.173.8:8081/api/...`
- Works even if nginx routing is misconfigured
- Hardcoded to specific IP (less flexible)

### 📝 Current Configuration

The code is now configured to:
- ✅ Use relative URLs by default (empty string)
- ✅ Fall back to public URL if `NEXT_PUBLIC_API_URL` is set
- ✅ Use internal Docker network URLs for server-side rendering
- ✅ Work correctly with nginx reverse proxy setup

### 🚀 Deployment Steps

1. **Create `.env` file** (optional - only if you want to override defaults):
   ```bash
   cd deploy/
   # See ENV_SETUP.md for template
   ```

2. **Deploy**:
   ```bash
   docker compose -f docker-compose.deploy.yml up -d --build
   ```

3. **Verify**:
   - Frontend: `http://41.89.173.8:8081/`
   - API via nginx: `http://41.89.173.8:8081/api/`

### 🔍 Testing

Test that API calls work:
```bash
# From browser console:
fetch('/api/dashboard/stats').then(r => r.json()).then(console.log)

# Should return dashboard stats without errors
```

### ⚠️ Important Notes

1. **No localhost in production**: The code no longer defaults to `localhost:3001` in browser code
2. **Nginx required**: Relative URLs only work if nginx is properly routing `/api/` requests
3. **Firewall**: Ensure port 8081 is open for external access




