#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export AGENT_CMS_ROOT="$ROOT"

CONTROL_APP="$ROOT/dist/agent-control/Agent CMS Control.app"

read_control_port() {
  node -e "
    const { hydrateProcessEnvFromRoot, getAgentCmsPorts } = require('./lib/config/agent-cms-ports');
    hydrateProcessEnvFromRoot(process.cwd());
    console.log(getAgentCmsPorts().controlHttp);
  " 2>/dev/null || echo "3288"
}

open_control_in_browser() {
  local port="$1"
  local host="${CONTROL_HOST:-127.0.0.1}"
  local url="http://${host}:${port}/"

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "$url" >/dev/null 2>&1 || true
  fi
  echo ""
  echo "  Agent CMS Control (Launcher): $url"
  echo "  (тот же UI, что Electron на Mac — открыт в браузере)"
  echo ""
}

if ! command -v npm >/dev/null 2>&1; then
  if [[ "$(uname -s)" == "Darwin" ]] && [[ -d "$CONTROL_APP" ]]; then
    open "$CONTROL_APP"
    exit 0
  fi
  echo "npm не найден. Установите Node.js: https://nodejs.org/"
  exit 1
fi

if [[ ! -d node_modules ]]; then
  if [[ "$(uname -s)" == "Darwin" ]] && [[ -d "$CONTROL_APP" ]]; then
    open "$CONTROL_APP"
    exit 0
  fi
  echo "Зависимости ещё не установлены."
  echo ""
  echo "  1. Двойной клик: install.command  (в корне проекта)"
  echo "  2. Затем снова: welcome.command"
  echo ""
  echo "  Или в Terminal: bash scripts/install-deps.sh"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    read -r -p "Нажмите Enter для выхода..."
  fi
  exit 1
fi

# Linux / VPS: один Launcher в браузере (порт Control поднимается вместе с npm start).
if [[ "$(uname -s)" != "Darwin" ]] || [[ "${CONTROL_LAUNCH_BROWSER:-}" == "1" ]]; then
  PORT="$(read_control_port)"
  open_control_in_browser "$PORT"
  exit 0
fi

# macOS — Electron из репо (актуальный UI), не застывший dist/.app.
# Собранный .app: CONTROL_USE_PACKED_APP=1 welcome.command
if [[ "${CONTROL_USE_PACKED_APP:-}" == "1" ]] && [[ -d "$CONTROL_APP" ]]; then
  open "$CONTROL_APP"
  exit 0
fi

exec npm run control:desktop
