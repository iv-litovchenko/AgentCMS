#!/bin/bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/launch-common.sh"
launch_check_deps
launch_setup_certs

cd "$ROOT"
echo ""
bash scripts/agent-https-service.sh start-direct

echo ""
echo "Окно Terminal можно закрыть — сервер останется в фоне."
sleep 2
