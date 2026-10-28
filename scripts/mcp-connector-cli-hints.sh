#!/usr/bin/env bash
# Подсказки Claude / Codex для локального MCP (Streamable HTTP). Args: <public-base> [http-port]
agent_cms_print_mcp_cli_hints() {
  local base="${1%/}"
  local http_port="${2:-3000}"
  local mcp_https="${base}/app-mcp"
  local mcp_http="http://127.0.0.1:${http_port}/app-mcp"

  echo ""
  echo "  MCP CLI — add:"
  echo "    agent-cms-cli mcp claude-desktop add --https"
  echo "    agent-cms-cli mcp claude-desktop add --http"
  echo "    agent-cms-cli mcp claude-code add --https"
  echo "    agent-cms-cli mcp claude-code add --http"
  echo "    agent-cms-cli mcp codex add --https"
  echo "    agent-cms-cli mcp codex add --http"
  echo "    (без флага add = AGENT_CMS_PUBLIC_URL: ${mcp_https})"
  echo "  MCP CLI — remove:"
  echo "    agent-cms-cli mcp claude-desktop remove"
  echo "    agent-cms-cli mcp claude-code remove"
  echo "    agent-cms-cli mcp codex remove"
  echo "  Проверка:  agent-cms-cli mcp status"
}
