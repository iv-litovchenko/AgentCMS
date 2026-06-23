---
awn-preview: ""
awn-emoji: ""
awn-name: mcp-server
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: "2026-06-21T18:00"
awn-update: 2026-06-21T18:00:00.000Z
awn-description: MCP-сервер Agent CMS — tools поверх HTTP API
awn-main: false
awn-category: ""
awn-tags: [integrations, mcp]
awn-color: ""
awn-version: 1
awn-sort: ""
---

# MCP Server

| | |
|---|---|
| **Код** | `mcp-server/` |
| **Machine docs** | `docs/mcp-0.0.0.js`, `docs/mcp-0.0.1.js` |
| **UI** | кнопка **MCP** в шапке |

## Модель

```
Cursor / Claude  →  MCP tools  →  HTTP /api/*  →  server.js  →  workspace FS
```

## Основные tools

- Навигация и чтение/запись файлов ноды
- `read/write_configuration`, `todo`, `env`
- Inbox, sidecar, system files
- `get_api_reference`

## Связь с типами

Дескрипторы tool как **компоненты** — план в `types-of-components/mcp/`.
