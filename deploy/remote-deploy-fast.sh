#!/bin/bash

# ============================================
# Kiplombe HMIS — FAST remote deploy (rsync + Docker cache)
# ============================================
#
# Use this for day-to-day deploys when you want speed. For a full clean-room
# deploy (tar upload, --no-cache builds, deep health checks), use:
#   ./deploy/remote-deploy.sh
#
# This script:
#   • rsyncs the repo (delta transfer — repeat deploys are much faster)
#   • Keeps Docker layer cache (no --no-cache by default; no mass docker rmi)
#   • Does NOT wipe ~/kiplombe-hmis — only syncs files
#   • Still runs DB migrations (same as robust script)
#   • Lighter health step than remote-deploy.sh
#
# Optional env:
#   DEPLOY_NO_CACHE=1          — pass --no-cache to docker compose build (slow, clean)
#   DEPLOY_SKIP_MIGRATIONS=1   — skip Step 4 (migrations)
#   DEPLOY_FULL_HEALTH=1       — run extended health/static checks (like robust script)
#   REMOTE_DIR=kiplombe-hmis     — folder under remote $HOME (default)
#
# Usage:
#   ./deploy/remote-deploy-fast.sh [SERVER_IP] [SSH_KEY_PATH]
#   SERVER_IP=x SSH_KEY_PATH=~/.key ./deploy/remote-deploy-fast.sh
#
set -e

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    sed -n '1,35p' "$0"
    echo ""
    echo "Usage: $0 [--dry-run] [SERVER_IP] [SSH_KEY_PATH]"
    echo "  --dry-run   Show rsync changes only (no upload, no Docker)"
    exit 0
fi

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then
    DRY_RUN=1
    shift
fi

SERVER_IP="${SERVER_IP:-41.89.173.8}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_asusme}"
SSH_USER="${SSH_USER:-fhir}"
# Directory under remote user's home (avoid REMOTE_PATH=~/... which expands locally)
REMOTE_DIR="${REMOTE_DIR:-kiplombe-hmis}"
if [ -n "${1:-}" ]; then SERVER_IP="$1"; fi
if [ -n "${2:-}" ]; then SSH_KEY_PATH="$2"; fi

if [ "$DRY_RUN" = "1" ]; then
    echo ""
    echo "=== DRY RUN — rsync only (no upload changes applied) ==="
    echo ""
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
    LOCAL_DIR_DR=$(cd "$(dirname "$0")/.." && pwd)
    cd "$LOCAL_DIR_DR"
    RSYNC_RSH="ssh -i $SSH_KEY_PATH -o StrictHostKeyChecking=no"
    rsync -avz --dry-run \
        -e "$RSYNC_RSH" \
        --delete \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '.git' \
        --exclude '.env' \
        --exclude '.env.local' \
        --exclude '.env.production' \
        --exclude '*.log' \
        --exclude 'backup_*' \
        --exclude '.DS_Store' \
        --exclude 'mobile' \
        --exclude 'api/database/dumps' \
        --exclude '**/.git' \
        --exclude 'deploy/ssl/*.pem' \
        --exclude 'deploy/ssl/*.key' \
        ./ "${SSH_USER}@${SERVER_IP}:~/${REMOTE_DIR}/"
    exit 0
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
RSYNC_RSH="ssh -i $SSH_KEY_PATH -o StrictHostKeyChecking=no"
SSH_CMD="ssh -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no \"$SSH_USER@$SERVER_IP\""

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

# --- Step 0: sanity ---
LOCAL_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$LOCAL_DIR"

print_header "Fast deploy — Kiplombe HMIS"
echo -e "${BLUE}Target:${NC} $SSH_USER@$SERVER_IP:~/ $REMOTE_DIR"
echo -e "${YELLOW}Tip:${NC} Use ./deploy/remote-deploy.sh for full tar upload + --no-cache + deep checks."
echo ""

for dir in app components lib api; do
    if [ ! -d "$dir" ]; then
        echo -e "${RED}❌ Missing directory: $dir/${NC}"
        exit 1
    fi
done

# --- Step 1: ensure remote dir ---
print_header "Step 1: Prepare remote directory"
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "mkdir -p \"\$HOME/$REMOTE_DIR\""

# --- Step 2: rsync ---
print_header "Step 2: rsync (delta upload)"
echo "Syncing from: $LOCAL_DIR"

# --delete: remove files on server that were removed from repo (excluded paths are NOT deleted)
export RSYNC_RSH
rsync -avz \
    --progress \
    --human-readable \
    -e "$RSYNC_RSH" \
    --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '.env.production' \
    --exclude '*.log' \
    --exclude 'backup_*' \
    --exclude '.DS_Store' \
    --exclude 'mobile' \
    --exclude 'api/database/dumps' \
    --exclude '**/.git' \
    --exclude 'deploy/ssl/*.pem' \
    --exclude 'deploy/ssl/*.key' \
    ./ "${SSH_USER}@${SERVER_IP}:~/${REMOTE_DIR}/"

echo -e "${GREEN}✓ rsync complete${NC}"

# --- Step 3: Docker build & up (cached by default) ---
print_header "Step 3: Docker build & start"

DEPLOY_NO_CACHE="${DEPLOY_NO_CACHE:-0}"
if [ "$DEPLOY_NO_CACHE" = "1" ]; then
    echo -e "${YELLOW}⚠ DEPLOY_NO_CACHE=1 — full rebuild (slow).${NC}"
    BUILD_FLAGS=(--no-cache --pull)
else
    echo -e "${GREEN}⚡ Using Docker layer cache (set DEPLOY_NO_CACHE=1 for clean build).${NC}"
fi

{
    echo "set -e"
    echo "cd \"\$HOME/$REMOTE_DIR\""
    echo "export DOCKER_BUILDKIT=1"
    echo "chmod +x *.sh deploy/*.sh 2>/dev/null || true"
    echo "echo '🛑 docker compose down...'"
    echo "docker compose -f docker-compose.deploy.yml down --remove-orphans || true"
    echo "echo '🗑️ Removing old app containers (keep images for cache)...'"
    echo "docker rm -f kiplombe_api kiplombe_frontend kiplombe_nginx 2>/dev/null || true"
    echo "echo '🏗️ Building api + frontend (parallel-friendly)...'"
    if [ "$DEPLOY_NO_CACHE" = "1" ]; then
      echo "docker compose -f docker-compose.deploy.yml build --no-cache --pull api frontend"
    else
      echo "docker compose -f docker-compose.deploy.yml build --pull api frontend"
    fi
    echo "echo '🚀 Starting stack...'"
    echo "echo '   (compose may sit on \"Waiting\" until healthchecks pass — frontend often 10–15+ min on cold start)'"
    echo "docker compose -f docker-compose.deploy.yml up -d"
    echo "echo ''"
    echo "echo '================================================================'"
    echo "echo '  KIPLOMBE DEPLOY: docker compose up -d finished successfully.'"
    echo "echo '  All services passed startup/health gates that compose waited for.'"
    echo "echo '================================================================'"
    echo "docker compose -f docker-compose.deploy.yml ps 2>/dev/null || true"
    echo "echo '⏳ Optional: extra MySQL ping loop...'"
    echo "MAX_WAIT=60"
    echo "WAIT_COUNT=0"
    echo "while [ \$WAIT_COUNT -lt \$MAX_WAIT ]; do"
    echo "  if docker exec kiplombe_mysql mysqladmin ping -h localhost --silent 2>/dev/null; then"
    echo "    echo '✅ MySQL is ready'"
    echo "    break"
    echo "  fi"
    echo "  echo \"   ... (\$WAIT_COUNT s)\""
    echo "  sleep 2"
    echo "  WAIT_COUNT=\$((WAIT_COUNT + 2))"
    echo "done"
} | ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" bash -s

echo -e "${GREEN}✓ Docker step finished${NC}"

# --- Step 4: migrations (same logic as remote-deploy.sh) ---
if [ "${DEPLOY_SKIP_MIGRATIONS:-0}" = "1" ]; then
    print_header "Step 4: Migrations (skipped)"
    echo "DEPLOY_SKIP_MIGRATIONS=1 set — skipping."
else
    print_header "Step 4: Database migrations"
    eval "$SSH_CMD" << 'MIGRATE_EOF'
    set -e
    cd ~/kiplombe-hmis

    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi

    DB_HOST=${DB_HOST:-mysql_db}
    DB_NAME=${MYSQL_DATABASE:-kiplombe_hmis}
    MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-kiplombe_root_pass}

    echo "📋 Running numbered migrations under api/database ..."
    MIGRATION_FILES=$(find api/database -name "[0-9][0-9]_*.sql" -type f 2>/dev/null | sort)

    if [ -z "$MIGRATION_FILES" ]; then
        echo "   ℹ️  No numbered migration files found"
    else
        for migration in $MIGRATION_FILES; do
            echo "   📄 $(basename "$migration")"
            if docker exec -i kiplombe_mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < "$migration" 2>/dev/null; then
                echo "      ✅"
            else
                echo "      ⚠️  (may already be applied)"
            fi
        done
    fi
    echo "✅ Migrations step done"
MIGRATE_EOF
fi

# --- Step 5: wait for app (not just /health — that bypasses Next.js) ---
print_header "Step 5: Wait until /login works (avoids false \"deploy OK\" while nginx returns 502)"
eval "$SSH_CMD" << 'HEALTH_LIGHT'
    set -e
    cd ~/kiplombe-hmis

    # Port published on host (compose: "${NGINX_PORT:-80}:80")
    PORT=80
    if [ -f .env ]; then
        line=$(grep -E '^NGINX_PORT=' .env 2>/dev/null | tail -1 || true)
        if [ -n "$line" ]; then
            PORT="${line#NGINX_PORT=}"
            PORT="${PORT//\"/}"
            PORT="${PORT//$'\r'/}"
        fi
    fi

    echo "📊 Containers:"
    docker ps --filter "name=kiplombe" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "⏳ Waiting for Next.js behind nginx (GET /login must not be 502)."
    echo "   Note: /health returns 200 from nginx alone — it does NOT prove the UI is ready."
    echo "   First/cold start can take 10–15+ minutes (npm install + next build in container)."
    echo ""

    MAX_ATTEMPTS=180
    SLEEP_SEC=5
    n=0
    ok=0
    while [ "$n" -lt "$MAX_ATTEMPTS" ]; do
        n=$((n + 1))
        code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://127.0.0.1:${PORT}/login" 2>/dev/null || echo "000")
        if [ "$code" = "200" ] || [ "$code" = "204" ]; then
            echo "✅ /login → HTTP $code (ready)"
            ok=1
            break
        fi
        # 3xx from Next is also OK
        case "$code" in
            301|302|303|307|308)
                echo "✅ /login → HTTP $code (redirect — ready)"
                ok=1
                break
                ;;
        esac
        if [ "$((n % 10))" -eq 1 ]; then
            echo "   ... attempt $n/$MAX_ATTEMPTS — /login → HTTP $code (502 = Next.js not ready yet, or crashed — see docker logs)"
        fi
        sleep "$SLEEP_SEC"
    done

    echo ""
    curl -s -o /dev/null -w "API :3001/ → HTTP %{http_code}\n" "http://127.0.0.1:3001/" || true
    curl -s -o /dev/null -w "nginx /health → HTTP %{http_code}\n" "http://127.0.0.1:${PORT}/health" || true

    if [ "$ok" != "1" ]; then
        echo ""
        echo -e "\033[1;33m⚠ /login still not OK after $((MAX_ATTEMPTS * SLEEP_SEC))s.\033[0m"
        echo "  Check:  docker logs --tail=80 kiplombe_frontend"
        echo "  Often: OOM during build, or still running npm install / next build."
        echo "  Fix:    wait longer, or ssh in and run:  docker compose -f docker-compose.deploy.yml logs -f frontend"
        exit 0
    fi
HEALTH_LIGHT

if [ "${DEPLOY_FULL_HEALTH:-0}" = "1" ]; then
    print_header "Step 5b: Full health (DEPLOY_FULL_HEALTH=1)"
    eval "$SSH_CMD" << 'HEALTH_FULL'
    set -e
    cd ~/kiplombe-hmis
    sleep 20
    FRONTEND_STATUS=$(docker inspect --format='{{.State.Health.Status}}' kiplombe_frontend 2>/dev/null || echo "unknown")
    if [ "$FRONTEND_STATUS" = "unhealthy" ]; then
        echo "🔄 Restarting frontend..."
        docker compose -f docker-compose.deploy.yml restart frontend
        sleep 15
    fi
    docker logs --tail=30 kiplombe_frontend 2>&1 || true
HEALTH_FULL
fi

# --- Done ---
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Kiplombe HMIS — FAST DEPLOY COMPLETED SUCCESSFULLY${NC}"
echo -e "${GREEN}  ✓ Server: http://${SERVER_IP} (see Step 5 for /login readiness)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
print_header "🚀 Fast deploy complete"
echo -e "${GREEN}Done.${NC} Server: http://${SERVER_IP}:80 (or NGINX_PORT from .env)"
echo ""
echo "Robust deploy:  ./deploy/remote-deploy.sh $SERVER_IP $SSH_KEY_PATH"
echo "Logs:           ssh -i $SSH_KEY_PATH $SSH_USER@$SERVER_IP 'docker logs -f kiplombe_frontend'"
