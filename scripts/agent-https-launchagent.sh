#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.run"
LOG_FILE="$RUN_DIR/agent-cms-https.log"
LABEL="com.agentcms.https"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

mkdir -p "$RUN_DIR" "$HOME/Library/LaunchAgents"

launch_domain() {
  echo "gui/$(id -u)"
}

launch_target() {
  echo "$(launch_domain)/${LABEL}"
}

server_listening() {
  lsof -ti :3443 >/dev/null 2>&1 && lsof -ti :3488 >/dev/null 2>&1
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

install_plist() {
  local node_bin start_script
  node_bin="$(command -v node || true)"
  start_script="$ROOT/scripts/start-mobile-https.sh"

  if [[ -z "$node_bin" ]]; then
    echo "node не найден. Установите Node.js: https://nodejs.org/"
    return 1
  fi
  if [[ ! -x "$start_script" ]]; then
    chmod +x "$start_script"
  fi

  cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${start_script}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>3</integer>
  <key>StandardOutPath</key>
  <string>${LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_FILE}</string>
</dict>
</plist>
EOF

  echo "LaunchAgent установлен: $PLIST"
}

is_loaded() {
  launchctl print "$(launch_target)" >/dev/null 2>&1
}

start_agent() {
  local target domain
  target="$(launch_target)"
  domain="$(launch_domain)"

  if [[ ! -f "$PLIST" ]]; then
    install_plist
  fi

  if is_loaded; then
    launchctl kickstart -k "$target" 2>/dev/null || true
  else
    launchctl bootout "$target" 2>/dev/null || true
    launchctl bootstrap "$domain" "$PLIST"
    launchctl enable "$target" 2>/dev/null || true
    launchctl kickstart -k "$target" 2>/dev/null || true
  fi

  for _ in {1..40}; do
    if server_listening; then
      echo "Agent CMS запущен через LaunchAgent (автоперезапуск включён)."
      echo "https://localhost:3443"
      echo "https://localhost:3488"
      echo "Лог: .run/agent-cms-https.log"
      echo "Остановка: _A-CMS Server Stop.command"
      return 0
    fi
    sleep 0.25
  done

  echo "LaunchAgent загружен, но порты ещё не слушают. Последние строки лога:"
  tail -n 20 "$LOG_FILE" 2>/dev/null || true
  return 1
}

stop_agent() {
  local target
  target="$(launch_target)"
  launchctl bootout "$target" 2>/dev/null || true
  stop_by_port
  echo "Остановлено."
}

status_agent() {
  if is_loaded; then
    if server_listening; then
      echo "running launchagent listening"
    else
      echo "running launchagent starting"
    fi
  elif server_listening; then
    echo "listening orphan"
  else
    echo "stopped"
  fi
}

case "${1:-}" in
  install)
    install_plist
    ;;
  start | ensure)
    start_agent
    ;;
  stop)
    stop_agent
    ;;
  status)
    status_agent
    ;;
  *)
    echo "Usage: $0 {install|start|ensure|stop|status}"
    exit 1
    ;;
esac
