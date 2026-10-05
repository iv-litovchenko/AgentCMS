#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=launch-common.sh
source "$ROOT/scripts/launch-common.sh"

APP="${1:?usage: launch-desktop-app.sh cms|shell [open|rebuild]}"
MODE="${2:-open}"

CMS_APP="$ROOT/dist/agent-cms/Agent CMS.app"
SHELL_APP="$ROOT/dist/agent-shell/Agent Shell.app"

launch_check_deps

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
  *)
    echo "Неизвестное приложение: $APP"
    exit 1
    ;;
esac

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
