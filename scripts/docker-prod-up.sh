#!/usr/bin/env bash
# Production stack: CMS + MCP + Control + Caddy
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Нужен Docker." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Нет .env — ожидается файл в репозитории (git clone / pull)." >&2
  exit 1
fi

if [[ -z "${AGENT_CMS_PUBLIC_DOMAIN:-}" ]]; then
  if grep -q '^AGENT_CMS_PUBLIC_DOMAIN=' .env 2>/dev/null; then
    # shellcheck disable=SC1091
    set -a && source .env && set +a
  fi
fi

export AGENT_CMS_PUBLIC_DOMAIN="${AGENT_CMS_PUBLIC_DOMAIN:-localhost}"

COMPOSE_FILE="docker-compose.linux.yml"
echo "→ docker compose -f ${COMPOSE_FILE} up -d --build"
docker compose -f "${COMPOSE_FILE}" up -d --build

echo ""
docker compose -f "${COMPOSE_FILE}" ps
echo ""
if [[ "$AGENT_CMS_PUBLIC_DOMAIN" != "localhost" ]]; then
  echo "Editor:  https://${AGENT_CMS_PUBLIC_DOMAIN}/"
  echo "Control: https://${AGENT_CMS_PUBLIC_DOMAIN}/app-control"
  echo "MCP:     https://${AGENT_CMS_PUBLIC_DOMAIN}/app-mcp  (Bearer AGENT_CMS_MCP_TOKEN)"
else
  echo "Editor:  http://127.0.0.1/  (Caddy :80, AGENT_CMS_PUBLIC_DOMAIN=localhost)"
  echo "MCP:     http://127.0.0.1/mcp"
fi
