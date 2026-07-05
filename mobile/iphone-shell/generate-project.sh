#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if command -v xcodegen >/dev/null 2>&1; then
  xcodegen generate
  echo "OK: AgentShell.xcodeproj"
else
  echo "Установите xcodegen: brew install xcodegen" >&2
  echo "Или откройте папку AgentShell/ в новом Xcode iOS App project." >&2
  exit 1
fi
