#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  export AGENT_CMS_EDITOR_HTTP_PORT="${AGENT_CMS_EDITOR_HTTP_PORT:-3000}"
  export AGENT_CMS_EDITOR_HTTPS_PORT="${AGENT_CMS_EDITOR_HTTPS_PORT:-3443}"
  export AGENT_CMS_VOICE_HTTP_PORT="${AGENT_CMS_VOICE_HTTP_PORT:-3088}"
  export AGENT_CMS_VOICE_HTTPS_PORT="${AGENT_CMS_VOICE_HTTPS_PORT:-3488}"
  export PORT="${PORT:-$AGENT_CMS_EDITOR_HTTP_PORT}"
  export TLS_PORT="${TLS_PORT:-$AGENT_CMS_EDITOR_HTTPS_PORT}"
  export VOICE_PORT="${VOICE_PORT:-$AGENT_CMS_VOICE_HTTP_PORT}"
  export VOICE_TLS_PORT="${VOICE_TLS_PORT:-$AGENT_CMS_VOICE_HTTPS_PORT}"
  export AGENT_CMS_EDITOR_HTTPS_URL="https://localhost:${AGENT_CMS_EDITOR_HTTPS_PORT}"
  export AGENT_CMS_VOICE_HTTPS_URL="https://localhost:${AGENT_CMS_VOICE_HTTPS_PORT}"
else
  eval "$("$NODE_BIN" "$ROOT/lib/config/agent-cms-ports.js")"
fi
