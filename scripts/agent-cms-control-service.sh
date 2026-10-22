#!/usr/bin/env bash
# Agent CMS Control (Launcher) — отдельный процесс :3288 (control-server.js).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/load-agent-cms-env.sh
. "$ROOT/scripts/load-agent-cms-env.sh"

RUN_DIR="$ROOT/.run"
PID_FILE="$RUN_DIR/agent-cms-control.pid"
LOG_FILE="$RUN_DIR/agent-cms-control.log"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export CONTROL_HOST="${CONTROL_HOST:-0.0.0.0}"

mkdir -p "$RUN_DIR"

port_open() {
  local port="$1"
  (echo >/dev/tcp/127.0.0.1/"$port") 2>/dev/null
}

control_listening() {
  port_open "$AGENT_CMS_CONTROL_HTTP_PORT"
}

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

resolve_cms_api_url() {
  if [[ -n "${CMS_API_URL:-}" ]]; then
    printf '%s' "${CMS_API_URL%/}"
    return
  fi
  if [[ -n "${AGENT_CMS_EDITOR_HTTP_URL:-}" ]]; then
    printf '%s' "${AGENT_CMS_EDITOR_HTTP_URL%/}"
    return
  fi
  printf 'http://127.0.0.1:%s' "$AGENT_CMS_EDITOR_HTTP_PORT"
}

start_control() {
  cd "$ROOT"

  if is_running && control_listening; then
    echo "Control уже запущен (PID $(cat "$PID_FILE"))."
    echo "Launcher: http://127.0.0.1:${AGENT_CMS_CONTROL_HTTP_PORT}/"
    return 0
  fi

  if control_listening; then
    echo "Порт Control :${AGENT_CMS_CONTROL_HTTP_PORT} уже занят."
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "node не найден в PATH." >&2
    return 1
  fi

  export CMS_API_URL="$(resolve_cms_api_url)"
  export AGENT_CMS_BASE_URL="${AGENT_CMS_BASE_URL:-$CMS_API_URL}"
  export CONTROL_AUTOSTART=0

  nohup node "$ROOT/control-server.js" >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  disown 2>/dev/null || true

  for _ in {1..40}; do
    if control_listening; then
      echo "Agent CMS Control (Launcher) PID $(cat "$PID_FILE")."
      echo "Launcher: http://127.0.0.1:${AGENT_CMS_CONTROL_HTTP_PORT}/"
      echo "CMS API proxy → ${CMS_API_URL}"
      echo "Лог: .run/agent-cms-control.log"
      return 0
    fi
    if ! is_running; then
      break
    fi
    sleep 0.25
  done

  rm -f "$PID_FILE"
  echo "Не удалось запустить Control. Последние строки лога:" >&2
  tail -n 25 "$LOG_FILE" 2>/dev/null || true
  return 1
}

stop_control() {
  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    kill -TERM "$pid" 2>/dev/null || true
    sleep 0.5
    kill -KILL "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi

  if control_listening; then
    local pids
    pids="$(lsof -ti :"$AGENT_CMS_CONTROL_HTTP_PORT" 2>/dev/null | tr '\n' ' ' || true)"
    if [[ -n "${pids// }" ]]; then
      # shellcheck disable=SC2086
      kill -TERM $pids 2>/dev/null || true
      sleep 0.5
      # shellcheck disable=SC2086
      kill -KILL $pids 2>/dev/null || true
    fi
  fi

  echo "Control остановлен."
}

case "${1:-}" in
  start | start-direct)
    start_control
    ;;
  stop)
    stop_control
    ;;
  restart)
    stop_control || true
    sleep 0.4
    start_control
    ;;
  status)
    if is_running && control_listening; then
      echo "running $(cat "$PID_FILE") listening"
    elif control_listening; then
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
