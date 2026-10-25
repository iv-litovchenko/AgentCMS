#!/usr/bin/env bash
# Сборка всех Electron .app (Editor + Shell + Control + Commander). Только Mac с Node на хосте.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-pack}"
case "$MODE" in
  pack | dist) ;;
  *)
    echo "Usage: cms-electron-build-all.sh [pack|dist]"
    exit 1
    ;;
esac

echo "== Agent CMS Editor (agent-cms) =="
bash "$ROOT/scripts/cms-electron-build.sh" "$MODE"

for sub in agent-shell agent-control agent-commander; do
  echo ""
  echo "== ${sub} =="
  node "$ROOT/scripts/build-desktop-subapp.js" "$sub" "$MODE"
  node "$ROOT/scripts/flatten-desktop-dist.js" "$sub"
done

echo ""
echo "Готово: dist/agent-cms, dist/agent-shell, dist/agent-control, dist/agent-commander"
