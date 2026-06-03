# Agent CMS — MCP Server

MCP-сервер для [Agent CMS](..): даёт агенту в Cursor / Claude Desktop доступ к workspace через HTTP API.

## Требования

- Node.js 18+
- Запущенный Agent CMS: из корня репозитория `npm start` → http://localhost:3000

## Установка

```bash
cd mcp-server
npm install
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `AGENT_CMS_BASE_URL` | `http://localhost:3000` | Базовый URL CMS |
| `AGENT_CMS_AGENT` | — | id агента (`?agent=`); если пусто — default из `agents.registry.json` |

Устаревшие `YAMLCMS_*` по-прежнему читаются для совместимости.

## Cursor

Settings → MCP → Add server, или `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agent-cms": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/agent-cms/mcp-server/index.js"],
      "env": {
        "AGENT_CMS_BASE_URL": "http://localhost:3000",
        "AGENT_CMS_AGENT": "main"
      }
    }
  }
}
```

Замените `/ABSOLUTE/PATH/TO/agent-cms` на абсолютный путь к репозиторию Agent CMS.

## Документация tools

- В UI: кнопка **MCP** в шапке (рядом с **API**)
- JSON: `GET http://localhost:3000/api/mcp-docs`
- Источник: `mcp-docs.js` в корне репозитория

## Запуск вручную (отладка)

```bash
npm start          # из корня репозитория Agent CMS
node index.js      # из mcp-server/ — ждёт stdio, для ручного теста неудобен
```

Из корня: `npm run mcp`

## Соответствие доменам CMS

| Домен | Tools |
|-------|--------|
| Навигация | `get_menu`, `search_workspace` |
| Память | `read/write_external_memory`, `read/write_internal_memory`, `create_external_memory` |
| Вложения | `list_media`, `read/write_media_sidecar` |
| Настройки | `read/write_node_description`, `read/write_configuration`, `read/write_env`, `read/write_todo` |
| Агент | `list_agents`, `list/read/write_system_file` |

Параметр `path` — путь к `_.node.md` ноды, как в HTTP API.
