#!/usr/bin/env bash
# Mac: docker compose up + открыть Control / Editor в браузере.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export AGENT_CMS_ROOT="$ROOT"

pause_on_exit() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo ""
    read -r -p "Нажмите Enter для выхода..."
  fi
}

if [[ "${AGENT_CMS_WELCOME_LEGACY:-}" == "1" ]]; then
  exec bash "$ROOT/scripts/launch-agent-control.sh"
fi

AGENT_CMS_SETUP_FROM_WELCOME=1 bash "$ROOT/scripts/docker-mac-setup.sh" || exit 1

COMPOSE_FILE="docker-compose.mac.yml"
echo ""
echo "→ docker compose -f ${COMPOSE_FILE} up -d --build"
echo "  (первый раз может занять 10–30+ мин)"
echo ""

docker compose -f "${COMPOSE_FILE}" up -d --build

read_env_var() {
  local key="$1"
  local fallback="$2"
  if [[ -f .env ]]; then
    local line
    line="$(grep -E "^${key}=" .env 2>/dev/null | tail -1 || true)"
    if [[ -n "$line" ]]; then
      local val="${line#*=}"
      val="${val%$'\r'}"
      val="${val#\"}"
      val="${val%\"}"
      echo "$val"
      return
    fi
  fi
  echo "$fallback"
}

PUBLIC_URL="$(read_env_var AGENT_CMS_PUBLIC_URL "http://127.0.0.1:3000")"
PUBLIC_BASE="${PUBLIC_URL%/}"
CONTROL_URL="${PUBLIC_BASE}/app-control/"
EDITOR_URL="${PUBLIC_BASE}/"

open_url() {
  local url="$1"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

open_url "$CONTROL_URL"
echo ""
echo "  Control:  ${CONTROL_URL}"
echo "  Editor:   ${EDITOR_URL}"
echo "  (стек: docker compose -f ${COMPOSE_FILE})"
echo ""

pause_on_exit
