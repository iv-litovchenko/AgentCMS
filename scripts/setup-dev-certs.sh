#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT/.dev-certs"
KEY="$CERT_DIR/key.pem"
CERT="$CERT_DIR/cert.pem"
IP_FILE="$CERT_DIR/last-ip.txt"
PROVIDER_FILE="$CERT_DIR/provider.txt"

mkdir -p "$CERT_DIR"

IP="$(node -e "const ip=require('./lib/lan-ip').getLanIPv4(process.argv[1]); console.log(ip || '');" "$ROOT" 2>/dev/null || true)"
if [[ -z "$IP" ]]; then
  IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
fi
IP="${IP:-127.0.0.1}"

LAST_IP=""
if [[ -f "$IP_FILE" ]]; then
  LAST_IP="$(cat "$IP_FILE")"
fi

PROVIDER=""
if [[ -f "$PROVIDER_FILE" ]]; then
  PROVIDER="$(cat "$PROVIDER_FILE")"
fi

need_regen=0
if [[ ! -f "$KEY" || ! -f "$CERT" ]]; then need_regen=1; fi
if [[ "$LAST_IP" != "$IP" ]]; then need_regen=1; fi
if [[ "${FORCE_DEV_CERTS:-0}" == "1" ]]; then need_regen=1; fi

if [[ "$need_regen" == "0" ]]; then
  echo "Dev certificates OK (.dev-certs/, provider=${PROVIDER:-unknown}, IP=${IP})"
  exit 0
fi

if command -v mkcert >/dev/null 2>&1; then
  echo "Creating trusted local certificate with mkcert for IP ${IP} ..."
  if [[ -t 0 ]]; then
    mkcert -install || {
      echo "mkcert -install failed — certificate files will still be created,"
      echo "but the browser may warn until you run: mkcert -install"
    }
  else
    mkcert -install 2>/dev/null || {
      echo "mkcert CA not installed — run once in Terminal: mkcert -install"
    }
  fi
  mkcert -cert-file "$CERT" -key-file "$KEY" \
    localhost 127.0.0.1 ::1 agent-cms.local "$IP"
  echo "mkcert" > "$PROVIDER_FILE"
  echo "$IP" > "$IP_FILE"
  if command -v node >/dev/null 2>&1; then
    node -e "require('./lib/mkcert-ios-ca').exportMkcertRootCa(process.argv[1])" "$ROOT" >/dev/null 2>&1 || true
  fi
  echo "Trusted certificate ready — Safari/Chrome will not show warnings."
  echo "CMS https://localhost:3443  ·  Voice https://localhost:3488"
  exit 0
fi

echo "mkcert not found — creating self-signed certificate (browser warnings expected)."
echo "For trusted HTTPS without warnings:"
echo "  brew install mkcert && mkcert -install && npm run setup:certs"
echo ""
SAN="DNS:localhost,DNS:agent-cms.local,IP:127.0.0.1,IP:${IP}"
openssl req -x509 -newkey rsa:2048 \
  -keyout "$KEY" -out "$CERT" \
  -days 825 -nodes \
  -subj "/CN=agent-cms.local/O=Agent CMS/C=RU" \
  -addext "subjectAltName=${SAN}"
echo "openssl" > "$PROVIDER_FILE"
echo "$IP" > "$IP_FILE"
echo "Self-signed certificate created in .dev-certs/ (valid ~825 days)."
