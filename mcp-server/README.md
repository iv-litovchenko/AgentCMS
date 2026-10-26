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
| `MCP_LEGACY_ALIASES` | _(пусто)_ | `1` / `true` — deprecated names: aliases (`read_content`, `list_settings`, …) and legacy maps `get_topic_map`, `get_content_map`. Default: ~270 canonical tools. |
| `MCP_LEGACY_TOOLS` | _(пусто)_ | `1` / `true` — legacy FS/path tools: `list_folder`, `patch_file`, `list/read/write_root_file`, `read_file`, `upload_file`, `read_content_body`, … |
| `AGENT_CMS_MCP_INSTRUCTIONS` | _(вкл.)_ | `0` / `false` / `off` — не отдавать `instructions` в MCP initialize |
| `AGENT_CMS_MCP_INSTRUCTIONS_PATH` | _(inline по умолчанию)_ | Полностью заменить текст MCP `instructions` файлом (читается при старте процесса) |
| `AGENT_CMS_MCP_DEPRECATE_AGENT_ID` | _(вкл.)_ | `0` — не писать в stderr предупреждение при вызовах только с legacy `agentId` |
| `AGENT_CMS_PUBLIC_URL` | — | Для **Streamable HTTP** (`http.js`): `serverInfo.icons` → `{origin}/favicon.png` и `.svg` |
| `AGENT_CMS_MCP_ICON_URL` | — | Одна картинка вместо favicon (полный URL); опционально `AGENT_CMS_MCP_ICON_BASE_URL` |

**Большие файлы (без base64):** `content_binary_upload_begin` → **PUT** `putUrl` (сырые байты) → `content_binary_upload_complete`.

## Термины

**`workspaceId`** — канонический параметр (id из `workspaces_list`, напр. `0-ws-test`). Legacy alias: **`agentId`** (не путать с темой **0-agent** / identity).

**workspace** · **vault** · **хранилище** · **рабочее пространство** — синонимы хранилища.

## Старт нового чата

```
workspaces_list
session_context_get({ workspaceId: "<выбранный-id>" })
```

Дальше **каждый** workspace-scoped tool с тем же **`workspaceId`**. Пример фразы пользователя:

> Работай с хранилищем MedCenter. Сначала workspaces_list, потом session_context_get с нужным workspaceId, дальше всегда передавай этот workspaceId во все MCP tools.

Затем при необходимости: `session_context_get_user_open_url_location_in_ui` → `read_*` / `write_*` по задаче.

**Без `workspaceId`:** только `workspaces_list`, `list_vaults` (legacy), `utility_web_*` (legacy `tool_web_*`), `utility_web_page_preview` (legacy `get_link_preview`, …).

### Два слоя API

| Слой | Вопрос агента | Tools |
|------|----------------|-------|
| **Контент (`placement`)** | Открыть/сохранить **один** файл в слоте или по пути workspace | `read_content`, `write_content`, `list_content`, `list_slots`, `create_content`, … |
| **Индексы и поиск** | Навигация, поиск, кэш | `nav_map_workspace_*`, `nav_index_toc_*`, `search_*`, `index_*`, … |

Нет `placement.kind: index` — индексы остаются **отдельными** именованными tools (см. `GLOBAL-SKILL-1-BASE.md`, раздел 14). Search и rebuild в `read_content` не добавлять без отдельного продуктового решения.

### Канон (PAGE · SLOT · CONTENT)

| Группа | Tools |
|--------|-------|
| Старт | `workspaces_list`, `workspace_*`, `workspaces_scan`, `workspace_groups_*`, `session_*`, `workspace_summary_get` — см. `session-tools.js`; остальное **с `workspaceId`** |
| Platform | `platform_info_get`, `platform_health_get` (нужен `workspaceId`), `platform_docs_list`, `platform_doc_read`, `platform_config_list`; настройки: `settings_list`, `setting_read`, `setting_write` |
| Workspace CSV | `workspace_dependencies_read`, `workspace_dependencies_write` — `dependencies.csv` в корне выбранного workspace (**нужен `workspaceId`**) |
| Навигация и поиск | `nav_*`, `record_id_resolve`, `record_path_resolve`, `record_url_get`, `search_*`, `index_*` — **не** `content_read`. Legacy: `rebuild_workspace_*`, `search_workspace_*`, `*_index_toc_*`, `read_workspace_map`, … |
| Тема (manifest) | `topic_get`, `topic_*_read` / `topic_*_write`, `topics_list`, `topic_create`, `topic_delete`, … (legacy `get_topic`, `read_topic_*`, …) |
| Слот | `list_slots` |
| Контент | `contents_list` (+ `_sections`, `_tree`, `_preview`, `_full`), **`contents_count`**, `content_read` / `content_write`, `contents_list_reconcile` (🔵), … (legacy `read_content`, `list_content` → paginated list) |
| Типы | `list_types`, `get_type` |
| awn-databases | `database_get` (slim hub), `database_get_full`, `databases_list`, …; записи — **`contents_list`** (`database`, `data`) + `content_*` (не тянуть records через `database_get`) |
| Session pads | `session_note_*`, `session_todo_*` (legacy `workspace_note_*`, `read_workspace_*`) — `workspace-pad-tools.js`, регистрация в `session-tools.js` |
| Файлообменник | `module_file_hub_outbound_list`, `enqueue`, `remove`, `clear`; stub inbound: `module_file_hub_inbound_*_zzz` (legacy: `read/add/remove/clear_file_hub_*`) |
| Fact bank | `fact_create`, `facts_list`, … (legacy `workspace_fact_*`, `create_workspace_fact`, …) → `0-contents/0-facts` |
| Glossary | `glossary_term_create`, `glossary_terms_list`, … (legacy `create_glossary_term`, …) → `0-contents/0-glossary` |
| Reference | `reference_entry_create`, `reference_entries_list`, … (legacy `create_reference_entry`, …) → `0-contents/0-reference` |
| FS | `batch_tools_invoke` (legacy `request_batch_invoke`, `tool_batch_invoke`, `batch_invoke`); legacy (`MCP_LEGACY_TOOLS=1`): `list_folder`, `patch_file`, `list_root_files`, `read_root_file`, `write_root_file` (aliases `list/read/write_system_*`), `read_file`, `write_file`, `upload_file`, `upload_file_from_url` |
| Утилиты (`utility_*`) | `utility_mcp_ping`, `utility_web_search`, `utility_web_images_search`, `utility_web_page_read`, `utility_document_text_extract`, `utility_script_run`, `utility_command_exec`, `utility_shell_exec` (legacy `tool_*`, `search_web*`, `exec_*`, …) |
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
