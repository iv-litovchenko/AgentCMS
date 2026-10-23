# MCP — Docker на Mac

Канон: один public host — MCP **`{AGENT_CMS_PUBLIC_URL}/app-mcp`** + Bearer **`AGENT_CMS_MCP_TOKEN`**. Dev с отдельным процессом: **`AGENT_CMS_EXPOSE_INTERNAL_PORTS=1`** → `http://127.0.0.1:3490/mcp`.

## Claude Desktop (stdio → CMS в Docker)

Файл: `~/Library/Application Support/Claude/claude_desktop_config.json`

Скопируй блок из [`claude-desktop-docker.json`](./claude-desktop-docker.json) и **поправь `args`** на свой путь к `mcp-server/index.js`.

`AGENT_CMS_BASE_URL` = **хост-порт CMS**, не внутренний `cms:3000` контейнера.

Перезапуск Claude Desktop после сохранения.

## Cursor (HTTP MCP из контейнера `mcp`)

Settings → MCP → добавить сервер по URL или фрагмент из [`cursor-mcp-http-docker.json`](./cursor-mcp-http-docker.json).

Токен: `AGENT_CMS_MCP_TOKEN` в `.env` → `docker compose up -d`.

Без токена (если в `.env` пусто) — заголовок `Authorization` не нужен.
