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
compose_args=(-f "${COMPOSE_FILE}" -f docker-compose.workspace-mounts.yml)
echo "→ docker compose ${compose_args[*]} up -d --build"
docker compose "${compose_args[@]}" up -d --build

echo ""
docker compose "${compose_args[@]}" ps
echo ""
if [[ "$AGENT_CMS_PUBLIC_DOMAIN" != "localhost" ]]; then
  base="https://${AGENT_CMS_PUBLIC_DOMAIN}"
else
  base="http://127.0.0.1"
fi
echo "  MCP-connector: ${base}/app-mcp"
echo "  Control:  ${base}/app-control/"
echo "  Editor:   ${base}/"
# shellcheck source=mcp-connector-cli-hints.sh
source "$(dirname "$0")/mcp-connector-cli-hints.sh"
agent_cms_print_mcp_cli_hints "$base" "3000"
echo "  (compose: docker-compose.linux.yml)"
echo ""
