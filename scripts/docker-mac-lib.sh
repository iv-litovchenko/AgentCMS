#!/usr/bin/env bash
# Общее для docker-mac-*.sh (Mac compose).
set -euo pipefail

DOCKER_MAC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DOCKER_MAC_ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export AGENT_CMS_ROOT="$DOCKER_MAC_ROOT"

COMPOSE_FILE="${AGENT_CMS_COMPOSE_FILE:-docker-compose.mac.yml}"
UP_SERVICES="${AGENT_CMS_DOCKER_UP_SERVICES:-cms mcp control}"

docker_mac_pause_on_exit() {
  if [[ "${DOCKER_MAC_NO_PAUSE:-}" == "1" ]]; then
    return 0
  fi
  if [[ "$(uname -s)" == "Darwin" ]] && [[ -t 0 ]]; then
    echo ""
    read -r -p "Нажмите Enter для выхода..."
  fi
}

docker_mac_ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Нужен Docker Desktop: https://www.docker.com/products/docker-desktop/"
    docker_mac_pause_on_exit
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Docker не запущен. Откройте Docker Desktop и повторите."
    docker_mac_pause_on_exit
    exit 1
  fi
}

docker_mac_ensure_env() {
  if [[ ! -f .env ]]; then
    echo "→ Нет .env. Конфиг в git — clone/pull репозитория целиком."
    docker_mac_pause_on_exit
    exit 1
  fi
}

docker_mac_read_env_var() {
  local key="$1"
  local fallback="$2"
  if [[ -f .env ]]; then
    local line
    line="$(grep -E "^${key}=" .env 2>/dev/null | tail -1 || true)"
    if [[ -n "$line" ]]; then
      local val="${line#*=}"
      val="${val%$'\r'}"
      val="${val#\"}"
      val="${val%\"}"
      echo "$val"
      return
    fi
  fi
  echo "$fallback"
}

docker_mac_compose() {
  local -a compose_args=(-f "$COMPOSE_FILE" -f docker-compose.workspace-mounts.yml)
  docker compose "${compose_args[@]}" "$@"
}

docker_mac_open_urls() {
  local public_url
  public_url="$(docker_mac_read_env_var AGENT_CMS_PUBLIC_URL "http://127.0.0.1:3000")"
  local base="${public_url%/}"
  local control_url="${base}/app-control/"
  local editor_url="${base}/"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    open "$control_url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$control_url" >/dev/null 2>&1 || true
  fi
  echo "  Control:  ${control_url}"
  echo "  Editor:   ${editor_url}"
}
