#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/docker-mac-lib.sh"

docker_mac_ensure_docker

echo "→ docker compose restart ${UP_SERVICES}"
docker_mac_compose restart ${UP_SERVICES}
echo "Готово."

docker_mac_pause_on_exit
