#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"
export AGENT_CMS_BASE_URL="${AGENT_CMS_BASE_URL:-http://127.0.0.1:3000}"
export AGENT_CMS_AGENT="${AGENT_CMS_AGENT:-}"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

if ! python -c "import speech_recognition, pyaudio" >/dev/null 2>&1; then
  echo "Устанавливаю зависимости sidecar (SpeechRecognition, PyAudio)…"
  pip install -r requirements.txt
fi

echo "Sidecar → ${AGENT_CMS_BASE_URL} (agent=${AGENT_CMS_AGENT:-default})"
exec python main.py
