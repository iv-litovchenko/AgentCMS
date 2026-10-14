#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PY="$(bash "$(dirname "$0")/resolve-python.sh")"

if [[ ! -x .venv/bin/python ]]; then
  "$PY" -m venv .venv
fi

.venv/bin/pip install -q onnxruntime soundfile numpy huggingface_hub \
  misaki phonemizer espeakng-loader

echo "Скачивание zaakirio/kokoro-ru (ONNX + espeak-data + ru_g2p)…"
.venv/bin/python -c "
from huggingface_hub import snapshot_download
from pathlib import Path
root = Path('models/kokoro-ru')
snapshot_download(
    repo_id='zaakirio/kokoro-ru',
    local_dir=str(root),
    allow_patterns=[
        'onnx/model.onnx',
        'onnx/model_dima.onnx',
        'onnx/model_quantized.onnx',
        'voices/*.bin',
        'kokoro-config.json',
        'ru_g2p.py',
        'espeak-data/**',
    ],
)
print('OK', root.resolve())
"

echo "Kokoro RU готов. Перезапустите: npm run voice:test"
