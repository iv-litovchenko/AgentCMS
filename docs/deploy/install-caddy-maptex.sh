#!/usr/bin/env bash
# На VPS: sudo bash docs/deploy/install-caddy-maptex.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CADDYFILE_SRC="$ROOT/docs/deploy/caddy-maptex.Caddyfile"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запустите: sudo bash $0" >&2
  exit 1
fi

if ! command -v caddy >/dev/null 2>&1; then
  apt-get update
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

cp "$CADDYFILE_SRC" /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl enable caddy
systemctl restart caddy
systemctl --no-pager status caddy || true

echo ""
echo "Проверка (на сервере):"
echo "  curl -sI http://127.0.0.1:3000/"
echo "  curl -sI http://maptex.ru/"
echo "  curl -sI https://maptex.ru/"
echo ""
echo "CMS должен слушать 127.0.0.1:3000 (не только 0.0.0.0), MCP — 127.0.0.1:3490"
