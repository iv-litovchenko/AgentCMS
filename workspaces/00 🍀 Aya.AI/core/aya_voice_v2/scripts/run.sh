#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."
export TK_SILENCE_DEPRECATION=1
PID_FILE="/tmp/aya_voice_v2.pid"

# Ensure single running instance.
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 0.2
  fi
fi

# Prefer known working voice venv first.
if [ -d "../../../voice/.venv" ]; then
  source "../../../voice/.venv/bin/activate"
else
  # Fallback: bootstrap local venv.
  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
  fi
  source ".venv/bin/activate"
fi

if ! python -c "import pyaudio, speech_recognition, webrtcvad, ollama, pynput; from gtts import gTTS; from dotenv import load_dotenv" >/dev/null 2>&1; then
  pip install -r requirements.txt
fi

# webrtcvad imports pkg_resources; newer setuptools may remove it.
if ! python -c "import pkg_resources" >/dev/null 2>&1; then
  pip install "setuptools<81"
fi

echo "$$" > "$PID_FILE"
exec python -m app.main
