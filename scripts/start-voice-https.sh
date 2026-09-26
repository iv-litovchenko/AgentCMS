#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/load-agent-cms-env.sh
. "$ROOT/scripts/load-agent-cms-env.sh"
CERT_DIR="$ROOT/.dev-certs"
KEY="$CERT_DIR/key.pem"
CERT="$CERT_DIR/cert.pem"

if [[ ! -f "$KEY" || ! -f "$CERT" ]]; then
  echo "Сначала создайте сертификат: npm run start:https"
  exit 1
fi

cd "$ROOT"
export HOST="${VOICE_HOST:-127.0.0.1}"
export CMS_API_URL="${CMS_API_URL:-http://127.0.0.1:${AGENT_CMS_EDITOR_HTTP_PORT}}"
export VOICE_TLS_KEY="$KEY"
export VOICE_TLS_CERT="$CERT"
export TLS_KEY="$KEY"
export TLS_CERT="$CERT"

echo "Agent CMS Voice HTTPS :${VOICE_TLS_PORT}  (HTTP :${VOICE_PORT})"
echo "CMS API proxy → ${CMS_API_URL}"
echo ""

exec node voice-server.js
