#!/usr/bin/env bash
# Запуск бара в отдельном окне Terminal.app — обход SIGABRT в HIServices/TkpOpenDisplay
# при Python 3.14 + Tcl/Tk 9 и родителе вроде Cursor (родитель «Exited» → abort в RegisterApplication).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$(command -v python3 || true)"
if [ -z "$PY" ]; then
  echo "python3 не найден в PATH"
  exit 1
fi

F=$(mktemp "${TMPDIR:-/tmp}/aya_bar.XXXXXX")
mv "$F" "${F}.command"
F="${F}.command"
cleanup() { rm -f "$F" 2>/dev/null || true; }
trap cleanup EXIT

{
  printf '%s\n' '#!/bin/bash' 'set -e' 'export TK_SILENCE_DEPRECATION=1'
  printf 'cd %q\n' "$ROOT"
  cat <<'INNER'
PID_FILE=/tmp/aya_bar_v2.pid
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 0.2
  fi
fi
INNER
  printf 'echo $$ > "$PID_FILE"\n'
  printf 'exec %q -m app.main\n' "$PY"
} > "$F"

chmod +x "$F"
open -a Terminal "$F"
# Даём Terminal прочитать файл до удаления по EXIT
sleep 1
trap - EXIT
( sleep 15 && rm -f "$F" ) >/dev/null 2>&1 &

echo "Открыто окно Terminal с Aya Bar (можно закрыть эту вкладку Cursor)."
