#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

pause_on_exit() {
  echo ""
  read -r -p "Нажмите Enter для выхода..."
}

require_node() {
  if ! command -v npm >/dev/null 2>&1; then
    echo "Node.js / npm не найдены."
    if command -v brew >/dev/null 2>&1; then
      echo "Устанавливаю через Homebrew: brew install node"
      brew install node
    else
      echo "Скачайте Node.js 18+: https://nodejs.org/"
      echo "Или установите Homebrew: https://brew.sh/"
      pause_on_exit
      exit 1
    fi
  fi

  local node_major=""
  node_major="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  if [ "$node_major" -lt 18 ]; then
    echo "Нужен Node.js 18+, сейчас: $(node -v 2>/dev/null || echo '?')"
    pause_on_exit
    exit 1
  fi

  echo "Node $(node -v), npm $(npm -v)"
}

install_npm_root() {
  echo ""
  echo "→ npm install (корень проекта)..."
  npm install
}

ensure_brew_pkg() {
  local pkg="$1"
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew не найден — пропускаю: $pkg"
    echo "  Установка: https://brew.sh/"
    return 1
  fi
  if brew list "$pkg" >/dev/null 2>&1; then
    echo "  $pkg уже установлен"
  else
    echo "  brew install $pkg"
    brew install "$pkg"
  fi
}

install_mkcert() {
  echo ""
  echo "→ mkcert (доверенный HTTPS)..."
  if ensure_brew_pkg mkcert; then
    echo "  mkcert -install (может запросить пароль macOS)..."
    mkcert -install || {
      echo "  Не удалось установить CA. Позже в Terminal: mkcert -install"
    }
  else
    echo "  Без mkcert будет самоподписанный сертификат (предупреждение в браузере)."
  fi
}

install_certs() {
  echo ""
  echo "→ npm run setup:certs..."
  npm run setup:certs

  if [ ! -f ".dev-certs/cert.pem" ] || [ ! -f ".dev-certs/key.pem" ]; then
    echo "Ошибка: сертификаты не созданы в .dev-certs/"
    pause_on_exit
    exit 1
  fi

  local provider=""
  if [ -f ".dev-certs/provider.txt" ]; then
    provider="$(cat .dev-certs/provider.txt)"
  fi
  case "$provider" in
    mkcert) echo "  Сертификаты: mkcert — .dev-certs/" ;;
    openssl) echo "  Сертификаты: openssl (самоподписанные) — .dev-certs/" ;;
    *) echo "  Сертификаты: .dev-certs/" ;;
  esac
}

install_mcp() {
  echo ""
  echo "→ MCP для Cursor..."
  if [ ! -f "mcp-server/package.json" ]; then
    echo "  mcp-server/package.json не найден — пропуск."
    return 0
  fi
  npm install --prefix mcp-server
  echo "  Готово. См. mcp-server/README.md"
}

install_voice_sidecar() {
  echo ""
  echo "→ Python sidecar (голос PTT)..."
  if ! command -v python3 >/dev/null 2>&1; then
    echo "  python3 не найден."
    if command -v brew >/dev/null 2>&1; then
      echo "  brew install python"
      brew install python
    else
      echo "  Установите Python 3: https://www.python.org/downloads/"
      return 1
    fi
  fi

  ensure_brew_pkg portaudio || true

  local sidecar="$ROOT/agent-shell/voice-sidecar"
  cd "$sidecar"

  if [ ! -d ".venv" ]; then
    echo "  python3 -m venv .venv"
    python3 -m venv .venv
  fi
  # shellcheck disable=SC1091
  source .venv/bin/activate

  echo "  pip install -r requirements.txt"
  pip install -r requirements.txt

  cd "$ROOT"
  echo "  Sidecar готов. Запуск: npm run shell:sidecar"
}

ask_yes_no() {
  local prompt="$1"
  local reply=""
  read -r -p "$prompt [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

echo "Agent CMS — установка зависимостей"
echo "=================================="

require_node
install_npm_root
install_mkcert
install_certs

if ask_yes_no "Установить MCP для Cursor?"; then
  install_mcp
fi

if ask_yes_no "Установить Python sidecar для голоса (PTT)?"; then
  install_voice_sidecar || echo "  Sidecar не установлен — можно повторить позже."
fi

echo ""
echo "Готово. Дальше:"
echo "  _Server start          — запуск сервера"
echo "  _App Editor            — десктоп-редактор"
echo "  _App Voice             — голосовой клиент"

pause_on_exit
