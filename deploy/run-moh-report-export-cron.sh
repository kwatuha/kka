#!/usr/bin/env bash
# Cron-friendly MOH 717/705/710 export for current month (DHA Phase 10.3).
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

API_URL="${MOH_EXPORT_API_URL:-http://127.0.0.1:${API_PORT:-3222}}"
TOKEN="${MOH_EXPORT_CRON_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "Set MOH_EXPORT_CRON_TOKEN (JWT) or call POST /api/moh-reports/scheduled-export manually." >&2
  exit 1
fi

curl -sS -X POST "${API_URL}/api/moh-reports/scheduled-export" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
