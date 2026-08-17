#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT/.dev-certs"
KEY="$CERT_DIR/key.pem"
CERT="$CERT_DIR/cert.pem"
IP_FILE="$CERT_DIR/last-ip.txt"

mkdir -p "$CERT_DIR"

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
IP="${IP:-127.0.0.1}"

LAST_IP=""
if [[ -f "$IP_FILE" ]]; then
  LAST_IP="$(cat "$IP_FILE")"
fi

if [[ ! -f "$KEY" || ! -f "$CERT" || "$LAST_IP" != "$IP" ]]; then
  echo "Creating self-signed certificate for IP $IP in .dev-certs/ ..."
  SAN="DNS:localhost,DNS:agent-cms.local,IP:127.0.0.1,IP:${IP}"
  openssl req -x509 -newkey rsa:2048 \
    -keyout "$KEY" -out "$CERT" \
    -days 825 -nodes \
    -subj "/CN=agent-cms.local/O=Agent CMS/C=RU" \
    -addext "subjectAltName=${SAN}"
  echo "$IP" > "$IP_FILE"
fi

if lsof -ti :3000 >/dev/null 2>&1; then
  echo "HTTP already running on :3000 — adding HTTPS on :3443 only."
  export HTTPS_ATTACH=1
else
  echo "Starting HTTP :3000 + HTTPS :3443"
fi
echo "iPhone — open THIS URL (port 3443, not 3000):"
echo "  https://${IP}:3443/shell/"
echo ""
echo "Safari: warning → Подробнее → Перейти на сайт"
echo ""

cd "$ROOT"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export TLS_PORT="${TLS_PORT:-3443}"
export TLS_KEY="$KEY"
export TLS_CERT="$CERT"
exec node server.js
