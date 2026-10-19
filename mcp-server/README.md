# Agent CMS — MCP Server v0.4.0 (per-chat workspaceId · databases_list … · content placement database)

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
| `AGENT_CMS_AGENT` | — | **Не задавайте в Claude/Cursor config.** Только dev-fallback, если workspaceId не передан в tool |
| `AGENT_CMS_TLS_INSECURE` | `1` для self-signed localhost | `0` если сертификат доверенный (mkcert) |
| `MCP_LEGACY_TOOLS` | _(пусто)_ | `1` / `true` — legacy tools: `list_folder`, `patch_file`, `list/read/write_root_file`, `read_file`, `upload_file`, `read_content_body`, … |
| `AGENT_CMS_MCP_INSTRUCTIONS` | _(вкл.)_ | `0` / `false` / `off` — не отдавать `instructions` в MCP initialize |
| `AGENT_CMS_MCP_INSTRUCTIONS_PATH` | _(inline по умолчанию)_ | Полностью заменить текст MCP `instructions` файлом (читается при старте процесса) |
| `AGENT_CMS_MCP_DEPRECATE_AGENT_ID` | _(вкл.)_ | `0` — не писать в stderr предупреждение при вызовах только с legacy `agentId` |

## Термины

**`workspaceId`** — канонический параметр (id из `list_workspaces`, напр. `0-ws-test`). Legacy alias: **`agentId`** (не путать с темой **0-agent** / identity).

**workspace** · **vault** · **хранилище** · **рабочее пространство** — синонимы хранилища.

## Старт нового чата

```
list_workspaces
get_session_context({ workspaceId: "<выбранный-id>" })
```

Дальше **каждый** workspace-scoped tool с тем же **`workspaceId`**. Пример фразы пользователя:

> Работай с хранилищем MedCenter. Сначала list_workspaces, потом get_session_context с нужным workspaceId, дальше всегда передавай этот workspaceId во все MCP tools.

Затем при необходимости: `get_ui_focus` → `read_*` / `write_*` по задаче.

**Без `workspaceId`:** только `list_workspaces`, `list_vaults`, `search_web*`, `read_web_page`, `get_link_preview`.

### Два слоя API

| Слой | Вопрос агента | Tools |
|------|----------------|-------|
| **Контент (`placement`)** | Открыть/сохранить **один** файл в слоте или по пути workspace | `read_content`, `write_content`, `list_content`, `list_slots`, `create_content`, … |
| **Индексы и поиск** | Оглавление, hub-каталог, найти по workspace, пересобрать кэш | `read_*_index_toc`, `refresh_*_index_toc`, `read_workspace_map`, `search_workspace_*`, `rebuild_workspace_*`, … (legacy: `get_topic_map`, `get_content_map`) |

Нет `placement.kind: index` — индексы остаются **отдельными** именованными tools (см. `GLOBAL-SKILL-1-BASE.md`, раздел 14). Search и rebuild в `read_content` не добавлять без отдельного продуктового решения.

### Канон (PAGE · SLOT · CONTENT)

| Группа | Tools |
|--------|-------|
| Старт | `list_workspaces` (`list_vaults`), `create_workspace`, `register_workspace`, `discover_workspaces`, `update_workspace`, `set_default_workspace`, `set_orchestrator_workspace`, `list_workspace_groups`, `*_workspace_group*`, `get_session_context`, `get_ui_focus`, `list_workspace_*`, `test_mcp_connection`, `get_workspace_storage_info` — registry/group tools **без** `workspaceId`; остальное **с `workspaceId`** (legacy `agentId`) |
| Platform | `get_platform_info`, `get_platform_health` (нужен `workspaceId`), `list_platform_docs`, `read_platform_doc`, `list_platform_config`; значения настроек: `list_settings` (`scope: platform`) |
| Навигация и поиск | `read_*_index_toc` / `refresh_*_index_toc` (TOC markdown), `read_workspace_map` / `refresh_workspace_map` (WS-MAP.md), `find_by_id` (`resolve_workspace_id`), `resolve_workspace_path`, `get_topic_url`, hubs (`read/refresh_*_index_toc`), `search_workspace_*` (опц. `pathPrefix`), `rebuild_workspace_*`, `get_workspace_index_*` — **не** `read_content`. **Deprecated:** `get_topic_map` → `read_topic_index_toc` + `list_content` (`kind: root`); `get_content_map` → `read_content_index_toc` + `read_content` (`part=properties`) |
| Тема (manifest) | `topic_get`, `topic_*_read` / `topic_*_write`, `topics_list`, `topic_create`, `topic_delete`, … (legacy `get_topic`, `read_topic_*`, …) |
| Слот | `list_slots` |
| Контент | `content_read` / `content_write` / `contents_list` (legacy `read_content`, …), `content_exists`, `content_meta_get`, lifecycle `content_*`; hub file legacy — `MCP_LEGACY_TOOLS=1` |
| Типы | `list_types`, `get_type` |
| awn-databases | `databases_list` / `database_get` … (legacy `list_databases`, `database_frame_*`); записи — `*_content_*` |
| Workspace pads | `read_workspace_note`, `write_workspace_note`, `read_workspace_todo`, `write_workspace_todo` |
| Файлообменник | `module_file_hub_outbound_list`, `enqueue`, `remove`, `clear`; stub inbound: `module_file_hub_inbound_*_zzz` (legacy: `read/add/remove/clear_file_hub_*`) |
| Fact bank | `workspace_fact_create`, `workspace_facts_list`, … (legacy `create_workspace_fact`, …) → `0-contents/0-facts` |
| Glossary | `glossary_term_create`, `glossary_terms_list`, … (legacy `create_glossary_term`, …) → `0-contents/0-glossary` |
| Reference | `reference_entry_create`, `reference_entries_list`, … (legacy `create_reference_entry`, …) → `0-contents/0-reference` |
| FS | `batch_invoke`; legacy (`MCP_LEGACY_TOOLS=1`): `list_folder`, `patch_file`, `list_root_files`, `read_root_file`, `write_root_file` (aliases `list/read/write_system_*`), `read_file`, `write_file`, `upload_file`, `upload_file_from_url` |
| Exec | `run_script`, `exec_command`, `exec_shell` |
| Медиа-облако | `module_media_cloud_providers_list`, `module_media_cloud_status`, `module_media_cloud_sync`, `module_media_cloud_links_repair`; stub: `module_media_cloud_upload`, `module_media_cloud_url` (legacy: `list_media_cloud_*`, `sync_media_cloud_file`, `*_zzz`) |

Бинарники в слот — **`write_content_binary`** / **`write_content_binary_from_url`** (`placement` + ref); legacy path upload — только **`MCP_LEGACY_TOOLS=1`** (`upload_file`, …). Alias: **`import_content_from_url`** → **`write_content_binary_from_url`**.  
Локальная выгрузка в **`awn-media-cloud/_blobs/`** (симлинк на месте файла) — **`module_media_cloud_sync`**; удалённый API — **`module_media_cloud_upload`** / **`module_media_cloud_url`** (stub).

## Документация

- MCP `instructions`: короткий inline в `mcp-server/lib/mcp-instructions.js`; welcome — скилл `agent-cms-welcome` (`GLOBAL-SKILL-0-MCP-WELCOME.md`), необязательный; без него — `read_platform_doc`. Базовый скилл: **`read_platform_doc({ path: "GLOBAL-SKILL-1-BASE.md" })`** (не always-context)
- HTTP JSON: `GET https://localhost:3443/api/mcp-docs?version=0.0.2` (URL подставляется автоматически в модалке **MCP**)

## Запуск

```bash
npm start          # из корня Agent CMS
node mcp-server/index.js   # stdio
node mcp-server/http.js    # Streamable HTTP → http://127.0.0.1:3490/mcp (Cursor URL)
```

### Remote MCP (HTTP)

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `AGENT_CMS_MCP_HTTP_HOST` | `127.0.0.1` | `0.0.0.0` для LAN/Docker |
| `AGENT_CMS_MCP_HTTP_PORT` | `3490` | |
| `AGENT_CMS_MCP_TOKEN` | — | Bearer / `X-Agent-Cms-Mcp-Token` |
| `AGENT_CMS_BASE_URL` | см. выше | CMS API для tools |

```bash
AGENT_CMS_MCP_HTTP_HOST=0.0.0.0 npm run mcp:http
```

Из корня: `npm run mcp` (stdio) · `npm run mcp:http`
