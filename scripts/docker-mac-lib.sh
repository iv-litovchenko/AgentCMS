#!/usr/bin/env bash
# Общее для docker-mac-*.sh (Mac compose).
set -euo pipefail

DOCKER_MAC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DOCKER_MAC_ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export AGENT_CMS_ROOT="$DOCKER_MAC_ROOT"

COMPOSE_FILE="${AGENT_CMS_COMPOSE_FILE:-docker-compose.mac.yml}"

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

docker_mac_up_services() {
  if [[ -n "${AGENT_CMS_DOCKER_UP_SERVICES:-}" ]]; then
    echo "$AGENT_CMS_DOCKER_UP_SERVICES"
    return
  fi
  local services="cms mcp control"
  if [[ "$(docker_mac_read_env_var AGENT_CMS_EDGE_SERVICES_ENABLED 1)" == "1" ]]; then
    services="$services qwenpaw"
  fi
  echo "$services"
}

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

docker_mac_compose_args() {
  local -a args=(-f "$COMPOSE_FILE" -f docker-compose.workspace-mounts.yml)
  if [[ "$(docker_mac_read_env_var AGENT_CMS_EDGE_SERVICES_ENABLED 1)" == "1" ]]; then
    if [[ -f docker-compose.edge-services.mac.yml ]]; then
      args+=(-f docker-compose.edge-services.mac.yml)
    else
      echo "⚠ AGENT_CMS_EDGE_SERVICES_ENABLED=1, но docker-compose.edge-services.mac.yml не найден" >&2
    fi
  fi
  printf '%s\n' "${args[@]}"
}

docker_mac_compose() {
  local -a compose_args=()
  local arg
  while IFS= read -r arg; do
    compose_args+=("$arg")
  done < <(docker_mac_compose_args)
  docker compose "${compose_args[@]}" "$@"
}

docker_mac_print_mcp_cli_hints() {
  local base="$1"
  local http_port
  http_port="$(docker_mac_read_env_var AGENT_CMS_EDITOR_HTTP_PORT "3000")"
  local mcp_https="${base}/app-mcp"
  local mcp_http="http://127.0.0.1:${http_port}/app-mcp"

  echo ""
  echo "  MCP CLI — Claude (без токена, auth none):"
  echo "    claude mcp add --transport http agent-cms ${mcp_https}"
  echo "    claude mcp add --transport http agent-cms ${mcp_http}"
  echo "  MCP CLI — Claude (AGENT_CMS_MCP_TOKEN из .env):"
  echo "    claude mcp add --transport http agent-cms ${mcp_https} \\"
  echo "      --header \"Authorization: Bearer \$AGENT_CMS_MCP_TOKEN\""
  echo "  MCP CLI — Codex (без токена):"
  echo "    codex mcp add agent-cms --url \"${mcp_https}\""
  echo "    codex mcp add agent-cms --url \"${mcp_http}\""
  echo "  MCP CLI — Codex (токен: export AGENT_CMS_MCP_TOKEN=… из .env):"
  echo "    codex mcp add agent-cms --url \"${mcp_https}\" --bearer-token-env-var AGENT_CMS_MCP_TOKEN"
  echo "  Проверка:  claude mcp list  ·  codex mcp list"
  echo "  Удалить:   claude mcp remove agent-cms  ·  codex mcp remove agent-cms"
}

docker_mac_open_urls() {
  local public_url
  public_url="$(docker_mac_read_env_var AGENT_CMS_PUBLIC_URL "https://127.0.0.1:3443")"
  local base="${public_url%/}"
  local control_url="${base}/app-control/"
  local editor_url="${base}/"
  local open_browser="${AGENT_CMS_OPEN_BROWSER:-}"
  if [[ -z "$open_browser" ]]; then
    open_browser="$(docker_mac_read_env_var AGENT_CMS_OPEN_BROWSER "0")"
  fi
  # Mac: по умолчанию только URL в терминале. AGENT_CMS_OPEN_BROWSER=1 — открыть Control в браузере (.env или env)
  if [[ "$open_browser" == "1" ]]; then
    if [[ "$(uname -s)" == "Darwin" ]]; then
      open "$control_url" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$control_url" >/dev/null 2>&1 || true
    fi
  fi
  echo "  MCP-connector: ${base}/app-mcp"
  echo "  Control:  ${control_url}"
  echo "  Editor:   ${editor_url}"
  if [[ "$(docker_mac_read_env_var AGENT_CMS_EDGE_SERVICES_ENABLED 1)" == "1" ]]; then
    local edge_port
    edge_port="$(echo "$base" | sed -E 's|^https?://[^:/]+:([0-9]+)$|\1|')"
    [[ -z "$edge_port" ]] && edge_port="3443"
    echo "  Edge:     https://qwenpaw.localhost:${edge_port}/  (поддомены только *.localhost, не *.127.0.0.1)"
  fi
  docker_mac_print_mcp_cli_hints "$base"
  if [[ "$(uname -s)" == "Darwin" && "$open_browser" != "1" ]]; then
    echo "  (браузер не открываем; agent-cms-cli open control | Electron ACMS-*)"
  fi
}

UP_SERVICES="$(docker_mac_up_services)"
