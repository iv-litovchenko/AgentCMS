---
awn-preview: ""
awn-emoji: ""
awn-name: server-api
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: "2026-06-21T18:00"
awn-update: 2026-06-21T18:00:00.000Z
awn-description: HTTP API и документация для UI / MCP
awn-main: false
awn-category: ""
awn-tags: [runtime]
awn-color: ""
awn-version: 1
awn-sort: ""
---

# Server API

| | |
|---|---|
| **Код** | `server.js` |
| **Machine docs** | `docs/api-0.0.0.js`, `docs/api-0.0.1.js` |
| **Registry** | `docs-registry.js` |

## Группы маршрутов

| Группа | Примеры |
|--------|---------|
| Agents | `/api/agents`, discover |
| Files | `/api/file`, properties, history |
| Storage | content, configuration, todo |
| Docs | `/api/docs`, `/api/mcp-docs`, `/api/user-docs` |
| Media | preview, sidecar, public images |

## UI

Кнопка **API** в шапке → modal из `docs/api-*.js` (версии 0.0.0 / 0.0.1).

## MCP

MCP-сервер проксирует те же HTTP endpoints — см. [integrations/mcp-server.md](../integrations/mcp-server.md).
