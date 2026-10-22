#!/usr/bin/env bash
set -euo pipefail
cd /app

ROLE="${1:-cms}"
shift || true

case "$ROLE" in
  cms)
    export CONTROL_AUTOSTART="${CONTROL_AUTOSTART:-0}"
    exec node server.js
    ;;
  mcp)
    exec node mcp-server/http.js
    ;;
  control)
    export CONTROL_AUTOSTART=0
    export AGENT_CMS_DOCKER_OPS="${AGENT_CMS_DOCKER_OPS:-1}"
    export CMS_API_URL="${CMS_API_URL:-http://cms:3000}"
    export AGENT_CMS_BASE_URL="${AGENT_CMS_BASE_URL:-$CMS_API_URL}"
    exec node control-server.js
    ;;
  *)
    echo "Usage: entrypoint cms|mcp|control" >&2
    exit 2
    ;;
esac
