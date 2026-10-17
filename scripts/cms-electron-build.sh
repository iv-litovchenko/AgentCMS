#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# shellcheck source=ensure-node-gyp-python.sh
source "$ROOT/scripts/ensure-node-gyp-python.sh"
ensure_node_gyp_python || {
  echo ""
  echo "Не удалось подобрать Python для electron-builder (better-sqlite3)."
  echo "В Control: «Установить зависимости» или в Terminal:"
  echo "  brew install python@3.12"
  exit 1
}

MODE="${1:-pack}"
case "$MODE" in
  pack)
    npx electron-builder --dir
    ;;
  dist)
    npx electron-builder
    ;;
  *)
    echo "Usage: cms-electron-build.sh pack|dist"
    exit 1
    ;;
esac

node scripts/flatten-desktop-dist.js agent-cms
