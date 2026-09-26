#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/load-agent-cms-env.sh
. "$ROOT/scripts/load-agent-cms-env.sh"
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
  lsof -ti :"$AGENT_CMS_EDITOR_HTTPS_PORT" >/dev/null 2>&1 && lsof -ti :"$AGENT_CMS_VOICE_HTTPS_PORT" >/dev/null 2>&1
}

print_https_urls() {
  echo "$AGENT_CMS_EDITOR_HTTPS_URL"
  echo "$AGENT_CMS_VOICE_HTTPS_URL"
}

start_direct() {
  cd "$ROOT"

  if is_running && server_listening; then
    echo "Уже запущен (supervisor PID $(cat "$PID_FILE"))."
    print_https_urls
    return 0
  fi

  if server_listening; then
    echo "Agent CMS уже работает."
    print_https_urls
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
      print_https_urls
      echo "Лог: .run/agent-cms-https.log"
      echo "Остановка: Agent CMS Control или commands/server-stop.command"
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
    print_https_urls
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
          print_https_urls
          return 0
        fi
        sleep 0.5
      done
    fi
  fi

  date +%s >"$LOCK_FILE"
  echo "Открываю Terminal для запуска (один раз)..."
  open "$ROOT/commands/server-start-background.command"

  for _ in {1..60}; do
    if server_listening; then
      rm -f "$LOCK_FILE"
      echo "Agent CMS запущен."
      print_https_urls
      return 0
    fi
    sleep 0.5
  done

  rm -f "$LOCK_FILE"
  echo "Сервер ещё стартует. Если открылось несколько окон Terminal — закройте лишние."
  echo "$AGENT_CMS_VOICE_HTTPS_URL"
  return 1
}

collect_port_pids() {
  local port pids seen="" pid
  for port in "$AGENT_CMS_VOICE_HTTPS_PORT" "$AGENT_CMS_VOICE_HTTP_PORT" "$AGENT_CMS_EDITOR_HTTPS_PORT" "$AGENT_CMS_EDITOR_HTTP_PORT"; do
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

stop_related_processes() {
  local pid

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    kill_pids TERM "$pid"
  done < <(pgrep -f "$ROOT/scripts/start-mobile-https\\.sh" 2>/dev/null || true)

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    kill_pids TERM "$pid"
  done < <(pgrep -f "npm run start:https" 2>/dev/null || true)
}

stop_by_port() {
  local pass pids

  stop_related_processes

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

stop_server() {
  local still_listening=0

  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    kill_pids TERM "$pid"

    for _ in {1..20}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.25
    done

    kill_pids KILL "$pid"
    rm -f "$PID_FILE"
  fi

  if ! stop_by_port; then
    still_listening=1
  fi

  rm -f "$LOCK_FILE"

  if [[ "$still_listening" -eq 1 ]]; then
    echo "Не удалось полностью остановить сервер — порты ${AGENT_CMS_EDITOR_HTTPS_PORT}/${AGENT_CMS_VOICE_HTTPS_PORT} всё ещё заняты."
    return 1
  fi

  echo "Остановлено."
}

restart_server() {
  if ! server_listening; then
    echo "Сервер не запущен."
    return 1
  fi

  stop_server || return 1
  sleep 0.4
  start_direct
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
