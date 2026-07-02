#!/bin/bash
# Запуск Agent Shell как отдельного Electron-приложения.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ -d "dist/shell/mac/Agent Shell.app" ]; then
  open "dist/shell/mac/Agent Shell.app"
  exit 0
fi

echo "Agent Shell.app не собран — запускаю dev-режим (npm run shell:desktop)…"
npm run shell:desktop
