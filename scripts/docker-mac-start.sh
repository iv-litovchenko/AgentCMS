#!/usr/bin/env bash
# Mac: docker compose up -d (без rebuild) + браузer.
set -euo pipefail
# shellcheck source=docker-mac-lib.sh
source "$(dirname "$0")/docker-mac-lib.sh"

if [[ "${AGENT_CMS_WELCOME_LEGACY:-}" == "1" ]]; then
  exec bash "$DOCKER_MAC_ROOT/scripts/launch-agent-control.sh"
fi

AGENT_CMS_SETUP_FROM_WELCOME=1 bash "$DOCKER_MAC_ROOT/scripts/docker-mac-setup.sh"

echo ""
echo "→ docker compose up -d ${UP_SERVICES}"
docker_mac_compose up -d ${UP_SERVICES}

echo ""
docker_mac_open_urls
echo "  (compose: ${COMPOSE_FILE})"
echo ""

docker_mac_pause_on_exit
