#!/usr/bin/env bash
#
# Issue Let's Encrypt certs and enable HTTPS in the Docker nginx container.
# Run ON THE SERVER from the repo root (e.g. ~/kiplombe-hmis), with sudo for certbot.
#
# Requirements:
#   - A DNS A record pointing your HOSTNAME to this server's public IP (Let's Encrypt does not issue for bare IPs).
#   - Port 80 reachable for HTTP-01 validation; port 443 open after this script.
#   - kiplombe_nginx running with deploy/certbot/www mounted (normal deploy).
#
# Usage:
#   sudo bash deploy/setup-https.sh your.domain.com you@example.com
#   sudo bash deploy/setup-https.sh your.domain.com you@example.com --redirect
#
# --redirect adds a separate :80 server block for your hostname that redirects to HTTPS (ACME still works).
#
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
REDIRECT="${3:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: sudo bash deploy/setup-https.sh <domain> <email> [--redirect]"
  echo "Example: sudo bash deploy/setup-https.sh hmis.hospital.org admin@hospital.org"
  echo ""
  echo "Note: You need a real hostname (DNS A record → this server). IP-only HTTPS is not supported by Let's Encrypt."
  exit 1
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "Certbot typically needs root to write /etc/letsencrypt. Run: sudo bash $0 $*"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
WEBROOT="$REPO_ROOT/deploy/certbot/www"
mkdir -p "$WEBROOT"

if ! command -v certbot >/dev/null 2>&1; then
  echo "Install certbot first, e.g.: sudo apt update && sudo apt install -y certbot"
  exit 1
fi

echo "==> Requesting certificate for $DOMAIN (webroot: $WEBROOT)"
certbot certonly --webroot \
  -w "$WEBROOT" \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  --keep-until-expiring

CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
if [[ ! -f "$CERT_DIR/fullchain.pem" || ! -f "$CERT_DIR/privkey.pem" ]]; then
  echo "Expected certs not found under $CERT_DIR"
  exit 1
fi

echo "==> Writing TLS server block to deploy/nginx-https.conf"
cat > "$REPO_ROOT/deploy/nginx-https.conf" <<EOF
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 50M;

    location / {
        limit_req zone=general_limit burst=120 nodelay;
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
        proxy_read_timeout 90s;
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    location /api/ {
        limit_req zone=api_limit burst=150 nodelay;
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Connection "";
        proxy_connect_timeout 90s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 2;
        proxy_next_upstream_timeout 20s;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    location /uploads/ {
        proxy_pass http://api/uploads/;
        proxy_set_header Host \$host;
        client_max_body_size 50M;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}
EOF

if [[ "$REDIRECT" == "--redirect" ]]; then
  echo "==> Writing HTTP → HTTPS redirect for $DOMAIN to deploy/nginx-http-redirect.conf"
  cat > "$REPO_ROOT/deploy/nginx-http-redirect.conf" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
fi

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^kiplombe_nginx$'; then
  echo "==> Testing and reloading nginx container"
  docker exec kiplombe_nginx nginx -t
  docker exec kiplombe_nginx nginx -s reload
else
  echo "==> (Start the stack first, then run: docker exec kiplombe_nginx nginx -t && docker exec kiplombe_nginx nginx -s reload)"
fi

echo ""
echo "==> Done. Next steps:"
echo "    1) Open firewall: sudo ufw allow 443/tcp  (if ufw is used)"
echo "    2) In ~/kiplombe-hmis/.env set:"
echo "         FRONTEND_URL=https://$DOMAIN"
echo "         NEXT_PUBLIC_BASE_URL=https://$DOMAIN"
echo "       (and NEXT_PUBLIC_API_URL empty or https://$DOMAIN so the browser uses same-origin /api)"
echo "    3) Restart API + frontend: docker compose -f docker-compose.deploy.yml up -d api frontend"
echo ""
echo "Renewal (cron):"
echo "    sudo certbot renew --quiet --deploy-hook 'docker exec kiplombe_nginx nginx -s reload'"
