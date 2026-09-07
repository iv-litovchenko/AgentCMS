#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.run"
PID_FILE="$RUN_DIR/agent-cms-https.pid"
LOG_FILE="$RUN_DIR/agent-cms-https.log"
LOCK_FILE="$RUN_DIR/agent-cms-https.starting"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

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

server_listening() {
  lsof -ti :3443 >/dev/null 2>&1 && lsof -ti :3488 >/dev/null 2>&1
}

start_direct() {
  cd "$ROOT"

  if is_running && server_listening; then
    echo "Уже запущен (supervisor PID $(cat "$PID_FILE"))."
    echo "https://localhost:3443"
    echo "https://localhost:3488"
    return 0
  fi

  if server_listening; then
    echo "Agent CMS уже работает."
    echo "https://localhost:3443"
    echo "https://localhost:3488"
    return 0
  fi

  nohup bash -c '
    export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
    while true; do
      echo "[$(date "+%Y-%m-%dT%H:%M:%S%z")] starting server" >>"'"$LOG_FILE"'"
      bash "'"$ROOT"'/scripts/start-mobile-https.sh" >>"'"$LOG_FILE"'" 2>&1 || true
      echo "[$(date "+%Y-%m-%dT%H:%M:%S%z")] server exited ($?), restart in 3s" >>"'"$LOG_FILE"'"
      sleep 3
    done
  ' >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  disown 2>/dev/null || true

  for _ in {1..40}; do
    if server_listening; then
      rm -f "$LOCK_FILE"
      echo "Agent CMS запущен в фоне (supervisor PID $(cat "$PID_FILE"))."
      echo "https://localhost:3443"
      echo "https://localhost:3488"
      echo "Лог: .run/agent-cms-https.log"
      echo "Остановка: _A-CMS Server Stop.command"
      return 0
    fi
    if ! is_running; then
      break
    fi
    sleep 0.25
  done

  rm -f "$PID_FILE" "$LOCK_FILE"
  echo "Не удалось запустить сервер. Последние строки лога:"
  tail -n 20 "$LOG_FILE" 2>/dev/null || true
  return 1
}

start_via_terminal() {
  cd "$ROOT"

  if server_listening; then
    echo "Agent CMS уже работает."
    echo "https://localhost:3443"
    echo "https://localhost:3488"
    return 0
  fi

  if [[ -f "$LOCK_FILE" ]]; then
    local lock_age=$SECONDS
    if [[ -f "$LOCK_FILE" ]]; then
      echo "Запуск уже идёт — жду..."
      for _ in {1..40}; do
        if server_listening; then
          rm -f "$LOCK_FILE"
          echo "Agent CMS запущен."
          echo "https://localhost:3443"
          echo "https://localhost:3488"
          return 0
        fi
        sleep 0.5
      done
    fi
  fi

  date +%s >"$LOCK_FILE"
  echo "Открываю Terminal для запуска (один раз)..."
  open "$ROOT/_A-CMS Server Run Background.command"

  for _ in {1..60}; do
    if server_listening; then
      rm -f "$LOCK_FILE"
      echo "Agent CMS запущен."
      echo "https://localhost:3443"
      echo "https://localhost:3488"
      return 0
    fi
    sleep 0.5
  done

  rm -f "$LOCK_FILE"
  echo "Сервер ещё стартует. Если открылось несколько окон Terminal — закройте лишние."
  echo "https://localhost:3488"
  return 1
}

stop_by_port() {
  local stopped=0
  local port

  for port in 3488 3088 3443 3000; do
    local pids
    pids="$(lsof -ti :"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      kill $pids 2>/dev/null || true
      stopped=1
    fi
  done

  if [[ "$stopped" -eq 1 ]]; then
    sleep 0.5
  fi
}

stop_server() {
  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    kill "$pid" 2>/dev/null || true

    for _ in {1..20}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.25
    done

    kill -9 "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi

  stop_by_port
  rm -f "$LOCK_FILE"
  echo "Остановлено."
}

case "${1:-}" in
  start)
    if [[ "$(uname -s)" == "Darwin" ]]; then
      start_via_terminal
    else
      start_direct
    fi
    ;;
  start-direct)
    start_direct
    ;;
  stop)
    stop_server
    ;;
  status)
    if is_running; then
      if server_listening; then
        echo "running $(cat "$PID_FILE") listening"
      else
        echo "running $(cat "$PID_FILE") starting"
      fi
    elif server_listening; then
      echo "listening orphan"
    else
      echo "stopped"
    fi
    ;;
  *)
    echo "Usage: $0 {start|start-direct|stop|status}"
    exit 1
    ;;
esac
