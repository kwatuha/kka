#!/bin/bash

# ============================================
# Kiplombe HMIS Remote Deployment Script (Final Fix)
# ============================================
#
# Expected duration: Step 4 (Docker builds) usually dominates — often **15–45+ minutes**
# on a modest VPS because API + frontend use `build --no-cache` (full reinstall + Next.js).
# That is normal, not a hang. Upload (Step 2) depends on your link speed.
#
# Faster repeat deploys (same server, trust layer cache): set before running:
#   DEPLOY_USE_DOCKER_CACHE=1 ./deploy/remote-deploy.sh ...
# This removes `--no-cache` from API/frontend builds (faster, may miss stale layers).
#
# For day-to-day speed (rsync + cached Docker, no full tar wipe), prefer:
#   ./deploy/remote-deploy-fast.sh
#
set -e

# --- Configuration ---
# Usage: ./deploy/remote-deploy.sh [SERVER_IP] [SSH_KEY_PATH]
# Or:   SERVER_IP=x SSH_KEY_PATH=~/.key ./deploy/remote-deploy.sh
SERVER_IP="${SERVER_IP:-41.89.173.8}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"
if [ -n "${1:-}" ]; then SERVER_IP="$1"; fi
if [ -n "${2:-}" ]; then SSH_KEY_PATH="$2"; fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
SSH_CMD="ssh -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no \"$SSH_USER@$SERVER_IP\""

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

# --- Step 1: Package Source ---
print_header "Step 1: Packaging Source Code"
LOCAL_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$LOCAL_DIR"

echo "📁 Current directory: $LOCAL_DIR"
echo "🔍 Verifying source directories exist..."

# Verify critical directories exist
MISSING_DIRS=()
for dir in app components lib api; do
    if [ ! -d "$dir" ]; then
        MISSING_DIRS+=("$dir")
        echo "   ✗ $dir/ NOT FOUND"
    else
        FILE_COUNT=$(find "$dir" -type f 2>/dev/null | wc -l)
        echo "   ✓ $dir/ exists ($FILE_COUNT files)"
    fi
done

if [ ${#MISSING_DIRS[@]} -gt 0 ]; then
    echo -e "${RED}❌ ERROR: Missing required directories: ${MISSING_DIRS[*]}${NC}"
    exit 1
fi

TEMP_DIR=$(mktemp -d)
DEPLOY_ARCHIVE="$TEMP_DIR/kiplombe-hmis-deploy.tar.gz"

echo ""
echo "📦 Creating deployment archive..."
echo "   Archive location: $DEPLOY_ARCHIVE"
echo "   Including:"
echo "     - app/, components/, lib/, api/, public/, styles/, hooks/, scripts/, nginx/, deploy/"
echo "     - package.json, tsconfig.json, next.config.mjs, and other config files"
echo "     - Dockerfile* and docker-entrypoint*.sh"
echo "   Excluding: node_modules/, .next/, .git/, *.log"
echo ""

# Create archive with verbose output
echo "   Creating archive (this may take a moment)..."
if tar -czf "$DEPLOY_ARCHIVE" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='backup_*' \
    app/ api/ components/ public/ styles/ lib/ hooks/ scripts/ nginx/ deploy/ \
    package.json package-lock.json tsconfig.json next.config.mjs \
    tailwind.config.ts postcss.config.mjs components.json \
    docker-compose.deploy.yml Dockerfile* \
    docker-entrypoint*.sh 2>&1; then

    # Verify archive was created
    if [ ! -f "$DEPLOY_ARCHIVE" ]; then
        echo -e "${RED}❌ ERROR: Archive was not created!${NC}"
        exit 1
    fi

    ARCHIVE_SIZE=$(du -h "$DEPLOY_ARCHIVE" | cut -f1)
    ARCHIVE_SIZE_BYTES=$(stat -c%s "$DEPLOY_ARCHIVE" 2>/dev/null || stat -f%z "$DEPLOY_ARCHIVE" 2>/dev/null || echo "unknown")

    echo "   ✓ Archive created successfully"
    echo "   📊 Archive size: $ARCHIVE_SIZE ($ARCHIVE_SIZE_BYTES bytes)"

    # Verify archive contents
    echo "   🔍 Verifying archive contents..."
    FILE_COUNT=$(tar -tzf "$DEPLOY_ARCHIVE" 2>/dev/null | wc -l)
    echo "   ✓ Archive contains $FILE_COUNT files"

    # Check for critical files (single tar listing — avoid scanning the archive N times)
    echo "   🔍 Checking for critical files in archive..."
    CRITICAL_FILES=(
        "app/page.tsx"
        "app/layout.tsx"
        "app/(main)/layout.tsx"
        "components/protected-route.tsx"
        "components/main-layout-content.tsx"
        "components/app-sidebar.tsx"
        "components/ui/sidebar.tsx"
        "lib/auth/auth-context.tsx"
        "package.json"
        "next.config.mjs"
        "docker-compose.deploy.yml"
    )

    TAR_LIST=$(tar -tzf "$DEPLOY_ARCHIVE" 2>/dev/null)
    MISSING_FILES=()
    for file in "${CRITICAL_FILES[@]}"; do
        if echo "$TAR_LIST" | grep -qFx "$file"; then
            echo "     ✓ $file"
        else
            echo "     ✗ $file NOT FOUND in archive"
            MISSING_FILES+=("$file")
        fi
    done

    if [ ${#MISSING_FILES[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  WARNING: Some critical files are missing from archive!${NC}"
        echo "   Missing: ${MISSING_FILES[*]}"
    else
        echo "   ✓ All critical files present"
    fi

    echo ""
else
    echo -e "${RED}❌ ERROR: Failed to create archive!${NC}"
    exit 1
fi

# --- Step 2: Upload ---
print_header "Step 2: Uploading to $SERVER_IP"
ARCHIVE_SIZE=$(du -h "$DEPLOY_ARCHIVE" | cut -f1)
ARCHIVE_SIZE_BYTES=$(stat -c%s "$DEPLOY_ARCHIVE" 2>/dev/null || stat -f%z "$DEPLOY_ARCHIVE" 2>/dev/null || echo "unknown")

echo "📤 Uploading archive to server..."
echo "   Source: $DEPLOY_ARCHIVE"
echo "   Destination: $SSH_USER@$SERVER_IP:/tmp/kiplombe-hmis-deploy.tar.gz"
echo "   Size: $ARCHIVE_SIZE ($ARCHIVE_SIZE_BYTES bytes)"
echo "   This may take a moment depending on your connection speed..."
echo ""

# Upload the archive
if scp -i "$SSH_KEY_PATH" "$DEPLOY_ARCHIVE" "$SSH_USER@$SERVER_IP:/tmp/kiplombe-hmis-deploy.tar.gz" 2>&1; then
    echo "   ✓ Upload completed"
else
    echo -e "${RED}❌ ERROR: Upload failed!${NC}"
    exit 1
fi

# Verify upload on server
echo "   🔍 Verifying upload on server..."
# Use a simpler verification approach with direct SSH command
if eval "$SSH_CMD" "test -f /tmp/kiplombe-hmis-deploy.tar.gz" 2>/dev/null; then
    REMOTE_SIZE=$(eval "$SSH_CMD" "stat -c%s /tmp/kiplombe-hmis-deploy.tar.gz 2>/dev/null" || echo "0")
    if [ "$REMOTE_SIZE" != "0" ] && [ -n "$REMOTE_SIZE" ]; then
        echo "   ✓ Archive verified on server ($REMOTE_SIZE bytes)"

        # Compare sizes (allow small differences due to filesystem differences)
        if [ "$ARCHIVE_SIZE_BYTES" != "unknown" ] && [ -n "$ARCHIVE_SIZE_BYTES" ]; then
            SIZE_DIFF=$((ARCHIVE_SIZE_BYTES - REMOTE_SIZE))
            # Get absolute value
            if [ "$SIZE_DIFF" -lt 0 ]; then
                SIZE_DIFF_ABS=$((-SIZE_DIFF))
            else
                SIZE_DIFF_ABS=$SIZE_DIFF
            fi

            if [ "$SIZE_DIFF_ABS" -lt 1024 ]; then
                echo "   ✓ Archive size matches (upload complete)"
            else
                echo -e "${YELLOW}   ⚠️  WARNING: Archive size difference: Local: $ARCHIVE_SIZE_BYTES, Remote: $REMOTE_SIZE (diff: $SIZE_DIFF_ABS bytes)${NC}"
                echo "   This might be normal due to filesystem differences, continuing..."
            fi
        fi
    else
        echo -e "${YELLOW}   ⚠️  Could not get file size, but file exists - continuing...${NC}"
    fi
else
    # Try alternative verification method
    echo "   Trying alternative verification method..."
    REMOTE_CHECK=$(eval "$SSH_CMD" "ls -lh /tmp/kiplombe-hmis-deploy.tar.gz 2>/dev/null" || echo "")
    if echo "$REMOTE_CHECK" | grep -q "kiplombe-hmis-deploy.tar.gz"; then
        REMOTE_SIZE_ALT=$(echo "$REMOTE_CHECK" | awk '{print $5}')
        echo "   ✓ Archive found on server (size: $REMOTE_SIZE_ALT)"
    else
        echo -e "${YELLOW}   ⚠️  Verification command failed, but upload appeared successful${NC}"
        echo "   Checking /tmp directory contents..."
        eval "$SSH_CMD" "ls -lh /tmp/ 2>/dev/null | grep -E '(kiplombe|deploy|tar)' || echo 'No matching files found'" || true
        echo ""
        echo -e "${YELLOW}   ⚠️  Continuing anyway - if extraction fails, check manually on server${NC}"
        echo "   Manual check: ssh to server and run: ls -lh /tmp/kiplombe-hmis-deploy.tar.gz"
    fi
fi
echo ""

# --- Step 3: Server Extraction & Clean ---
print_header "Step 3: Server Extraction"
eval "$SSH_CMD" << 'REMOTE_EOF'
    set -e
    cd ~/kiplombe-hmis

    echo "🧹 Wiping old files to ensure a clean build context..."
    find . -maxdepth 1 ! -name '.env*' ! -name 'backup_*' ! -name '.' -exec rm -rf {} +

    echo "📦 Extracting..."
    tar -xzf /tmp/kiplombe-hmis-deploy.tar.gz -C .
    rm /tmp/kiplombe-hmis-deploy.tar.gz

    echo "✅ Verifying files were extracted..."
    if [ -d "api" ] && [ -f "api/package.json" ]; then
        echo "   ✓ API directory found with package.json"
        echo "   ✓ API routes: $(find api/routes -name '*.js' 2>/dev/null | wc -l) route file(s)"
    else
        echo "   ⚠️ WARNING: API directory or package.json not found!"
    fi

    echo "   Verifying frontend files..."
    if [ -d "app" ]; then
        APP_FILES=$(find app -type f 2>/dev/null | wc -l)
        echo "   ✓ app/ directory found ($APP_FILES files)"
    else
        echo "   ✗ app/ directory NOT FOUND!"
    fi

    if [ -d "components" ]; then
        COMP_FILES=$(find components -type f 2>/dev/null | wc -l)
        echo "   ✓ components/ directory found ($COMP_FILES files)"
    else
        echo "   ✗ components/ directory NOT FOUND!"
    fi

    if [ -d "lib" ]; then
        LIB_FILES=$(find lib -type f 2>/dev/null | wc -l)
        echo "   ✓ lib/ directory found ($LIB_FILES files)"
        if [ -f "lib/auth/auth-context.tsx" ]; then
            echo "   ✓ lib/auth/auth-context.tsx found"
        else
            echo "   ✗ lib/auth/auth-context.tsx NOT FOUND!"
        fi
    else
        echo "   ✗ lib/ directory NOT FOUND!"
    fi

    if [ -f "package.json" ]; then
        echo "   ✓ package.json found"
    else
        echo "   ✗ package.json NOT FOUND!"
    fi

    if [ -f "next.config.mjs" ]; then
        echo "   ✓ next.config.mjs found"
    else
        echo "   ✗ next.config.mjs NOT FOUND!"
    fi

    chmod +x *.sh 2>/dev/null || true
REMOTE_EOF

# --- Step 4: Build ---
print_header "Step 4: Building and Starting Services"
# DEPLOY_USE_DOCKER_CACHE=1 → omit --no-cache for much faster repeat deploys (optional)
DEPLOY_USE_DOCKER_CACHE="${DEPLOY_USE_DOCKER_CACHE:-0}"
if [ "$DEPLOY_USE_DOCKER_CACHE" = "1" ]; then
  echo -e "${YELLOW}⚡ DEPLOY_USE_DOCKER_CACHE=1 — Docker will use layer cache (faster).${NC}"
  DOCKER_BUILD_EXTRA=""
else
  echo -e "${BLUE}⏳ Step 4 often takes 15–45+ minutes: full API + Next.js builds with --no-cache.${NC}"
  echo "   (Set DEPLOY_USE_DOCKER_CACHE=1 for faster rebuilds if appropriate.)"
  DOCKER_BUILD_EXTRA="--no-cache"
fi
{
  echo "set -e"
  echo "export DOCKER_BUILD_EXTRA=$(printf '%q' "$DOCKER_BUILD_EXTRA")"
  cat <<'BUILD_EOF'
    cd ~/kiplombe-hmis

    echo "🛑 Stopping containers..."
    docker compose -f docker-compose.deploy.yml down --remove-orphans || true

    echo "🗑️ Removing old containers to force fresh build..."
    docker rm -f kiplombe_api kiplombe_frontend 2>/dev/null || true
    # Remove old images if they exist
    docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(kiplombe|api|frontend)" | xargs -r docker rmi -f 2>/dev/null || true

    echo "🏗️ Building API..."
    if [ -n "$DOCKER_BUILD_EXTRA" ]; then
      docker compose -f docker-compose.deploy.yml build --no-cache --pull api
    else
      docker compose -f docker-compose.deploy.yml build --pull api
    fi

    echo "🏗️ Building Frontend..."
    # Verify build context has files before building
    echo "   Verifying build context..."
    if [ ! -d "app" ] || [ ! -d "components" ] || [ ! -d "lib" ]; then
        echo "   ✗ ERROR: Required directories missing in build context!"
        echo "   Current directory: $(pwd)"
        echo "   Contents:"
        ls -la | head -20
        exit 1
    fi
    echo "   ✓ Build context verified"
    if [ -n "$DOCKER_BUILD_EXTRA" ]; then
      docker compose -f docker-compose.deploy.yml build --no-cache frontend
    else
      docker compose -f docker-compose.deploy.yml build frontend
    fi

    echo "🚀 Starting containers..."
    echo "   (compose may show \"Waiting\" until healthchecks pass — frontend can take 10–15+ min)"
    docker compose -f docker-compose.deploy.yml up -d

    echo ""
    echo "================================================================"
    echo "  KIPLOMBE DEPLOY: docker compose up -d finished successfully."
    echo "  All services passed startup/health gates that compose waited for."
    echo "================================================================"
    docker compose -f docker-compose.deploy.yml ps 2>/dev/null || true

    echo "⏳ Waiting for MySQL to be ready..."
    MAX_WAIT=60
    WAIT_COUNT=0
    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        if docker exec kiplombe_mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
            echo "✅ MySQL is ready"
            break
        fi
        echo "   Waiting for MySQL... ($WAIT_COUNT/$MAX_WAIT)"
        sleep 2
        WAIT_COUNT=$((WAIT_COUNT + 2))
    done

    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo "⚠️  MySQL took longer than expected, but continuing..."
    fi
BUILD_EOF
} | ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" bash -s

# --- Step 5: Run Database Migrations ---
print_header "Step 5: Running Database Migrations"
eval "$SSH_CMD" << 'MIGRATE_EOF'
    set -e
    cd ~/kiplombe-hmis

    # Load environment variables
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi

    DB_HOST=${DB_HOST:-mysql_db}
    DB_PORT=${DB_PORT:-3306}
    DB_NAME=${MYSQL_DATABASE:-kiplombe_hmis}
    DB_USER=${MYSQL_USER:-kiplombe_user}
    DB_PASSWORD=${MYSQL_PASSWORD:-kiplombe_pass}
    MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass}

    echo "📋 Running database migrations..."

    # Find and run numbered migration files in order
    MIGRATION_FILES=$(find api/database -name "[0-9][0-9]_*.sql" -type f | sort)

    if [ -z "$MIGRATION_FILES" ]; then
        echo "   ℹ️  No numbered migration files found"
    else
        for migration in $MIGRATION_FILES; do
            echo "   📄 Running: $(basename $migration)"
            if docker exec -i kiplombe_mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < "$migration" 2>/dev/null; then
                echo "      ✅ Success"
            else
                echo "      ⚠️  Migration may have already been applied or has errors (continuing...)"
            fi
        done
    fi

    echo "✅ Database migrations completed"
MIGRATE_EOF

# --- Step 6: Verify and Fix Container Health ---
print_header "Step 6: Verifying Container Health"
eval "$SSH_CMD" << 'HEALTH_EOF'
    set -e
    cd ~/kiplombe-hmis

    echo "⏳ Waiting for services to start (30 seconds)..."
    sleep 30

    echo "🔍 Checking container health..."
    docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    # Check if frontend is unhealthy and restart if needed
    FRONTEND_STATUS=$(docker inspect --format='{{.State.Health.Status}}' kiplombe_frontend 2>/dev/null || echo "unknown")
    if [ "$FRONTEND_STATUS" = "unhealthy" ] || [ "$FRONTEND_STATUS" = "starting" ]; then
        echo "⚠️  Frontend container is $FRONTEND_STATUS, waiting additional time..."
        sleep 60

        # Check again
        FRONTEND_STATUS=$(docker inspect --format='{{.State.Health.Status}}' kiplombe_frontend 2>/dev/null || echo "unknown")
        if [ "$FRONTEND_STATUS" = "unhealthy" ]; then
            echo "🔄 Restarting frontend container..."
            docker compose -f docker-compose.deploy.yml restart frontend
            sleep 30
        fi
    fi

    # Check API health
    API_STATUS=$(docker inspect --format='{{.State.Health.Status}}' kiplombe_api 2>/dev/null || echo "unknown")
    if [ "$API_STATUS" = "unhealthy" ]; then
        echo "🔄 Restarting API container..."
        docker compose -f docker-compose.deploy.yml restart api
        sleep 20
    fi

    echo ""
    echo "📊 Final container status:"
    docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo ""
    echo "📋 Recent logs (last 20 lines):"
    echo "--- Frontend ---"
    docker logs --tail=20 kiplombe_frontend 2>&1 || true
    echo ""
    echo "--- API ---"
    docker logs --tail=20 kiplombe_api 2>&1 || true

    echo ""
    echo "🔍 Diagnostic checks:"
    echo "--- Testing API connectivity from frontend container ---"
    docker exec kiplombe_frontend wget -q -O- http://api:3001/ 2>&1 | head -5 || echo "   ⚠️  API not reachable from frontend container"

    echo ""
    echo "--- Checking frontend environment variables ---"
    docker exec kiplombe_frontend printenv | grep -E "(NEXT_PUBLIC|NODE_ENV)" || true

    echo ""
    echo "--- Testing API endpoint directly ---"
    curl -s -o /dev/null -w "API Status: %{http_code}\n" http://localhost:3001/ || echo "   ⚠️  API not accessible on port 3001"

    echo ""
    echo "--- Verifying Next.js static files (critical for app to load) ---"
    # Wait a bit more for build to complete if still in progress
    if docker logs kiplombe_frontend 2>&1 | grep -q "Building Next.js\|Installing dependencies"; then
        echo "   ⏳ Build still in progress, waiting additional time..."
        sleep 30
    fi

    # Check if static files exist and fix if needed
    if docker exec kiplombe_frontend test -d /app/.next/standalone/.next/static 2>/dev/null; then
        STATIC_COUNT=$(docker exec kiplombe_frontend find /app/.next/standalone/.next/static -type f 2>/dev/null | wc -l)
        if [ "$STATIC_COUNT" -gt 0 ]; then
            echo "   ✓ Static files found in standalone build ($STATIC_COUNT files)"
        else
            echo "   ⚠️  Static files directory exists but is empty - fixing..."
            docker exec kiplombe_frontend bash -c "
                if [ -d /app/.next/static ]; then
                    mkdir -p /app/.next/standalone/.next
                    rm -rf /app/.next/standalone/.next/static
                    cp -r /app/.next/static /app/.next/standalone/.next/ 2>/dev/null || true
                    echo '   ✓ Static files copied to standalone'
                fi
            " || true
            docker compose -f docker-compose.deploy.yml restart frontend
            sleep 10
        fi
    elif docker exec kiplombe_frontend test -d /app/.next/static 2>/dev/null; then
        echo "   ⚠️  Static files exist but not in standalone - fixing..."
        docker exec kiplombe_frontend bash -c "
            mkdir -p /app/.next/standalone/.next
            cp -r /app/.next/static /app/.next/standalone/.next/ 2>/dev/null || true
        " && echo "   ✓ Static files copied to standalone"
        docker compose -f docker-compose.deploy.yml restart frontend
        sleep 10
    else
        echo "   ⚠️  Static files not found - build may still be in progress"
        echo "   Check logs: docker logs -f kiplombe_frontend"
    fi
HEALTH_EOF

# --- Step 7: Final Verification ---
print_header "Step 7: Final Verification"
eval "$SSH_CMD" << VERIFY_EOF
    set -e
    cd ~/kiplombe-hmis

    # Check if containers are running
    RUNNING_CONTAINERS=\$(docker ps --filter "name=kiplombe" --format "{{.Names}}" | wc -l)
    echo "✅ Running containers: \$RUNNING_CONTAINERS"

    # Check if services are accessible
    echo ""
    echo "🌐 Service URLs:"
    if [ -f .env ]; then
        export \$(cat .env | grep -v '^#' | xargs)
    fi
    NGINX_PORT=\${NGINX_PORT:-80}
    SERVER_IP="$SERVER_IP"
    echo "   Frontend: http://\$SERVER_IP:\$NGINX_PORT"
    echo "   API: http://\$SERVER_IP:3001"
    echo "   Health: http://\$SERVER_IP:\$NGINX_PORT/health"

    echo ""
    echo "✅ Deployment verification complete!"
VERIFY_EOF

print_header "🚀 Deployment Complete!"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Kiplombe HMIS — REMOTE DEPLOY COMPLETED SUCCESSFULLY${NC}"
echo -e "${GREEN}  ✓ All scripted steps finished (verify /login in browser if needed).${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ All deployment steps completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Verify the application is accessible at http://$SERVER_IP:80"
echo "   2. Check container logs if you encounter any issues:"
echo "      ssh -i $SSH_KEY_PATH $SSH_USER@$SERVER_IP"
echo "      docker logs -f kiplombe_frontend"
echo "      docker logs -f kiplombe_api"
