#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

for entry in server.js voice-server.js commander-server.js; do
  if ! node --check "$ROOT/$entry" >/dev/null 2>&1; then
    echo "Синтаксическая ошибка в $entry — сборка desktop отменена."
    node --check "$ROOT/$entry" || true
    exit 1
  fi
done

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
