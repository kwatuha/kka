#!/usr/bin/env bash
# Apply migration 133 (missing checklist rows) and sync met/partial via API.
set -euo pipefail
SERVER_IP="${SERVER_IP:-165.22.227.234}"
API_PORT="${API_PORT:-3222}"
SSH_USER="${SSH_USER:-kunye}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_asusme}"
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -x "$ROOT/deploy/apply-migration-133-remote.sh" ]]; then
  "$ROOT/deploy/apply-migration-133-remote.sh"
fi
if [[ -x "$ROOT/deploy/apply-migration-134-remote.sh" ]]; then
  "$ROOT/deploy/apply-migration-134-remote.sh"
fi

API_USER="${EVIDENCE_SYNC_USER:-admin}"
API_PASS="${EVIDENCE_SYNC_PASSWORD:-}"
if [[ -z "$API_PASS" ]]; then
  echo "ERROR: Set EVIDENCE_SYNC_PASSWORD (staff API password — not stored in repo)." >&2
  exit 1
fi

echo "==> POST /api/integrations/evidence/mark-implemented"
TOKEN="$(curl -sS -X POST "http://${SERVER_IP}:${API_PORT}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${API_USER}\",\"password\":\"${API_PASS}\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Could not obtain API token (check EVIDENCE_SYNC_USER/PASSWORD)" >&2
  exit 1
fi

curl -sS -X POST "http://${SERVER_IP}:${API_PORT}/api/integrations/evidence/mark-implemented" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{}' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "==> Checklist summary on server:"
ssh -i "$SSH_KEY_PATH" -o BatchMode=yes "$SSH_USER@$SERVER_IP" bash -s <<'REMOTE'
set -euo pipefail
cd ~/intellinex-kakamega
set -a && source .env && set +a
docker exec -i ${MYSQL_CONTAINER:-db} mysql -u root -p"${REMOTE_MYSQL_ROOT_PASSWORD:-$MYSQL_ROOT_PASSWORD}" \
  "${MYSQL_DATABASE:-kakamega_hmis_db}" -e "
SELECT COALESCE(r.status,'not_started') AS status, COUNT(*) AS c
FROM dha_evidence_items i
LEFT JOIN dha_attestation_responses r ON r.itemId = i.itemId
WHERE i.isActive = 1
GROUP BY COALESCE(r.status,'not_started');
"
REMOTE
