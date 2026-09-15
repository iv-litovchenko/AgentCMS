#!/bin/bash
set -euo pipefail
# Работает и из корня проекта, и с рабочего стола (через symlink).
SOURCE="${BASH_SOURCE[0]:-$0}"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
ROOT="$(cd -P "$(dirname "$SOURCE")" && pwd)"
export AGENT_CMS_ROOT="$ROOT"
exec bash "$ROOT/scripts/launch-agent-control.sh"
