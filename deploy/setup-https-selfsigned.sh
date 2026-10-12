#!/usr/bin/env bash
#
# Self-signed HTTPS for HMIS when you have no public domain yet (browsers will show a warning).
# Run ON THE SERVER from the repo root (e.g. ~/kiplombe-hmis). Requires openssl.
#
# Usage:
#   bash deploy/setup-https-selfsigned.sh
#   bash deploy/setup-https-selfsigned.sh 41.89.173.8
#   bash deploy/setup-https-selfsigned.sh 41.89.173.8 --redirect
#
# --redirect: HTTP (port 80) for this IP/DNS name redirects to HTTPS; ACME path stays available on default server.
#
set -euo pipefail

CN_IP="41.89.173.8"
REDIRECT=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --redirect) REDIRECT=1; shift ;;
    *) CN_IP="$1"; shift ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
SSL_DIR="$REPO_ROOT/deploy/ssl"
mkdir -p "$SSL_DIR"

if ! command -v openssl >/dev/null 2>&1; then
  echo "Install openssl first (usually preinstalled)."
  exit 1
fi

# Build Subject Alternative Name (IP vs hostname)
if [[ "$CN_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  SAN_EXT="subjectAltName=IP:${CN_IP},IP:127.0.0.1,DNS:localhost"
else
  SAN_EXT="subjectAltName=DNS:${CN_IP},DNS:localhost,IP:127.0.0.1"
fi

echo "==> Generating self-signed certificate (825 days) for CN=$CN_IP"
TMP_CFG="$(mktemp)"
cleanup() { rm -f "$TMP_CFG"; }
trap cleanup EXIT

cat > "$TMP_CFG" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
CN = $CN_IP

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
EOF

if [[ "$CN_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "IP.1 = $CN_IP" >> "$TMP_CFG"
  echo "IP.2 = 127.0.0.1" >> "$TMP_CFG"
  echo "DNS.1 = localhost" >> "$TMP_CFG"
else
  echo "DNS.1 = $CN_IP" >> "$TMP_CFG"
  echo "DNS.2 = localhost" >> "$TMP_CFG"
  echo "IP.1 = 127.0.0.1" >> "$TMP_CFG"
fi

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem" \
  -config "$TMP_CFG" \
  -extensions v3_req

# nginx worker may run as non-root; self-signed only — not for production secrets on shared hosts
chmod 644 "$SSL_DIR/privkey.pem" "$SSL_DIR/fullchain.pem" 2>/dev/null || true

echo "==> Writing TLS server block to deploy/nginx-https.conf"
cat > "$REPO_ROOT/deploy/nginx-https.conf" <<EOF
server {
    listen 443 ssl http2;
    server_name $CN_IP;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
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

if [[ "$REDIRECT" -eq 1 ]]; then
  echo "==> Writing HTTP → HTTPS redirect for $CN_IP"
  cat > "$REPO_ROOT/deploy/nginx-http-redirect.conf" <<EOF
server {
    listen 80;
    server_name $CN_IP;

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
  echo "==> Testing and reloading nginx"
  docker exec kiplombe_nginx nginx -t
  docker exec kiplombe_nginx nginx -s reload
else
  echo "==> Start or recreate nginx after placing files: docker compose -f docker-compose.deploy.yml up -d nginx"
fi

echo ""
echo "==> Self-signed HTTPS ready."
echo "    Open: https://${CN_IP}/  (browser will warn — Advanced → Proceed, or import cert into trust store)."
echo ""
echo "    In ~/kiplombe-hmis/.env set:"
echo "      FRONTEND_URL=https://${CN_IP}"
echo "      NEXT_PUBLIC_BASE_URL=https://${CN_IP}"
echo "    Then: docker compose -f docker-compose.deploy.yml up -d api frontend"
echo ""
