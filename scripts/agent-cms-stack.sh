#!/usr/bin/env bash
# CMS-стек + Control (Launcher) — два процесса (Control поднимает CMS-скрипт).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CMS_SCRIPT="agent-cms-http-service.sh"
if [[ "$(uname -s)" == "Darwin" ]]; then
  CMS_SCRIPT="agent-https-service.sh"
fi

cmd="${1:-start-direct}"
shift || true

case "$cmd" in
  start | start-direct | stop | restart)
    bash "$ROOT/scripts/$CMS_SCRIPT" "$cmd" "$@"
    ;;
  status)
    echo "--- cms ---"
    bash "$ROOT/scripts/$CMS_SCRIPT" status
    echo "--- control ---"
    bash "$ROOT/scripts/agent-cms-control-service.sh" status
    ;;
  stop-all)
    bash "$ROOT/scripts/$CMS_SCRIPT" stop "$@" || true
    bash "$ROOT/scripts/agent-cms-control-service.sh" stop "$@" || true
    ;;
  *)
    echo "Usage: $0 {start-direct|stop|restart|status|stop-all}"
    exit 1
    ;;
esac
