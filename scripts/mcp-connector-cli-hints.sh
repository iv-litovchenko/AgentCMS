#!/usr/bin/env bash
# Подсказки Claude / Codex для локального MCP (Streamable HTTP). Args: <public-base> [http-port]
agent_cms_print_mcp_cli_hints() {
  local base="${1%/}"
  local http_port="${2:-3000}"
  local mcp_https="${base}/app-mcp"
  local mcp_http="http://127.0.0.1:${http_port}/app-mcp"

  echo ""
  echo "  MCP CLI — Claude Desktop (приложение / чат):"
  echo "    agent-cms-cli mcp claude-desktop add"
  echo "    agent-cms-cli mcp claude-desktop remove"
  echo "  MCP CLI — Claude Code (терминал, без токена, auth none):"
  echo "    claude mcp add --transport http agent-cms ${mcp_https}"
  echo "    claude mcp add --transport http agent-cms ${mcp_http}"
  echo "  MCP CLI — Claude Code (AGENT_CMS_MCP_TOKEN из .env):"
  echo "    claude mcp add --transport http agent-cms ${mcp_https} \\"
  echo "      --header \"Authorization: Bearer \$AGENT_CMS_MCP_TOKEN\""
  echo "  MCP CLI — Codex (без токена):"
  echo "    codex mcp add agent-cms --url \"${mcp_https}\""
  echo "    codex mcp add agent-cms --url \"${mcp_http}\""
  echo "  MCP CLI — Codex (токен: export AGENT_CMS_MCP_TOKEN=… из .env):"
  echo "    codex mcp add agent-cms --url \"${mcp_https}\" --bearer-token-env-var AGENT_CMS_MCP_TOKEN"
  echo "  Проверка:  claude mcp list  ·  codex mcp list"
  echo "  Удалить:   claude mcp remove agent-cms  ·  codex mcp remove agent-cms"
}
