#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

CONTROL_APP="$ROOT/dist/agent-control/Agent Control.app"

if [[ -d "$CONTROL_APP" ]]; then
  export AGENT_CMS_ROOT="$ROOT"
  open "$CONTROL_APP"
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm не найден. Установите Node.js: https://nodejs.org/"
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Первый запуск: npm install..."
  npm install
fi

npm run control:desktop
