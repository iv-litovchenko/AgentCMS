#!/usr/bin/env bash
# Agent CMS — фоновый HTTP-стек (VPS / Linux / npm start), для Web Control ops.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/load-agent-cms-env.sh
. "$ROOT/scripts/load-agent-cms-env.sh"

RUN_DIR="$ROOT/.run"
PID_FILE="$RUN_DIR/agent-cms-http.pid"
LOG_FILE="$RUN_DIR/agent-cms-http.log"
LOCK_FILE="$RUN_DIR/agent-cms-http.starting"

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export HOST="${HOST:-0.0.0.0}"
export VOICE_HOST="${VOICE_HOST:-0.0.0.0}"
export CONTROL_HOST="${CONTROL_HOST:-0.0.0.0}"
export AGENT_CMS_HTTP_TO_HTTPS="${AGENT_CMS_HTTP_TO_HTTPS:-0}"

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

port_open() {
  local port="$1"
  (echo >/dev/tcp/127.0.0.1/"$port") 2>/dev/null
}

server_listening() {
  port_open "$AGENT_CMS_EDITOR_HTTP_PORT"
}

collect_port_pids() {
  local port pids seen="" pid
  for port in \
    "$AGENT_CMS_EDITOR_HTTP_PORT" \
    "$AGENT_CMS_VOICE_HTTP_PORT" \
    "$AGENT_CMS_COMMANDER_HTTP_PORT" \
    "$AGENT_CMS_MCP_HTTP_PORT"; do
    while IFS= read -r pid; do
      [[ -n "$pid" ]] || continue
      case " $seen " in
        *" $pid "*) ;;
        *)
          seen+="$pid "
          printf '%s\n' "$pid"
          ;;
      esac
    done < <(lsof -ti :"$port" 2>/dev/null || true)
  done
}

kill_pids() {
  local signal="$1"
  shift
  local pid flag="-TERM"
  if [[ "$signal" == "KILL" ]]; then
    flag="-KILL"
  fi
  for pid in "$@"; do
    [[ -n "$pid" ]] || continue
    kill "$flag" "$pid" 2>/dev/null || true
  done
}

stop_by_port() {
  local pass pids
  for pass in 1 2; do
    pids="$(collect_port_pids | tr '\n' ' ')"
    [[ -z "${pids// }" ]] && return 0
    if [[ "$pass" -eq 1 ]]; then
      kill_pids TERM $pids
    else
      kill_pids KILL $pids
    fi
    sleep 0.5
  done
  pids="$(collect_port_pids | tr '\n' ' ')"
  [[ -z "${pids// }" ]]
}

start_direct() {
  cd "$ROOT"

  if is_running && server_listening; then
    echo "Уже запущен (supervisor PID $(cat "$PID_FILE"))."
    echo "Editor: http://127.0.0.1:${AGENT_CMS_EDITOR_HTTP_PORT}/"
    return 0
  fi

  if server_listening; then
    echo "Agent CMS уже слушает порт ${AGENT_CMS_EDITOR_HTTP_PORT}."
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "node не найден в PATH."
    return 1
  fi

  if [[ ! -d "$ROOT/node_modules" ]]; then
    echo "Нет node_modules — сначала npm ci в $ROOT"
    return 1
  fi

  touch "$LOCK_FILE"
  CONTROL_AUTOSTART=0 nohup node "$ROOT/server.js" >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  disown 2>/dev/null || true

  for _ in {1..60}; do
    if server_listening; then
      rm -f "$LOCK_FILE"
      echo "Agent CMS HTTP запущен (supervisor PID $(cat "$PID_FILE"))."
      echo "Editor: http://127.0.0.1:${AGENT_CMS_EDITOR_HTTP_PORT}/"
      echo "Лог: .run/agent-cms-http.log"
      bash "$ROOT/scripts/agent-cms-control-service.sh" start-direct || true
      return 0
    fi
    if ! is_running; then
      break
    fi
    sleep 0.25
  done

  rm -f "$PID_FILE" "$LOCK_FILE"
  echo "Не удалось запустить. Последние строки лога:"
  tail -n 25 "$LOG_FILE" 2>/dev/null || true
  return 1
}

stop_server() {
  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    kill_pids TERM "$pid"
    sleep 0.5
    kill_pids KILL "$pid"
    rm -f "$PID_FILE"
  fi

  if ! stop_by_port; then
    echo "Не все порты освобождены — проверьте lsof."
    return 1
  fi

  rm -f "$LOCK_FILE"
  echo "CMS остановлен (Launcher :${AGENT_CMS_CONTROL_HTTP_PORT} — отдельный процесс, не трогаем)."
}

restart_server() {
  stop_server || true
  sleep 0.6
  start_direct
}

case "${1:-}" in
  start | start-direct)
    start_direct
    ;;
  stop)
    stop_server
    ;;
  restart)
    restart_server
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
    echo "Usage: $0 {start|start-direct|stop|restart|status}"
    exit 1
    ;;
esac
