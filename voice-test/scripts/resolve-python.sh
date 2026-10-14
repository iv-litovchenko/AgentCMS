#!/usr/bin/env bash
# Python для voice-test: Kokoro нужен onnxruntime — на 3.14 wheels часто нет.
if [[ -n "${VOICE_TEST_PY:-}" ]] && command -v "$VOICE_TEST_PY" >/dev/null 2>&1; then
  echo "$VOICE_TEST_PY"
  exit 0
fi
for c in python3.13 python3.12 python3.11 python3; do
  if command -v "$c" >/dev/null 2>&1; then
    echo "$c"
    exit 0
  fi
done
echo "python3"
