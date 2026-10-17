#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=launch-common.sh
source "$ROOT/scripts/launch-common.sh"

APP="${1:?usage: launch-desktop-app.sh cms|shell|commander [open|rebuild]}"
MODE="${2:-open}"

CMS_APP="$ROOT/dist/agent-cms/Agent CMS.app"
SHELL_APP="$ROOT/dist/agent-shell/Agent Shell.app"
COMMANDER_APP="$ROOT/dist/agent-commander/Agent CMS Commander.app"

launch_check_deps

# electron-builder пересобирает better-sqlite3 через node-gyp (нужен Python ≤3.12 / distutils)
# shellcheck source=ensure-node-gyp-python.sh
source "$ROOT/scripts/ensure-node-gyp-python.sh"

case "$APP" in
  cms)
    # pack (--dir): только .app для локального запуска; dist (DMG/ZIP) — npm run cms:dist вручную
    DIST_SCRIPT="cms:pack"
    OPEN_SCRIPT="cms:open"
    APP_PATH="$CMS_APP"
    LABEL="Agent CMS"
    ;;
  shell)
    DIST_SCRIPT="shell:pack"
    OPEN_SCRIPT="shell:open"
    APP_PATH="$SHELL_APP"
    LABEL="Agent CMS Voice"
    ;;
  commander)
    DIST_SCRIPT="commander:pack"
    OPEN_SCRIPT="commander:open"
    APP_PATH="$COMMANDER_APP"
    LABEL="Agent CMS Commander"
    ;;
  *)
    echo "Неизвестное приложение: $APP"
    exit 1
    ;;
esac

if [[ "$MODE" == "rebuild" ]] || [[ ! -d "$APP_PATH" ]]; then
  if [[ "$APP" == "cms" ]]; then
    ensure_node_gyp_python || {
      echo "Python для сборки Editor не найден. В Control: «Установить зависимости»."
      exit 1
    }
  fi
fi

if [[ "$MODE" == "rebuild" ]]; then
  echo "Сборка $LABEL..."
  npm run "$DIST_SCRIPT"
elif [[ ! -d "$APP_PATH" ]]; then
  echo "$LABEL не найден — первая сборка..."
  npm run "$DIST_SCRIPT"
else
  echo "Открываю $LABEL (без пересборки)..."
fi

npm run "$OPEN_SCRIPT"
