#!/bin/bash
source "$(dirname "$0")/scripts/launch-common.sh"
launch_check_deps
launch_setup_certs

cd "$(dirname "$0")"
echo ""
export AGENT_CMS_DIRECT_START=1
bash scripts/agent-https-service.sh start

if command -v open >/dev/null 2>&1; then
  open "https://localhost:3488/" 2>/dev/null || true
fi

echo ""
echo "Окно Terminal можно закрыть — сервер останется в фоне."
sleep 2
