#!/usr/bin/env bash
# Agent CMS installer — macOS / Linux (без npm). Windows: install.ps1 → WSL.
set -euo pipefail

AGENT_CMS_REPO="${AGENT_CMS_REPO:-https://github.com/iv-litovchenko/AgentCMS.git}"
AGENT_CMS_BRANCH="${AGENT_CMS_BRANCH:-main}"
AGENT_CMS_INSTALL_NO_START="${AGENT_CMS_INSTALL_NO_START:-0}"
AGENT_CMS_INSTALL_SKIP_BUILD="${AGENT_CMS_INSTALL_SKIP_BUILD:-0}"
CUSTOM_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      CUSTOM_DIR="${2:?}"
      shift 2
      ;;
    --branch)
      AGENT_CMS_BRANCH="${2:?}"
      shift 2
      ;;
    --no-start) AGENT_CMS_INSTALL_NO_START=1; shift ;;
    --skip-build) AGENT_CMS_INSTALL_SKIP_BUILD=1; shift ;;
    -h | --help)
      echo "Usage: install.sh [--dir PATH] [--branch main] [--no-start] [--skip-build]"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

LIB_DIR=""
if [[ -n "${BASH_SOURCE[0]:-}" && "${BASH_SOURCE[0]}" != /dev/stdin && -f "${BASH_SOURCE[0]%/*}/agent-cms-cli-lib.sh" ]]; then
  LIB_DIR="$(cd "${BASH_SOURCE[0]%/*}" && pwd)"
fi

default_dir() {
  if [[ -n "$LIB_DIR" ]]; then
    # shellcheck source=agent-cms-cli-lib.sh
    source "$LIB_DIR/agent-cms-cli-lib.sh"
    agent_cms_default_install_dir
  else
    case "$(uname -s)" in
      Darwin) echo "$HOME/Projects/AgentCMS" ;;
      Linux) echo "/opt/agent-cms" ;;
      *) echo "$HOME/Projects/AgentCMS" ;;
    esac
  fi
}

INSTALL_DIR="${CUSTOM_DIR:-$(default_dir)}"
INSTALL_DIR="${INSTALL_DIR%/}"

echo "→ Agent CMS install"
echo "  repo:   $AGENT_CMS_REPO @ $AGENT_CMS_BRANCH"
echo "  target: $INSTALL_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "Нужен git. macOS: xcode-select --install · Linux: apt install git" >&2
  exit 1
fi

if [[ "$INSTALL_DIR" == /opt/* ]] && [[ ! -d "$INSTALL_DIR" ]]; then
  if [[ "$(id -u)" -ne 0 ]] && [[ ! -w /opt ]]; then
    echo "→ sudo mkdir -p $INSTALL_DIR && sudo chown $(id -un):$(id -gn) $INSTALL_DIR"
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$(id -un):$(id -gn)" "$INSTALL_DIR"
  else
    mkdir -p "$INSTALL_DIR"
  fi
fi

mkdir -p "$(dirname "$INSTALL_DIR")"

FRESH=0
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "→ git pull --ff-only"
  git -C "$INSTALL_DIR" pull --ff-only
elif [[ -d "$INSTALL_DIR" ]] && [[ -n "$(ls -A "$INSTALL_DIR" 2>/dev/null || true)" ]]; then
  echo "Каталог не пуст и не git: $INSTALL_DIR" >&2
  exit 1
else
  echo "→ git clone"
  git clone --branch "$AGENT_CMS_BRANCH" --depth 1 "$AGENT_CMS_REPO" "$INSTALL_DIR"
  FRESH=1
fi

if [[ -z "$LIB_DIR" ]]; then
  LIB_DIR="$INSTALL_DIR/scripts"
fi
# shellcheck source=agent-cms-cli-lib.sh
source "$LIB_DIR/agent-cms-cli-lib.sh"

agent_cms_write_config "$INSTALL_DIR"
LINK="$(agent_cms_link_cli "$INSTALL_DIR")"
echo "→ CLI: $LINK"

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v docker >/dev/null 2>&1; then
  echo ""
  echo "⚠ Docker не найден. Установите Docker Desktop / Engine, затем:"
  echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo "   agent-cms rebuild   # первый запуск"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo ""
  echo "⚠ Docker не запущен. Запустите Docker, затем: agent-cms rebuild"
  exit 0
fi

if [[ "$AGENT_CMS_INSTALL_NO_START" == "1" ]]; then
  echo ""
  echo "Готово (--no-start). Дальше: agent-cms doctor && agent-cms rebuild"
  exit 0
fi

export AGENT_CMS_HOME="$INSTALL_DIR"
export DOCKER_MAC_NO_PAUSE=1

if [[ "$FRESH" == "1" && "$AGENT_CMS_INSTALL_SKIP_BUILD" != "1" ]]; then
  echo ""
  echo "→ первый запуск (build может занять 10–30+ мин)…"
  bash "$INSTALL_DIR/scripts/agent-cms" rebuild
else
  bash "$INSTALL_DIR/scripts/agent-cms" start
fi

echo ""
echo "Готово. PATH: добавьте ~/.local/bin при необходимости."
echo "  agent-cms doctor"
echo "  agent-cms open control"
