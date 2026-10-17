# Карта MCP — Agent CMS

**Актуально:** 2026-10-17 · источник: `mcp-server/index.js` + `mcp-server/lib/*`  
**Сервер:** `name: agent-cms` · `mcp-server/package.json` **0.2.0** · в коде register **0.4.0**  
**Tools:** **245** имён (канон + deprecated aliases + `database_frame_*` / `create_database` …)

**Старт:** `list_workspaces` → `get_session_context({ workspaceId })` → дальше тот же **`workspaceId`** (legacy: `agentId`; не persona `0-agent`).

**Scope:** почти все tools требуют **`workspaceId`**. **Без scope:** `list_workspaces`, `list_vaults`, `search_web*`, `read_web_page`, `get_link_preview`, `test_mcp_connection`, `generate_workspace_slug`, registry workspace (`create_workspace`, …), `get_workspace_storage_info` (см. описание tool).

**Контент:** `read_content` / `write_content` / `list_content` + **`placement.kind`:** `topic` | `channel` | `media` | `database` | `repository` | `root` (legacy `page` → `topic`). Hub-индексы и поиск — отдельные tools (не `placement`).

---

## Дерево (по группам)

```
agent-cms MCP
│
├── 🚀 Старт · контекст
│   ├── list_workspaces · list_vaults
│   ├── get_session_context
│   ├── get_session_documentation
│   ├── get_ui_focus (legacy get_user_active_context_now)
│   ├── list_workspace_always_context
│   ├── list_workspace_cron · list_workspace_heartbeat
│   └── test_mcp_connection
│
├── 🏢 Registry workspace (без workspaceId в args)
│   ├── create_workspace · register_workspace · discover_workspaces
│   ├── update_workspace · set_default_workspace · set_orchestrator_workspace
│   └── list_workspace_groups · create/update/delete_workspace_group
│       assign_workspace_to_group · remove_workspace_from_group · reorder_workspace_groups
│
├── ⚙️ Platform · settings · deps · git
│   ├── get_platform_info · get_platform_health
│   ├── list_platform_docs · read_platform_doc · write_platform_doc
│   ├── list_platform_config
│   ├── list_settings · read_setting · write_setting
│   ├── read_dependencies · write_dependencies
│   └── module_git_init · status · diff · commit · pull · push · remote
│
├── 🧭 Навигация · карты · id · URL
│   ├── list_topics · get_topic · update_topic
│   ├── read_topic_index_toc · refresh_topic_index_toc
│   ├── read_content_index_toc · refresh_content_index_toc
│   ├── read_workspace_map · refresh_workspace_map
│   ├── resolve_workspace_path · get_topic_url
│   ├── find_by_id · resolve_workspace_id · assign_workspace_id
│   └── deprecated: get_topic_map · get_content_map
│
├── 🔍 Поиск · DQL · индексы
│   ├── search_workspace_content · semantic · hybrid · batch
│   ├── search_workspace_links
│   ├── query_workspace_storage
│   ├── list_workspace_registry_queries · run_workspace_registry_query
│   ├── get_workspace_index_status · get_workspace_index_monitor
│   ├── rebuild_workspace_fulltext · semantic · storage · link · entity
│   ├── run_workspace_ocr_index · rebuild_workspace_indexes · sync_workspace_index_file
│   └── entities: query_workspace_entities · merge_workspace_entity_alias · reject_workspace_entity
│       seed_workspace_entity · get/put_workspace_entity_registry · upsert_workspace_entity_type
│       list_workspace_entity_catalog · explain_workspace_entity_search
│
├── 🧠 Память · Q&A · лента
│   ├── audit_workspace_memory · list_workspace_feed
│   ├── ask_workspace · search_and_get_context
│   ├── create/update_workspace_fact · list/search_workspace_facts
│   ├── create/update_glossary_term · list/search_glossary_terms
│   ├── create/update_reference_entry · list/search_reference_entries
│   ├── list_journal_entries · append_journal_entry
│   └── list_workspace_notifications · notify_user
│
├── 📄 Тема (manifest · hub topic)
│   ├── topic_exists · get_topic_meta
│   ├── read/write_topic_body · properties · property · schema · config · env
│   ├── create_topic · delete_topic · rename_topic · move_topic
│   └── list_slots
│
├── 📝 Контент (placement)
│   ├── content_exists · get_content_meta
│   ├── read_content · write_content · list_content
│   ├── read/write_content_property
│   ├── create_content · import_content_from_url
│   ├── rename_content · move_content · delete_content
│   └── legacy part=* (только MCP_LEGACY_TOOLS=1):
│       read/write_content_body · properties · schema
│
├── 🗄️ awn-databases
│   ├── list_databases · get_database · register_database (alias create_database)
│   ├── update_database · rename_database · delete_database
│   ├── read/write_database_schema · properties · property
│   ├── read_databases_index_toc · refresh_databases_index_toc
│   └── deprecated: database_frame_* · read/refresh_database_frame_index_toc
│   └── записи store → *_content_* с kind: database
│
├── 📡 Каналы · 🖼️ медиатеки · 📚 репозитории
│   ├── list/get/register/update/delete/rename_channel · read/refresh_channels_index_toc
│   ├── list/get/register/update/delete/rename_media_library · read/refresh_media_library_index_toc
│   ├── list/get/register/update/delete/rename_repository · read/refresh_repository_index_toc
│   └── legacy (MCP_LEGACY_TOOLS=1): list/read/upload_channel_* · list/read/upload_media_library_*
│
├── 📥 Inbox · 💬 discussion · comments
│   ├── list_inbox · triage_inbox_item
│   ├── read_discussion · append_discussion
│   ├── read_dialogs · append_dialog (deprecated → discussion)
│   └── list/read/append/update/delete_comment · toggle_comment_reaction
│
├── 📎 Sidecar
│   └── resolve_sidecar_path · read/write/create/delete_sidecar
│
├── 📁 FS workspace
│   ├── list_root_files · read_root_file · write_root_file
│   ├── list_system_files · read_system_file · write_system_file (alias root)
│   ├── list_folder · patch_file · upload_file · upload_file_from_url
│   ├── legacy (MCP_LEGACY_TOOLS=1): read_file · write_file
│   └── batch_invoke
│
├── ☁️ Media cloud
│   ├── list_media_cloud_providers · get_media_cloud_file_status
│   ├── sync_media_cloud_file · repair_media_cloud_links
│   └── stubs: upload_media_cloud_to_provider_zzz · get_remote_url_zzz
│
├── 🌐 Web (часть без workspaceId)
│   ├── search_web · search_web_images · read_web_page
│   ├── get_link_preview · extract_document_text
│
├── ⚡ Exec
│   └── run_script · exec_command · exec_shell
│
├── 🛠️ Утилиты · identity
│   ├── generate_workspace_slug · get_workspace_storage_info · list_recent_activity
│   └── get_agent_identity · get_user_identity
│
├── 📤 File hub · 📓 pads
│   ├── read_file_hub_queue · add/remove_file_from_file_hub · clear_file_hub_queue
│   └── read/write_workspace_note · read/write_workspace_todo
│
└── 🏷️ Типы
    └── list_types · get_type
```

---

## Legacy и флаги

| Условие | Что появляется |
| -------- | --------------- |
| **`MCP_LEGACY_TOOLS=1`** | `read_file`, `write_file`, `read/write_content_{body,properties,schema}`, `list/read/upload_channel_*`, `list/read/upload_media_library_*` |
| **Всегда в MCP** | `list_vaults`, `list/read/write_system_*`, `read_dialogs` / `append_dialog`, `get_user_active_context_now` → `get_ui_focus` |
| **Deprecated aliases** | `get_topic_map`, `get_content_map`, `create_database`, `database_frame_*`, … — те же handlers, что канон |

---

## Связанные документы

- [GLOBAL-MCP-INSTRUCTION.md](../workspaces/0-md/GLOBAL-MCP-INSTRUCTION.md) — правила для агентов  
- [MCP-INSTRUCTIONS.md](../workspaces/0-md/MCP-INSTRUCTIONS.md) — server instructions  
- [mcp-server/README.md](../mcp-server/README.md) — установка и env  
- [TODO-REFACTOR-4.md](../TODO-REFACTOR-4.md) — модель placement (историческая карта)  
- [TODO-REFACTOR-11.md](../TODO-REFACTOR-11.md) — что в `get_session_context`

**Пересборка карты:** из корня репо — парсинг `reg(` / `canonical:` / `registerFactTool` в `mcp-server/**/*.js` (245 имён на 2026-10-17).
