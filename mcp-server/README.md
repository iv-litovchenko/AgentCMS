# Agent CMS — MCP Server v0.3.0 (slim · 44 tools)

MCP-сервер для [Agent CMS](..): доступ к workspace через HTTP API для Cursor, Claude Desktop, CoPaw / QwenPaw.

Полная карта: [workspaces/agent-cms-core/temp2/examples/mcp-optimiz.md](../workspaces/agent-cms-core/temp2/examples/mcp-optimiz.md)

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
| `AGENT_CMS_AGENT` | — | id агента (`?agent=`); если пусто — default из `awn-agents.json` |

## Старт сессии

```
get_session_context
```

Затем при необходимости: `get_user_active_context_now` → `read_*` / `write_*` по задаче.

### Канон (PAGE · SLOT · CONTENT)

| Группа | Tools |
|--------|-------|
| Старт | `get_session_context`, `get_user_active_context_now`, `list_workspace_*` |
| Навигация | `get_page_map`, `get_content_map`, `search_workspace` |
| Страница | `read/write_page_*`, `create_page`, `delete_page`, `rename_page`, `move_page` |
| Слот | `list_page_slots` |
| Контент | `read/write_content_*`, `create_content`, `rename/move/delete_content` |
| Типы | `list_types`, `get_type` |
| awn-data | `list/get_data_store`, `create_data_store/record`, `read_data_store_schema` |
| FS | `list_system_files`, `read_file`, `write_file`, `upload_file`, `list_folder` |

Бинарники и media — **`upload_file`** по полному workspace path, не slot-upload tools.

## Документация

- Агентская шпаргалка: `GLOBAL_MCP_DOC.md` (always-context)
- HTTP JSON: `GET http://localhost:3000/api/mcp-docs?version=0.0.2`

## Запуск

```bash
npm start          # из корня Agent CMS
node mcp-server/index.js   # stdio
```

Из корня: `npm run mcp`
