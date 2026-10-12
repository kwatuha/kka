#!/bin/bash

# ============================================
# Dump local kiplombe_mysql and restore on remote
# ============================================
# 1. Dumps the database from local Docker container (kiplombe_mysql)
# 2. Uploads the dump to the remote server and restores it there
#
# Usage:
#   ./deploy/dump-and-push-db-to-remote.sh [SERVER_IP] [SSH_KEY_PATH]
#
# Examples:
#   ./deploy/dump-and-push-db-to-remote.sh
#   ./deploy/dump-and-push-db-to-remote.sh 41.89.173.8 ~/.ssh/id_asusme

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$LOCAL_DIR"

# Optional overrides (same as remote-deploy.sh)
SERVER_IP="${1:-${SERVER_IP:-41.89.173.8}}"
SSH_KEY_PATH="${2:-${SSH_KEY_PATH:-~/.ssh/id_asusme}}"

export SERVER_IP SSH_KEY_PATH

echo "=============================================="
echo "Dump local DB (kiplombe_mysql) → Push to remote"
echo "=============================================="
echo "   Remote: $SERVER_IP"
echo "   SSH key: $SSH_KEY_PATH"
echo ""

# Step 1: Dump local database
echo "Step 1: Dumping local database from kiplombe_mysql..."
"$SCRIPT_DIR/dump-local-db.sh" || exit 1

# Find the most recent dump (just created)
OUTPUT_DIR="api/database/ldb"
LATEST_DUMP=$(ls -t "$OUTPUT_DIR"/kiplombe_hmis_local_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_DUMP" ] || [ ! -f "$LATEST_DUMP" ]; then
    echo "ERROR: No dump file found in $OUTPUT_DIR"
    exit 1
fi

echo ""
echo "Step 2: Uploading and restoring on remote..."
"$SCRIPT_DIR/upload-and-restore-remote.sh" "$LATEST_DUMP"

echo ""
echo "Done. Remote database is now a copy of your local kiplombe_mysql."
