#!/usr/bin/env bash
# Copy dual-host nginx config (gzip + static cache) and reload nginx on the Kakamega VPS.
# Usage: ./deploy/apply-kakamega-nginx-gzip.sh [SERVER_IP] [SSH_KEY_PATH]
set -euo pipefail

SERVER_IP="${1:-165.22.227.234}"
SSH_KEY_PATH="${2:-$HOME/.ssh/id_asusme}"
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF="deploy/nginx-kakamega-dual-public-host.conf"
REMOTE_NAME="kakamega-hmis.conf"

scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new \
  "$LOCAL_ROOT/$CONF" "kunye@${SERVER_IP}:/tmp/${REMOTE_NAME}"

ssh -i "$SSH_KEY_PATH" -o BatchMode=yes "kunye@${SERVER_IP}" bash -s <<REMOTE
set -euo pipefail
sudo cp "/tmp/${REMOTE_NAME}" "/etc/nginx/sites-available/${REMOTE_NAME}"
sudo ln -sf "/etc/nginx/sites-available/${REMOTE_NAME}" "/etc/nginx/sites-enabled/${REMOTE_NAME}"
sudo nginx -t
sudo systemctl reload nginx
echo "nginx reloaded (gzip + /hmis/_next/static cache headers)"
REMOTE
