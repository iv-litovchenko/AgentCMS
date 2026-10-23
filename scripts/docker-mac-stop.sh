#!/usr/bin/env bash
# Mac: stop cms + mcp (Control и volumes остаются).
set -euo pipefail
source "$(dirname "$0")/docker-mac-lib.sh"

docker_mac_ensure_docker

echo "→ docker compose stop cms mcp"
docker_mac_compose stop cms mcp
echo "Готово. Control-контейнер не останавливали. Полный down: npm run docker:down"

docker_mac_pause_on_exit
