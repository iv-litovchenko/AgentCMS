#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT/.dev-certs"
KEY="$CERT_DIR/key.pem"
CERT="$CERT_DIR/cert.pem"

if [[ ! -f "$KEY" || ! -f "$CERT" ]]; then
  echo "Сначала создайте сертификат: npm run start:https"
  exit 1
fi

cd "$ROOT"
export HOST="${VOICE_HOST:-127.0.0.1}"
export VOICE_PORT="${VOICE_PORT:-3088}"
export VOICE_TLS_PORT="${VOICE_TLS_PORT:-3488}"
export CMS_API_URL="${CMS_API_URL:-http://127.0.0.1:3000}"
export VOICE_TLS_KEY="$KEY"
export VOICE_TLS_CERT="$CERT"
export TLS_KEY="$KEY"
export TLS_CERT="$CERT"

echo "Agent CMS Voice HTTPS :${VOICE_TLS_PORT}  (HTTP :${VOICE_PORT})"
echo "CMS API proxy → ${CMS_API_URL}"
echo ""

exec node voice-server.js
