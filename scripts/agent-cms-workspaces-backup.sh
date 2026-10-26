#!/usr/bin/env bash
# Архив каталога workspaces (bind mount на хосте). Индексы .agent-cms не включаем — пересборка.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=agent-cms-cli-lib.sh
source "$SCRIPT_DIR/agent-cms-cli-lib.sh"

agent_cms_ensure_home
cd "$AGENT_CMS_HOME"

agent_cms_workspaces_host_path() {
  local dir
  dir="$(agent_cms_read_env_var AGENT_CMS_WORKSPACES_DIR "./workspaces")"
  if [[ "$dir" != /* ]]; then
    dir="$AGENT_CMS_HOME/$dir"
  fi
  echo "$dir"
}

usage() {
  cat <<'EOF'
agent-cms workspaces archive — backup | restore

  backup [FILE]              tar.gz (по умолчанию .backups/workspaces-YYYYMMDD-HHMMSS.tar.gz)
  restore ARCHIVE [--force]  распаковать в каталог workspaces (AGENT_CMS_WORKSPACES_DIR)

CLI: agent-cms-cli backup_zzz [FILE]
      agent-cms-cli restore_zzz ARCHIVE [--force]
EOF
}

cmd="${1:-help}"
shift || true

ws_dir="$(agent_cms_workspaces_host_path)"
ws_name="$(basename "$ws_dir")"
ws_parent="$(dirname "$ws_dir")"

case "$cmd" in
  backup | create | pack)
    out="${1:-}"
    if [[ -z "$out" ]]; then
      mkdir -p "$AGENT_CMS_HOME/.backups"
      out="$AGENT_CMS_HOME/.backups/workspaces-$(date +%Y%m%d-%H%M%S).tar.gz"
    fi
    if [[ "$out" != /* ]]; then
      out="$AGENT_CMS_HOME/$out"
    fi
    mkdir -p "$(dirname "$out")"
    if [[ ! -d "$ws_dir" ]]; then
      echo "Нет каталога workspaces: $ws_dir" >&2
      exit 1
    fi
    echo "→ архив: $ws_dir"
    echo "  → $out"
    tar -czf "$out" \
      -C "$ws_parent" \
      --exclude="${ws_name}/.agent-cms" \
      --exclude="*/.agent-cms" \
      "$ws_name"
    ls -lh "$out"
    echo "Готово."
    ;;
  restore | extract | unpack)
    archive="${1:-}"
    shift || true
    force=0
    for arg in "$@"; do
      case "$arg" in
        --force) force=1 ;;
        -h | --help) usage; exit 0 ;;
        *) echo "Неизвестный аргумент: $arg" >&2; exit 1 ;;
      esac
    done
    if [[ -z "$archive" ]]; then
      echo "Укажите ARCHIVE (.tar.gz)" >&2
      exit 1
    fi
    if [[ ! -f "$archive" ]]; then
      echo "Файл не найден: $archive" >&2
      exit 1
    fi
    top="$(tar -tzf "$archive" 2>/dev/null | head -1 || true)"
    if [[ "$top" != "${ws_name}/" && "$top" != workspaces/ ]]; then
      echo "⚠ В архиве верхняя папка: ${top:-?} (ожидали ${ws_name}/ или workspaces/)" >&2
    fi
    if [[ -d "$ws_dir" && "$(ls -A "$ws_dir" 2>/dev/null | head -1)" ]]; then
      if [[ "$force" != "1" ]]; then
        echo "Каталог не пустой: $ws_dir" >&2
        echo "Повторите с --force (поверх существующих файлов) или очистите каталог." >&2
        exit 1
      fi
      echo "→ restore --force в $ws_parent"
    else
      mkdir -p "$ws_dir"
      echo "→ restore в $ws_parent"
    fi
    tar -xzf "$archive" -C "$ws_parent"
    echo "Готово: $ws_dir"
    echo "После восстановления: agent-cms-cli restart · при необходимости rebuild indexes в Control."
    ;;
  help | -h | --help)
    usage
    ;;
  *)
    echo "backup | restore" >&2
    usage >&2
    exit 1
    ;;
esac
