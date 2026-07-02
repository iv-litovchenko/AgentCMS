#!/usr/bin/env bash
cd "$(dirname "$0")"
PORT="${1:-8844}"
echo "→ http://localhost:${PORT}/dashboard_nebula.html"
exec python3 -m http.server "$PORT"
