#!/bin/bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/launch-common.sh"
launch_check_deps
launch_setup_certs

cd "$ROOT"
echo ""
echo "Agent CMS: https://localhost:3443"
echo "Остановка: Ctrl+C"
npm run start:https
