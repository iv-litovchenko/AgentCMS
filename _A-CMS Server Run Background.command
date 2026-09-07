#!/bin/bash
source "$(dirname "$0")/scripts/launch-common.sh"
launch_check_deps
launch_setup_certs

echo ""
bash scripts/agent-https-service.sh start
