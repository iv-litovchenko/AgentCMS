#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/load-agent-cms-env.sh
. "$ROOT/scripts/load-agent-cms-env.sh"
CERT_DIR="$ROOT/.dev-certs"
KEY="$CERT_DIR/key.pem"
CERT="$CERT_DIR/cert.pem"
PROVIDER_FILE="$CERT_DIR/provider.txt"

bash "$ROOT/scripts/setup-dev-certs.sh"

if lsof -ti :"$AGENT_CMS_EDITOR_HTTP_PORT" >/dev/null 2>&1; then
  echo "HTTP already running on :$AGENT_CMS_EDITOR_HTTP_PORT — adding HTTPS on :$AGENT_CMS_EDITOR_HTTPS_PORT only."
  export HTTPS_ATTACH=1
else
  echo "Starting HTTP :$AGENT_CMS_EDITOR_HTTP_PORT + HTTPS :$AGENT_CMS_EDITOR_HTTPS_PORT"
fi
echo "iPhone — open Voice HTTPS URL (port ${AGENT_CMS_VOICE_HTTPS_PORT}, not CMS):"
IP="$(cat "$CERT_DIR/last-ip.txt" 2>/dev/null || echo 127.0.0.1)"
echo "  https://${IP}:${AGENT_CMS_VOICE_HTTPS_PORT}/"
echo "  https://${IP}:${AGENT_CMS_VOICE_HTTPS_PORT}/<agent-id>/"
echo ""
echo "CMS editor stays on :$AGENT_CMS_EDITOR_HTTPS_PORT — Voice is a separate app on :${AGENT_CMS_VOICE_HTTPS_PORT}"
if [[ -f "$PROVIDER_FILE" ]] && [[ "$(cat "$PROVIDER_FILE")" == "mkcert" ]]; then
  echo ""
  echo "Certificates: mkcert (trusted by system — no browser warnings)."
else
  echo ""
  echo "Safari: warning → Подробнее → Перейти на сайт"
  echo "Trusted certs: brew install mkcert && mkcert -install && npm run setup:certs"
fi
echo ""

cd "$ROOT"
export HOST="${HOST:-0.0.0.0}"
export VOICE_HOST="${VOICE_HOST:-0.0.0.0}"
export TLS_KEY="$KEY"
export TLS_CERT="$CERT"
export DEV_CERT_PROVIDER="$(cat "$PROVIDER_FILE" 2>/dev/null || echo openssl)"
export VOICE_REDIRECT_SHELL="${VOICE_REDIRECT_SHELL:-1}"
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "node не найден в PATH" >&2
  exit 127
fi
exec "$NODE_BIN" server.js
