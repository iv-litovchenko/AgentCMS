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
    Darwin) echo "$HOME/agent-cms" ;;
    Linux)
      if [[ "${AGENT_CMS_INSTALL_VPS:-}" == "1" ]] || [[ "$(id -u)" -eq 0 ]]; then
        echo "/opt/agent-cms"
      else
        echo "$HOME/agent-cms"
      fi
      ;;
    MINGW* | MSYS* | CYGWIN*)
      if [[ -n "${USERPROFILE:-}" ]]; then
        echo "$(cd "$USERPROFILE" && pwd)/agent-cms"
      else
        echo "$HOME/agent-cms"
      fi
      ;;
    *) echo "$HOME/agent-cms" ;;
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

agent_cms_cli_bin_path() {
  echo "${HOME}/.local/bin/agent-cms"
}

agent_cms_ensure_node() {
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
  if ! command -v node >/dev/null 2>&1; then
    echo "Нужен Node.js на Mac (сборка Electron на хосте, не в Docker)." >&2
    echo "Установите Node LTS или в Control: «Установить зависимости»." >&2
    exit 1
  fi
}

agent_cms_desktop_build_supported() {
  [[ "$(agent_cms_platform)" == "mac" ]]
}

agent_cms_run_app_build() {
  local mode="${1:-pack}"
  local app="${2:-all}"

  case "$mode" in
    pack | dist) ;;
    *)
      echo "Режим сборки: pack (только .app в dist/) или dist (dmg/zip и т.д.)" >&2
      return 1
      ;;
  esac

  case "$app" in
    all | editor | voice | control | commander) ;;
    *)
      echo "Приложение: all | editor | voice | control | commander" >&2
      return 1
      ;;
  esac

  if ! agent_cms_desktop_build_supported; then
    echo "Сборка Electron .app — только macOS (Node на этой машине)." >&2
    return 1
  fi

  agent_cms_ensure_node
  cd "$AGENT_CMS_HOME"
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

  if [[ ! -d node_modules/electron ]]; then
    echo "→ npm install (первый раз для Electron)…"
    if ! command -v npm >/dev/null 2>&1; then
      echo "Нужен npm (идёт с Node.js)." >&2
      exit 1
    fi
    npm install
  fi

  case "$app" in
    all)
      bash "$AGENT_CMS_HOME/scripts/cms-electron-build-all.sh" "$mode"
      ;;
    editor)
      bash "$AGENT_CMS_HOME/scripts/cms-electron-build.sh" "$mode"
      ;;
    voice)
      node "$AGENT_CMS_HOME/scripts/build-desktop-subapp.js" agent-shell "$mode"
      node "$AGENT_CMS_HOME/scripts/flatten-desktop-dist.js" agent-shell
      ;;
    control)
      node "$AGENT_CMS_HOME/scripts/build-desktop-subapp.js" agent-control "$mode"
      node "$AGENT_CMS_HOME/scripts/flatten-desktop-dist.js" agent-control
      ;;
    commander)
      node "$AGENT_CMS_HOME/scripts/build-desktop-subapp.js" agent-commander "$mode"
      node "$AGENT_CMS_HOME/scripts/flatten-desktop-dist.js" agent-commander
      ;;
  esac
}

# Electron .app на Mac: build | shortcuts
agent_cms_cmd_electron_app() {
  local sub="${1:-help}"
  shift || true
  case "$sub" in
    build)
      local mode="pack"
      local app_target="all"
      for arg in "$@"; do
        case "$arg" in
          pack | dist) mode="$arg" ;;
          all | editor | voice | control | commander) app_target="$arg" ;;
          -h | --help)
            cat <<'EOF'
agent-cms electron-app build [pack|dist] [all|editor|voice|control|commander]

  Сборка Electron .app (macOS, Node на хосте).

  pack (по умолчанию) — .app в dist/
  dist — установщики (dmg/zip …)
  all (по умолчанию) — Editor + Voice + Control + Commander

Примеры:
  agent-cms electron-app build
  agent-cms electron-app build dist
  agent-cms electron-app build pack editor
EOF
            return 0
            ;;
          *)
            echo "Неизвестный аргумент: $arg" >&2
            return 1
            ;;
        esac
      done
      agent_cms_run_app_build "$mode" "$app_target"
      ;;
    shortcuts)
      agent_cms_ensure_node
      node "$AGENT_CMS_HOME/scripts/create-desktop-shortcuts.js"
      ;;
    help | -h | --help)
      cat <<'EOF'
agent-cms electron-app — окна Electron (.app) на Mac

  electron-app build [pack|dist] [all|editor|voice|control|commander]
  electron-app shortcuts   — ярлыки ACMS-* на Рабочий стол (macOS)

Короткий синоним: agent-cms electron build …
Устаревают: app …, desktop …, agent-cms shortcuts
EOF
      ;;
    *)
      echo "electron-app: build | shortcuts | help" >&2
      return 1
      ;;
  esac
}

agent_cms_uninstall() {
  local purge="${1:-0}"
  local home
  home="$(agent_cms_read_config_home)"

  if [[ "$purge" == "1" ]]; then
    if [[ -d "$home" && -f "$home/scripts/agent-cms" ]]; then
      export AGENT_CMS_HOME="$home"
      export DOCKER_MAC_NO_PAUSE=1
      bash "$home/scripts/agent-cms" down 2>/dev/null || true
    fi
  fi

  local link
  link="$(agent_cms_cli_bin_path)"
  if [[ -L "$link" || -f "$link" ]]; then
    rm -f "$link"
    echo "→ удалён $link"
  fi

  if [[ -f "$AGENT_CMS_CONFIG_FILE" ]]; then
    rm -f "$AGENT_CMS_CONFIG_FILE"
    echo "→ удалён $AGENT_CMS_CONFIG_FILE"
  fi

  echo ""
  echo "CLI снят с PATH."
  if [[ -d "$home" ]]; then
    echo "Код и данные остались: $home"
    echo "  удалить каталог вручную: rm -rf $(printf '%q' "$home")"
    if [[ "$purge" != "1" ]]; then
      echo "  полный down stack перед удалением: agent-cms uninstall --purge"
    fi
  fi
}
