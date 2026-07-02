#!/bin/bash
# macOS: Python 3.14 + Homebrew Tcl/Tk 9 при старте Tk вызывает AppKit (NSScreenConfiguration) →
# иногда SIGABRT в HIServices/_RegisterApplication, если процесс привязан к IDE (Cursor) и родитель уже «Exited».
# Обход: ./scripts/run_macos_terminal.sh — бар в отдельном Terminal.app.
# Альтернатива: Python 3.11–3.12 с tkinter или AYA_BAR_USE_SYSTEM_PYTHON=1 (ниже).
set -euo pipefail

cd "$(dirname "$0")/.."
PID_FILE="/tmp/aya_bar_v2.pid"

# Suppress Apple's Tk deprecation warning in terminal output.
export TK_SILENCE_DEPRECATION=1

# Ensure single running instance.
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 0.2
  fi
fi

# Default: use user python (usually Homebrew, same as old Aya bar setup).
# Optional fallback:
#   AYA_BAR_USE_SYSTEM_PYTHON=1 ./scripts/run.sh
# Опциональный фон Nebula: AYA_BAR_NEBULA=1 и pip install Pillow (не ставим автоматически — при сбое pip бар не запускался бы из-за set -e).

if [ "${AYA_BAR_USE_SYSTEM_PYTHON:-0}" = "1" ]; then
  echo "$$" > "$PID_FILE"
  exec /usr/bin/python3 -m app.main
fi

echo "$$" > "$PID_FILE"
exec python3 -m app.main
