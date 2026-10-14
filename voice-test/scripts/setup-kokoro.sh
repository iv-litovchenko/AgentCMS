#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PY="$("$(dirname "$0")/resolve-python.sh")"

if [[ -x .venv/bin/python ]]; then
  VER="$(.venv/bin/python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
  if [[ "$VER" == "3.14" ]]; then
    echo "Python 3.14: onnxruntime для Kokoro недоступен — пересоздаём .venv на $PY"
    rm -rf .venv
  fi
fi

if [[ ! -x .venv/bin/python ]]; then
  "$PY" -m venv .venv
fi

.venv/bin/pip install -q edge-tts "kokoro-onnx>=0.4.0" soundfile numpy
node scripts/download-kokoro-models.js
echo "Kokoro готов ($PY). Перезапустите: npm run voice:test"
