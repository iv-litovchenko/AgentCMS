#!/usr/bin/env bash
# Shared helpers for scripts/agent-cms (no npm publish — symlink from install.sh).
set -euo pipefail

AGENT_CMS_CLI_VERSION="0.0.5-beta"
AGENT_CMS_CONFIG_DIR="${AGENT_CMS_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/agent-cms}"
AGENT_CMS_CONFIG_FILE="$AGENT_CMS_CONFIG_DIR/home"

agent_cms_default_install_dir() {
  local uname_s
  uname_s="$(uname -s)"
  case "$uname_s" in
    Darwin) echo "$HOME/Projects/AgentCMS" ;;
    Linux)
      if [[ -w /opt ]] 2>/dev/null || [[ "$(id -u)" -eq 0 ]]; then
        echo "/opt/agent-cms"
      else
        echo "$HOME/Projects/AgentCMS"
      fi
      ;;
    MINGW* | MSYS* | CYGWIN*) echo "$HOME/Projects/AgentCMS" ;;
    *) echo "$HOME/Projects/AgentCMS" ;;
  esac
}

agent_cms_read_config_home() {
  if [[ -n "${AGENT_CMS_HOME:-}" ]]; then
    echo "${AGENT_CMS_HOME%/}"
    return
  fi
  if [[ -f "$AGENT_CMS_CONFIG_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$AGENT_CMS_CONFIG_FILE"
    if [[ -n "${AGENT_CMS_HOME:-}" ]]; then
      echo "${AGENT_CMS_HOME%/}"
      return
    fi
  fi
  agent_cms_default_install_dir
}

agent_cms_platform() {
  local uname_s
  uname_s="$(uname -s)"
  case "$uname_s" in
    Darwin) echo "mac" ;;
    Linux) echo "linux" ;;
    MINGW* | MSYS* | CYGWIN*) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}

agent_cms_compose_file() {
  local platform
  platform="$(agent_cms_platform)"
  case "$platform" in
    mac | windows) echo "docker-compose.mac.yml" ;;
    linux) echo "docker-compose.linux.yml" ;;
    *) echo "docker-compose.mac.yml" ;;
  esac
}

agent_cms_compose_args() {
  local -a args
  args=(-f "$(agent_cms_compose_file)" -f docker-compose.workspace-mounts.yml)
  printf '%s\n' "${args[@]}"
}

agent_cms_ensure_home() {
  AGENT_CMS_HOME="$(agent_cms_read_config_home)"
  export AGENT_CMS_HOME
  if [[ ! -d "$AGENT_CMS_HOME" ]]; then
    echo "Каталог установки не найден: $AGENT_CMS_HOME" >&2
    echo "Запустите: curl -fsSL https://raw.githubusercontent.com/iv-litovchenko/AgentCMS/main/scripts/install.sh | bash" >&2
    exit 1
  fi
  if [[ ! -f "$AGENT_CMS_HOME/package.json" ]]; then
    echo "Не похоже на Agent CMS: $AGENT_CMS_HOME (нет package.json)" >&2
    exit 1
  fi
  cd "$AGENT_CMS_HOME"
  export AGENT_CMS_ROOT="$AGENT_CMS_HOME"
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
}

agent_cms_read_env_var() {
  local key="$1"
  local fallback="${2:-}"
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

agent_cms_public_base() {
  local url
  url="$(agent_cms_read_env_var AGENT_CMS_PUBLIC_URL "")"
  if [[ -z "$url" ]]; then
    local platform
    platform="$(agent_cms_platform)"
    if [[ "$platform" == "linux" ]]; then
      local domain
      domain="$(agent_cms_read_env_var AGENT_CMS_PUBLIC_DOMAIN "localhost")"
      if [[ "$domain" != "localhost" ]]; then
        echo "https://${domain}"
        return
      fi
      echo "http://127.0.0.1"
      return
    fi
    echo "http://127.0.0.1:3000"
    return
  fi
  echo "${url%/}"
}

agent_cms_compose() {
  local -a args
  mapfile -t args < <(agent_cms_compose_args)
  docker compose "${args[@]}" "$@"
}

agent_cms_check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  if ! docker info >/dev/null 2>&1; then
    return 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

agent_cms_ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Нужен Docker: https://www.docker.com/products/docker-desktop/" >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Docker не запущен. Запустите Docker Desktop / systemctl start docker." >&2
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "Нужен Docker Compose V2 (docker compose)." >&2
    exit 1
  fi
}

agent_cms_package_version() {
  if command -v node >/dev/null 2>&1 && [[ -f package.json ]]; then
    node -p "require('./package.json').version" 2>/dev/null || echo "$AGENT_CMS_CLI_VERSION"
  else
    echo "$AGENT_CMS_CLI_VERSION"
  fi
}

agent_cms_log_services() {
  local platform
  platform="$(agent_cms_platform)"
  if [[ "$platform" == "linux" ]]; then
    echo "cms mcp control caddy"
  else
    echo "cms mcp control"
  fi
}

agent_cms_write_config() {
  local home="${1:?home}"
  mkdir -p "$AGENT_CMS_CONFIG_DIR"
  printf 'AGENT_CMS_HOME=%q\n' "$home" >"$AGENT_CMS_CONFIG_FILE"
}

agent_cms_link_cli() {
  local home="${1:?home}"
  local bin="${2:-$HOME/.local/bin}"
  mkdir -p "$bin"
  ln -sf "$home/scripts/agent-cms" "$bin/agent-cms"
  echo "$bin/agent-cms"
}
