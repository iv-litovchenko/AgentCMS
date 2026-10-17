#!/usr/bin/env bash
set -euo pipefail
cd /app

ROLE="${1:-cms}"
shift || true

case "$ROLE" in
  cms)
    exec node server.js
    ;;
  mcp)
    exec node mcp-server/http.js
    ;;
  *)
    echo "Usage: entrypoint cms|mcp" >&2
    exit 2
    ;;
esac
