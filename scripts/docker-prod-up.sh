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
  cp .env.example .env
  echo "Создан .env из .env.example — задайте APP_LOCK_* и AGENT_CMS_MCP_TOKEN."
fi

if [[ -z "${MAPTEX_DOMAIN:-}" ]]; then
  if grep -q '^MAPTEX_DOMAIN=' .env 2>/dev/null; then
    # shellcheck disable=SC1091
    set -a && source .env && set +a
  fi
fi

export MAPTEX_DOMAIN="${MAPTEX_DOMAIN:-localhost}"

COMPOSE_FILE="docker-compose.linux.yml"
echo "→ docker compose -f ${COMPOSE_FILE} up -d --build"
docker compose -f "${COMPOSE_FILE}" up -d --build

echo ""
docker compose -f "${COMPOSE_FILE}" ps
echo ""
if [[ "$MAPTEX_DOMAIN" != "localhost" ]]; then
  echo "Editor:  https://${MAPTEX_DOMAIN}/"
  echo "Control: https://${MAPTEX_DOMAIN}/control/"
  echo "MCP:     https://${MAPTEX_DOMAIN}/mcp  (Bearer AGENT_CMS_MCP_TOKEN)"
else
  echo "Editor:  http://127.0.0.1/  (Caddy :80, MAPTEX_DOMAIN=localhost)"
  echo "MCP:     http://127.0.0.1/mcp"
fi
