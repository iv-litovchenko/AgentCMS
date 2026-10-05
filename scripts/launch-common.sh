#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

launch_check_deps() {
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm не найден. Установите Node.js: https://nodejs.org/"
    read -r -p "Нажмите Enter для выхода..."
    exit 1
  fi

  if [ ! -d "node_modules" ]; then
    echo "Первый запуск: npm install..."
    npm install || {
      read -r -p "Нажмите Enter для выхода..."
      exit 1
    }
  fi
}

launch_setup_certs() {
  echo "Проверка сертификатов..."
  npm run setup:certs

  if [ ! -f ".dev-certs/cert.pem" ] || [ ! -f ".dev-certs/key.pem" ]; then
    echo "Ошибка: сертификаты не созданы в .dev-certs/"
    read -r -p "Нажмите Enter для выхода..."
    exit 1
  fi

  local provider=""
  if [ -f ".dev-certs/provider.txt" ]; then
    provider="$(cat .dev-certs/provider.txt)"
  fi

  case "$provider" in
    mkcert)
      if ! mkcert -install >/dev/null 2>&1; then
        echo ""
        echo "Сертификат создан (mkcert), но система ещё не доверяет CA."
        echo "Сейчас попробуем установить mkcert CA (нужен пароль macOS)..."
        if ! mkcert -install; then
          echo ""
          echo "Не удалось установить CA автоматически."
          echo "Один раз в Terminal: mkcert -install"
          echo "Потом перезапустите ярлык."
          read -r -p "Нажмите Enter для выхода..."
          exit 1
        fi
      fi
      echo "Сертификат: mkcert (доверенный) — .dev-certs/"
      ;;
    openssl)
      echo ""
      echo "Сертификат: самоподписанный — браузер покажет предупреждение."
      echo "Для доверенного HTTPS без предупреждений:"
      echo "  brew install mkcert"
      echo "  mkcert -install"
      echo "  npm run setup:certs"
      echo ""
      ;;
    *)
      echo "Сертификаты: .dev-certs/"
      ;;
  esac
}
