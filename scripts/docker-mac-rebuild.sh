#!/usr/bin/env bash
# Mac: rebuild образов + up (после правок server.js, Dockerfile, без mount public).
set -euo pipefail
source "$(dirname "$0")/docker-mac-lib.sh"

AGENT_CMS_SETUP_FROM_WELCOME=1 bash "$DOCKER_MAC_ROOT/scripts/docker-mac-setup.sh"

echo ""
echo "→ docker compose up -d --build ${UP_SERVICES}"
echo "  (может занять 10–30+ мин)"
echo ""

docker_mac_compose up -d --build ${UP_SERVICES}

echo ""
docker_mac_open_urls
echo ""

docker_mac_pause_on_exit
