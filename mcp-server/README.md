# Agent CMS — MCP Server v0.4.0 (per-chat agentId · database_frame_* / database_element_*)

MCP-сервер для [Agent CMS](..): доступ к workspace через HTTP API для Cursor, Claude Desktop, CoPaw / QwenPaw.

Полная карта: [workspaces/agent-cms-core/temp2/examples/mcp-optimiz.md](../workspaces/agent-cms-core/temp2/examples/mcp-optimiz.md)

## Требования

- Node.js 18+
- Запущенный Agent CMS: из корня репозитория `npm run start:https` → https://localhost:3443

## Установка

```bash
cd mcp-server
npm install
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `AGENT_CMS_BASE_URL` | `https://localhost:3443` при HTTPS | Базовый URL CMS (см. кнопку **MCP** в UI) |
| `AGENT_CMS_AGENT` | — | **Не задавайте в Claude/Cursor config.** Только dev-fallback, если agentId не передан в tool |
| `AGENT_CMS_TLS_INSECURE` | `1` для self-signed localhost | `0` если сертификат доверенный (mkcert) |

## Термины (синонимы `agentId`)

**workspace** · **agent** · **vault** · **хранилище** · **рабочее пространство** — одно и то же: id из `list_workspaces` (alias `list_vaults`).

## Старт нового чата

```
list_workspaces
get_session_context({ agentId: "<выбранный-id>" })
```

Дальше **каждый** workspace-scoped tool с тем же `agentId`. Пример фразы пользователя:

> Работай с хранилищем MedCenter. Сначала list_workspaces, потом get_session_context с нужным agentId, дальше всегда передавай этот agentId во все MCP tools.

Затем при необходимости: `get_user_active_context_now` → `read_*` / `write_*` по задаче.

**Без `agentId`:** только `list_workspaces`, `list_vaults`, `search_web*`, `read_web_page`, `get_link_preview`.

### Канон (PAGE · SLOT · CONTENT)

| Группа | Tools |
|--------|-------|
| Старт | `list_workspaces` (`list_vaults`), `create_workspace`, `update_workspace`, `set_default_workspace`, `set_orchestrator_workspace`, `list_workspace_groups`, `*_workspace_group*`, `get_session_context`, `get_user_active_context_now`, `list_workspace_*`, `test_mcp_connection`, `get_workspace_storage_info` — registry/group tools **без** `agentId`; остальное **с `agentId`** |
| Навигация | `get_page_map`, `get_content_index`, `refresh_content_index`, `get_workspace_page_index`, `refresh_workspace_page_index`, `get_content_map`, `resolve_workspace_path`, `get_page_url`, `list_repositories`, `get_repository`, `refresh_repository_index`, `register_repository`, `search_workspace_content`, `search_workspace_semantic` (оба с опц. `pathPrefix`) |
| Страница | `read/write_page_*`, `read/write_page_property`, `read/write_page_config`, `page_exists`, `get_page_meta`, `read/write_page_env`, `create_page`, `delete_page`, `rename_page`, `move_page` |
| Слот | `list_page_slots` |
| Контент | `content_exists`, `get_content_meta`, `read/write_content_*`, `read/write_content_property`, `create_content`, `import_content_from_url`, `rename/move/delete_content` |
| Типы | `list_types`, `get_type` |
| awn-databases | `database_frame_*` (каркас), `database_element_*` (элементы); `iblock_*` deprecated |
| Workspace pads | `read_workspace_note`, `write_workspace_note`, `read_workspace_todo`, `write_workspace_todo` |
| File hub queue | `read_file_hub_queue`, `send_file_to_file_hub`, `remove_file_from_file_hub` |
| Fact bank | `retain_workspace_fact`, `list_workspace_facts`, `recall_workspace_facts` → `awn-facts/` (см. `GLOBAL_MCP_DOC.md` § Банк фактов) |
| FS | `list_system_files`, `read_file`, `write_file`, `upload_file`, `upload_file_from_url`, `list_folder`, `batch_invoke` |
| Exec | `run_script`, `exec_command`, `exec_shell` |
| Медиа в облако | `list_media_cloud_providers`, `get_media_cloud_file_status`, `sync_media_cloud_file`, `repair_media_cloud_links`; заглушки: `upload_media_cloud_to_provider_zzz`, `get_remote_url_zzz` |

Бинарники и media — **`upload_file`** (base64) или **`upload_file_from_url`** по полному workspace path; в слот темы — **`import_content_from_url`**.  
Локальная выгрузка в **`awn-media-cloud/_blobs/`** (симлинк на месте файла) — **`sync_media_cloud_file`**; удалённый API-провайдер — пока только заглушки `*_zzz`.

## Документация

- Агентская шпаргалка: `GLOBAL_MCP_DOC.md` (always-context)
- HTTP JSON: `GET https://localhost:3443/api/mcp-docs?version=0.0.2` (URL подставляется автоматически в модалке **MCP**)

## Запуск

```bash
npm start          # из корня Agent CMS
node mcp-server/index.js   # stdio
```

Из корня: `npm run mcp`
