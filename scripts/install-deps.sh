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
    echo "  Homebrew не найден — пропускаю: $pkg"
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

pick_stt_python() {
  if command -v python3.12 >/dev/null 2>&1; then
    echo python3.12
    return 0
  fi
  if command -v python3.13 >/dev/null 2>&1; then
    echo python3.13
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    local minor=""
    minor="$(python3 -c 'import sys; print(sys.version_info.minor)' 2>/dev/null || echo 99)"
    if [ "$minor" -ge 14 ] && command -v brew >/dev/null 2>&1; then
      echo "  Python 3.${minor}: для Whisper нужен пакет av — на 3.14+ часто нет wheel." >&2
      echo "  Пробую: brew install python@3.12 …" >&2
      brew install python@3.12 || true
      if command -v python3.12 >/dev/null 2>&1; then
        echo python3.12
        return 0
      fi
    fi
    echo python3
    return 0
  fi
  return 1
}

install_stt_python() {
  echo ""
  echo "→ Python STT (Whisper / Google) — agent-shell/voice-sidecar/.venv …"

  local py=""
  if ! py="$(pick_stt_python)"; then
    echo "  python3 не найден."
    if command -v brew >/dev/null 2>&1; then
      echo "  brew install python@3.12"
      brew install python@3.12 || true
      py="$(pick_stt_python)" || {
        echo "  Установите Python 3.12+: https://www.python.org/downloads/"
        return 1
      }
    else
      echo "  Установите Python 3.12+"
      return 1
    fi
  fi
  echo "  Python: $($py -V 2>&1)"

  ensure_brew_pkg ffmpeg || true
  ensure_brew_pkg pkg-config || true

  local venv_dir="$ROOT/agent-shell/voice-sidecar/.venv"
  if [ ! -d "$venv_dir" ]; then
    echo "  $py -m venv .venv"
    "$py" -m venv "$venv_dir"
  fi
  # shellcheck disable=SC1091
  source "$venv_dir/bin/activate"

  echo "  pip install --upgrade pip"
  pip install --upgrade pip

  echo "  pip install SpeechRecognition …"
  pip install "SpeechRecognition>=3.10.0"

  echo "  pip install faster-whisper (зависимость av; нужен ffmpeg) …"
  if ! pip install "faster-whisper>=1.1.0"; then
    echo ""
    echo "  ⚠ Whisper не установился (часто av на Python 3.14+)."
    echo "    Google STT через сервер всё равно будет работать."
    echo "    Для Whisper: brew install python@3.12, удалите .venv и запустите скрипт снова."
    echo ""
  fi

  cd "$ROOT"
  echo "  STT Python готов — движки подключаются через сервер Shell (Web Speech — в браузере)."
}

echo "Agent CMS — установка зависимостей"
echo "=================================="

require_node
install_npm_root
install_mkcert
install_certs

install_stt_python || echo "  Python STT не установлен — повторите: bash scripts/install-deps.sh"

echo ""
echo "Готово. Дальше:"
echo "  _Agent Control.command — пульт управления (сервер, приложения)"
echo "  commands/              — отдельные ярлыки команд"

pause_on_exit
