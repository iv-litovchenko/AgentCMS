#!/usr/bin/env bash
# Первый запуск Mac: Docker + .env (без Node/npm для сервера).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

pause_on_exit() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo ""
    read -r -p "Нажмите Enter для выхода..."
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Нужен Docker Desktop: https://www.docker.com/products/docker-desktop/"
  pause_on_exit
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker не запущен. Откройте Docker Desktop и повторите."
  pause_on_exit
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "→ Нет .env в каталоге. В Agent CMS конфиг лежит в git — git pull или клон репозитория целиком."
  pause_on_exit
  exit 1
fi
echo "→ .env на месте (редактируйте в репо при смене паролей / домена / MCP token)."

echo "→ dev TLS (.dev-certs/) для https://127.0.0.1:3443 …"
bash "$ROOT/scripts/setup-dev-certs.sh"

if [[ "${AGENT_CMS_SETUP_FROM_WELCOME:-}" != "1" ]]; then
  echo ""
  echo "  Дальше: cms-start.command или npm run cms:start"
  echo ""
fi
