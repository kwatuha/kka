#!/usr/bin/env bash
# Cron-friendly IDSR weekly export (run e.g. Sunday 23:55 EAT).
# Usage: ./deploy/run-idsr-weekly-cron.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$REPO_ROOT/.env"
  set +a
fi

NODE="${NODE_BIN:-node}"
LOG_DIR="${IDSR_CRON_LOG_DIR:-$REPO_ROOT/logs}"
mkdir -p "$LOG_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="$LOG_DIR/idsr-weekly-${STAMP}.log"

echo "==> IDSR weekly export @ $(date -Is)" | tee -a "$LOG"
"$NODE" "$REPO_ROOT/api/scripts/run-idsr-weekly-export.js" 2>&1 | tee -a "$LOG"
