#!/bin/bash
source "$(dirname "$0")/scripts/launch-common.sh"
launch_check_deps
launch_setup_certs

echo ""
echo "Agent CMS: https://localhost:3443"
echo "Остановка: Ctrl+C"
npm run start:https
