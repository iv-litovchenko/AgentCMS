#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PY="$("$(dirname "$0")/resolve-python.sh")"
echo "voice-test venv → $PY"
"$PY" -m venv .venv
.venv/bin/pip install -q edge-tts
echo "Edge TTS готов. Для Kokoro: npm run voice:test:kokoro"
