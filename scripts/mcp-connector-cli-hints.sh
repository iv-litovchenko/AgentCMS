#!/usr/bin/env bash
# Подсказки Claude / Codex для локального MCP (Streamable HTTP). Args: <public-base> [http-port]
agent_cms_print_mcp_cli_hints() {
  local base="${1%/}"
  local http_port="${2:-3000}"

  echo ""
  echo "  MCP CLI — Claude Desktop (приложение / чат):"
  echo "    agent-cms-cli mcp claude-desktop add"
  echo "    agent-cms-cli mcp claude-desktop remove"
  echo "  MCP CLI — Claude Code (терминал):"
  echo "    agent-cms-cli mcp claude-code add"
  echo "    agent-cms-cli mcp claude-code remove"
  echo "  MCP CLI — Codex (CLI + Desktop, ~/.codex/config.toml):"
  echo "    agent-cms-cli mcp codex add"
  echo "    agent-cms-cli mcp codex remove"
  echo "  Проверка:  agent-cms-cli mcp status"
}
