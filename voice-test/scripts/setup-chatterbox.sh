#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PY="${CHATTERBOX_PY:-python3.11}"
if ! command -v "$PY" >/dev/null 2>&1; then
  PY="python3"
fi

echo "Chatterbox venv → $PY"
"$PY" -m venv .venv-chatterbox
V=.venv-chatterbox/bin
"$V/pip" install -U pip "setuptools>=75" wheel

echo "PyTorch (макс. версия для вашей платформы)…"
if ! "$V/pip" install "torch>=2.6" "torchaudio>=2.6" 2>/dev/null; then
  echo "torch 2.6+ недоступен (часто Intel Mac) — ставим последний доступный…"
  "$V/pip" install torch torchaudio
fi

"$V/pip" install "llvmlite" "numba" --only-binary=:all: || true
"$V/pip" install chatterbox-tts || {
  echo "Полная установка не прошла — пробуем chatterbox-tts --no-deps + зависимости…"
  "$V/pip" install chatterbox-tts --no-deps
  "$V/pip" install "numpy>=1.24,<2" "librosa==0.11.0" s3tokenizer "transformers==5.2.0" \
    "diffusers==0.29.0" resemble-perth "conformer==0.3.2" "safetensors==0.5.3" \
    "pykakasi==2.3.0" pyloudnorm omegaconf huggingface_hub einops
  "$V/pip" install "librosa==0.11.0" --only-binary=:all: || "$V/pip" install "librosa==0.11.0"
}

if "$V/python" -c "from chatterbox.tts import ChatterboxTTS"; then
  echo "Chatterbox импорт OK. Перезапустите: npm run voice:test"
else
  echo "Chatterbox не готов. На Intel Mac нужен Apple Silicon или Linux (torch 2.6+)."
  exit 1
fi
