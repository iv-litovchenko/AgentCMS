#!/bin/bash
# Agent CMS + Shell UI + voice sidecar
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
AGENT="${AGENT_CMS_AGENT:-agent-cms-test}"
BASE="http://127.0.0.1:${PORT}"

if ! curl -fsS "${BASE}/api/agents" >/dev/null 2>&1; then
  echo "Запускаю Agent CMS…"
  nohup npm start >> /tmp/agent-cms.launch.log 2>&1 </dev/null &
  for _ in $(seq 1 40); do
    if curl -fsS "${BASE}/api/agents" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
fi

pkill -f "agent-shell/voice-sidecar/main.py" 2>/dev/null || true
sleep 0.3

export AGENT_CMS_BASE_URL="${BASE}"
export AGENT_CMS_AGENT="${AGENT}"
nohup bash agent-shell/voice-sidecar/run.sh >> /tmp/agent-shell-sidecar.log 2>&1 </dev/null &
echo "Sidecar log: /tmp/agent-shell-sidecar.log"

# Sidecar + TTS для режима Sidecar в UI
curl -fsS -X POST "${BASE}/api/shell/settings?agent=${AGENT}" \
  -H "Content-Type: application/json" \
  -d '{"settings":{"voiceInputMode":"sidecar","ttsEngine":"say","ttsEnabled":true}}' >/dev/null || true

URL="${BASE}/shell/index.html?agent=${AGENT}"
echo "→ ${URL}"
open "${URL}"
