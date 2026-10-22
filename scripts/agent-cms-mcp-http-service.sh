#!/usr/bin/env bash
# MCP Streamable HTTP — отдельный процесс :3490 (за Caddy /mcp)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/load-agent-cms-env.sh
. "$ROOT/scripts/load-agent-cms-env.sh"

RUN_DIR="$ROOT/.run"
PID_FILE="$RUN_DIR/agent-cms-mcp-http.pid"
LOG_FILE="$RUN_DIR/agent-cms-mcp-http.log"

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
export AGENT_CMS_MCP_HTTP_HOST="${AGENT_CMS_MCP_HTTP_HOST:-127.0.0.1}"
export AGENT_CMS_MCP_HTTP_PORT="${AGENT_CMS_MCP_HTTP_PORT:-3490}"
export AGENT_CMS_MCP_BEHIND_PROXY="${AGENT_CMS_MCP_BEHIND_PROXY:-1}"
export AGENT_CMS_BASE_URL="${AGENT_CMS_BASE_URL:-http://127.0.0.1:${AGENT_CMS_EDITOR_HTTP_PORT}}"

mkdir -p "$RUN_DIR"

load_root_env() {
  if [[ ! -f "$ROOT/.env" ]]; then
    return 0
  fi
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
}

load_root_env

port_open() {
  (echo >/dev/tcp/127.0.0.1/"$1") 2>/dev/null
}

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  kill -0 "$pid" 2>/dev/null
}

ensure_mcp_deps() {
  if [[ ! -d "$ROOT/mcp-server/node_modules/@modelcontextprotocol/sdk" ]]; then
    echo "→ npm ci в mcp-server/ …"
    (cd "$ROOT/mcp-server" && npm ci)
  fi
}

start_mcp() {
  cd "$ROOT"
  ensure_mcp_deps

  if is_running && port_open "$AGENT_CMS_MCP_HTTP_PORT"; then
    echo "MCP HTTP уже запущен (PID $(cat "$PID_FILE"))."
    echo "http://127.0.0.1:${AGENT_CMS_MCP_HTTP_PORT}/mcp"
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "node не найден." >&2
    return 1
  fi

  nohup node "$ROOT/mcp-server/http.js" >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  disown 2>/dev/null || true

  for _ in {1..40}; do
    if port_open "$AGENT_CMS_MCP_HTTP_PORT"; then
      echo "MCP HTTP PID $(cat "$PID_FILE")."
      echo "http://127.0.0.1:${AGENT_CMS_MCP_HTTP_PORT}/mcp"
      echo "Снаружи (Caddy): https://maptex.ru/mcp"
      echo "Лог: .run/agent-cms-mcp-http.log"
      return 0
    fi
    if ! is_running; then
      break
    fi
    sleep 0.25
  done

  rm -f "$PID_FILE"
  echo "MCP не поднялся. tail лога:" >&2
  tail -n 30 "$LOG_FILE" 2>/dev/null || true
  return 1
}

stop_mcp() {
  if is_running; then
    kill -TERM "$(cat "$PID_FILE")" 2>/dev/null || true
    sleep 0.5
    kill -KILL "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  local pid
  pid="$(lsof -ti :"$AGENT_CMS_MCP_HTTP_PORT" 2>/dev/null | head -1 || true)"
  if [[ -n "$pid" ]]; then
    kill -TERM "$pid" 2>/dev/null || true
  fi
  echo "MCP HTTP остановлен."
}

case "${1:-}" in
  start | start-direct)
    start_mcp
    ;;
  stop)
    stop_mcp
    ;;
  restart)
    stop_mcp || true
    sleep 0.4
    start_mcp
    ;;
  status)
    if is_running && port_open "$AGENT_CMS_MCP_HTTP_PORT"; then
      echo "running $(cat "$PID_FILE") listening"
    elif port_open "$AGENT_CMS_MCP_HTTP_PORT"; then
      echo "listening orphan"
    else
      echo "stopped"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
