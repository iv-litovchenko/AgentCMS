# MCP — Docker на Mac

Канон: один public host — MCP **`{AGENT_CMS_PUBLIC_URL}/app-mcp`** + Bearer **`AGENT_CMS_MCP_TOKEN`**. Dev с отдельным процессом: **`AGENT_CMS_EXPOSE_INTERNAL_PORTS=1`** → `http://127.0.0.1:3490/mcp`.

## Claude Desktop (приложение / чат)

HTTP MCP через **`mcp-remote`** (URL из `.env`, Bearer если задан):

```bash
# add
agent-cms-cli mcp claude-desktop add --https
agent-cms-cli mcp claude-desktop add --http
agent-cms-cli mcp claude-code add --https
agent-cms-cli mcp claude-code add --http
agent-cms-cli mcp codex add --https
agent-cms-cli mcp codex add --http

# remove
agent-cms-cli mcp claude-desktop remove
agent-cms-cli mcp claude-code remove
agent-cms-cli mcp codex remove

agent-cms-cli mcp status
# add без флага — AGENT_CMS_PUBLIC_URL
```

Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`. После **claude-desktop add** — Cmd+Q и снова открыть приложение.

Legacy stdio: [`claude-desktop-docker.json`](./claude-desktop-docker.json) + `node …/mcp-server/index.js` (dev, не равно `/app-mcp` в Docker).

## Cursor (HTTP MCP из контейнера `mcp`)

Settings → MCP → добавить сервер по URL или фрагмент из [`cursor-mcp-http-docker.json`](./cursor-mcp-http-docker.json).

Токен: `AGENT_CMS_MCP_TOKEN` в `.env` → `docker compose up -d`.

Без токена (если в `.env` пусто) — заголовок `Authorization` не нужен.
