# Environment Variables Setup for Production

## Required Environment Variables

Create a `.env` file in the `deploy/` directory with the following variables:

```bash
# Database Configuration
MYSQL_ROOT_PASSWORD=kiplombe_root_pass
MYSQL_DATABASE=kiplombe_hmis
MYSQL_USER=kiplombe_user
MYSQL_PASSWORD=kiplombe_pass
MYSQL_PORT=3308
DB_HOST=mysql_db
DB_PORT=3306

# API Configuration
PORT=3001
JWT_SECRET=change_this_jwt_secret_in_production
API_BASE_URL=http://41.89.173.8:8081

# Frontend Configuration
# IMPORTANT: Set this to your public URL (without trailing slash)
# This is used at build time and for server-side rendering
# If left empty, the frontend will use relative URLs (recommended for nginx setup)
NEXT_PUBLIC_API_URL=http://41.89.173.8:8081

# Base URL for QR codes and absolute links
# Set this to your public domain (e.g., http://41.89.173.8 or https://yourdomain.com)
# If left empty, will use window.location.origin (works but less optimal for printed QR codes)
NEXT_PUBLIC_BASE_URL=http://41.89.173.8

# Nginx Configuration
NGINX_PORT=8081
```

## Important Notes

1. **NEXT_PUBLIC_API_URL**:
   - If set to `http://41.89.173.8:8081`, API calls will use this absolute URL
   - If left empty (recommended), the frontend will use relative URLs (`/api/...`) which work through nginx
   - The code is configured to use relative URLs by default when this is not set

2. **API_BASE_URL**:
   - Used for internal API-to-API communication
   - Should use the internal Docker network name: `http://kiplombe_api:3001`

3. **JWT_SECRET**:
   - **CHANGE THIS** to a secure random string in production
   - Generate with: `openssl rand -base64 32`

## Setup Instructions

1. Copy this template to create your `.env` file:
   ```bash
   cd deploy/
   cp ENV_SETUP.md .env
   # Edit .env with your actual values
   ```

2. Load environment variables before running docker-compose:
   ```bash
   export $(cat deploy/.env | grep -v '^#' | xargs)
   docker compose -f docker-compose.deploy.yml up -d
   ```

Or docker-compose will automatically load `.env` files in the current directory.




