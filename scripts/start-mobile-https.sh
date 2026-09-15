#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT/.dev-certs"
KEY="$CERT_DIR/key.pem"
CERT="$CERT_DIR/cert.pem"
PROVIDER_FILE="$CERT_DIR/provider.txt"

bash "$ROOT/scripts/setup-dev-certs.sh"

if lsof -ti :3000 >/dev/null 2>&1; then
  echo "HTTP already running on :3000 — adding HTTPS on :3443 only."
  export HTTPS_ATTACH=1
else
  echo "Starting HTTP :3000 + HTTPS :3443"
fi
echo "iPhone — open Voice HTTPS URL (port ${VOICE_TLS_PORT:-3488}, not CMS):"
IP="$(cat "$CERT_DIR/last-ip.txt" 2>/dev/null || echo 127.0.0.1)"
echo "  https://${IP}:${VOICE_TLS_PORT:-3488}/"
echo "  https://${IP}:${VOICE_TLS_PORT:-3488}/<agent-id>/"
echo ""
echo "CMS editor stays on :3443 — Voice is a separate app on :${VOICE_TLS_PORT:-3488}"
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
export PORT="${PORT:-3000}"
export TLS_PORT="${TLS_PORT:-3443}"
export TLS_KEY="$KEY"
export TLS_CERT="$CERT"
export DEV_CERT_PROVIDER="$(cat "$PROVIDER_FILE" 2>/dev/null || echo openssl)"
export VOICE_TLS_PORT="${VOICE_TLS_PORT:-3488}"
export VOICE_PORT="${VOICE_PORT:-3088}"
export VOICE_REDIRECT_SHELL="${VOICE_REDIRECT_SHELL:-1}"
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "node не найден в PATH" >&2
  exit 127
fi
exec "$NODE_BIN" server.js
