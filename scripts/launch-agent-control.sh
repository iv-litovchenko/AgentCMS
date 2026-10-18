#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

CONTROL_APP="$ROOT/dist/agent-control/Agent CMS Control.app"

if ! command -v npm >/dev/null 2>&1; then
  if [[ -d "$CONTROL_APP" ]]; then
    export AGENT_CMS_ROOT="$ROOT"
    open "$CONTROL_APP"
    exit 0
  fi
  echo "npm не найден. Установите Node.js: https://nodejs.org/"
  exit 1
fi

if [[ ! -d node_modules ]]; then
  if [[ -d "$CONTROL_APP" ]]; then
    export AGENT_CMS_ROOT="$ROOT"
    open "$CONTROL_APP"
    exit 0
  fi
  echo "Зависимости ещё не установлены."
  echo ""
  echo "  1. Двойной клик: install.command  (в корне проекта)"
  echo "  2. Затем снова: welcome.command"
  echo ""
  echo "  Или в Terminal: bash scripts/install-deps.sh"
  read -r -p "Нажмите Enter для выхода..."
  exit 1
fi

# С node_modules — Electron из репо (актуальный UI), не застывший dist/.app.
# Собранный .app: CONTROL_USE_PACKED_APP=1 welcome.command
if [[ "${CONTROL_USE_PACKED_APP:-}" == "1" ]] && [[ -d "$CONTROL_APP" ]]; then
  export AGENT_CMS_ROOT="$ROOT"
  open "$CONTROL_APP"
  exit 0
fi

export AGENT_CMS_ROOT="$ROOT"
exec npm run control:desktop
