#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.run"
PID_FILE="$RUN_DIR/agent-cms-https.pid"
LOG_FILE="$RUN_DIR/agent-cms-https.log"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

mkdir -p "$RUN_DIR"

is_running() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  rm -f "$PID_FILE"
  return 1
}

start_server() {
  cd "$ROOT"

  if is_running; then
    echo "Уже запущен (PID $(cat "$PID_FILE"))."
    echo "https://localhost:3443"
    return 0
  fi

  nohup bash "$ROOT/scripts/start-mobile-https.sh" >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"

  for _ in {1..20}; do
    if is_running; then
      if lsof -ti :3443 >/dev/null 2>&1; then
        echo "Agent CMS запущен в фоне (PID $(cat "$PID_FILE"))."
        echo "https://localhost:3443"
        echo "Лог: .run/agent-cms-https.log"
        echo "Остановка: _Stop Agent HTTPS.command"
        return 0
      fi
    fi
    sleep 0.25
  done

  rm -f "$PID_FILE"
  echo "Не удалось запустить сервер. Последние строки лога:"
  tail -n 20 "$LOG_FILE" 2>/dev/null || true
  return 1
}

stop_by_port() {
  local stopped=0
  local port

  for port in 3443 3000; do
    local pids
    pids="$(lsof -ti :"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      kill $pids 2>/dev/null || true
      stopped=1
    fi
  done

  if [[ "$stopped" -eq 1 ]]; then
    sleep 0.5
    echo "Остановлено (по порту)."
    return 0
  fi

  echo "Сервер не запущен."
  return 0
}

stop_server() {
  if ! is_running; then
    rm -f "$PID_FILE"
    stop_by_port
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid" 2>/dev/null || true

  for _ in {1..20}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$PID_FILE"
      echo "Остановлено."
      return 0
    fi
    sleep 0.25
  done

  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  stop_by_port
}

case "${1:-}" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  status)
    if is_running; then
      echo "running $(cat "$PID_FILE")"
    else
      echo "stopped"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
