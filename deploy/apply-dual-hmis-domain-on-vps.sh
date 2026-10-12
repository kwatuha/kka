#!/usr/bin/env bash
# Run ON THE VPS (165.22.227.234) with sudo — adds hmis.azimkim.co.ke to nginx + TLS.
# DNS for hmis.azimkim.co.ke must already point to this server.
#
#   scp deploy/apply-dual-hmis-domain-on-vps.sh kunye@165.22.227.234:~/
#   ssh kunye@165.22.227.234
#   sudo bash ~/apply-dual-hmis-domain-on-vps.sh
#
set -euo pipefail

CONF="/etc/nginx/sites-available/kakamega-intellibizafrica.conf"
REPO="${REPO:-$HOME/intellinex-kakamega}"
D1="kakamega.intellibizafrica.co.ke"
D2="hmis.azimkim.co.ke"

if [[ "$EUID" -ne 0 ]]; then
  echo "Run with sudo: sudo bash $0"
  exit 1
fi

if [[ ! -f "$CONF" ]]; then
  if [[ -f "$REPO/deploy/nginx-kakamega-dual-public-host.conf" ]]; then
    cp "$REPO/deploy/nginx-kakamega-dual-public-host.conf" "$CONF"
  else
    echo "Missing $CONF and repo nginx template." >&2
    exit 1
  fi
else
  cp -a "$CONF" "${CONF}.bak.$(date +%Y%m%d%H%M%S)"
  sed -i "s/server_name ${D1};/server_name ${D1} ${D2};/g" "$CONF"
fi

nginx -t

# Expand certificate to include hmis.azimkim.co.ke (webroot already configured on :80)
if command -v certbot >/dev/null 2>&1; then
  certbot certonly --nginx \
    -d "$D1" -d "$D2" \
    --expand \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    || certbot certonly --webroot -w /var/www/html \
      -d "$D1" -d "$D2" \
      --expand \
      --non-interactive \
      --agree-tos \
      --register-unsafely-without-email
fi

# Prefer cert path that includes both names (certbot may use either primary name)
for cert_dir in "/etc/letsencrypt/live/${D2}" "/etc/letsencrypt/live/${D1}"; do
  if [[ -f "${cert_dir}/fullchain.pem" ]]; then
    sed -i "s|ssl_certificate .*|ssl_certificate ${cert_dir}/fullchain.pem;|" "$CONF"
    sed -i "s|ssl_certificate_key .*|ssl_certificate_key ${cert_dir}/privkey.pem;|" "$CONF"
    break
  fi
done

nginx -t
systemctl reload nginx

echo ""
echo "Done. Test:"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' https://${D2}/hmis/"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' https://${D1}/hmis/"
