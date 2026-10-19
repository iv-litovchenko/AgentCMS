# Рефакторинг — часть 15 (MCP Agent CMS)

**Цель:** канон имён tools, без legacy в доке; убрать дубли и переименовать утилиты.  
**Статус:** набросок (дерево + решения). **🔴** = не в коде · **🟢** = ок в MCP (канон или `module_*`, + legacy где есть).

### Именование `сущность_действие`

- **Список реестра** → **множественное** + `_list`: `databases_list`, `channels_list` (не `database_list` — это звучит как «список внутри одной базы»).
- **Одна запись / поля** → **единственное** + `_get|_register|_read|…`: `database_get`, `topic_body_read`.
- Старые `list_*` / `get_*` / `read_*` → legacy после миграции.

---

## 🌳 Канон MCP `user-agent-cms` (без legacy)

**Итого в дереве: 233 метода** (legacy-алиасы и `*_zzz` stub не считаются).

```
user-agent-cms
│
├── 🚀 Старт и workspace · 27
│   ├── list_workspaces
│   ├── discover_workspaces
│   ├── create_workspace
│   ├── register_workspace
│   ├── update_workspace
│   ├── set_default_workspace
│   ├── set_orchestrator_workspace
│   ├── list_workspace_groups
│   ├── create_workspace_group
│   ├── update_workspace_group
│   ├── delete_workspace_group
│   ├── assign_workspace_to_group
│   ├── remove_workspace_from_group
│   ├── reorder_workspace_groups
│   ├── get_session_context
│   ├── get_ui_focus
│   ├── get_ui_open_location
│   ├── get_workspace_always_context_registry
│   ├── get_workspace_cron_registry
│   ├── get_workspace_heartbeat_registry
│   ├── test_mcp_connection
│   ├── get_workspace_storage_info
│   ├── get_agent_identity
│   ├── get_user_identity
│   ├── generate_workspace_slug
│   ├── list_recent_activity
│   └── notify_user
│
├── ⚙️ Платформа и настройки · 10
│   ├── get_platform_info
│   ├── get_platform_health
│   ├── list_platform_docs
│   ├── read_platform_doc
│   ├── list_platform_config
│   ├── list_settings
│   ├── read_setting
│   ├── write_setting
│   ├── read_dependencies
│   └── write_dependencies
│
├── 🗺 Карты, TOC, id, URL · 32
│   ├── read_workspace_map
│   ├── refresh_workspace_map
│   ├── read_topic_index_toc
│   ├── refresh_topic_index_toc
│   ├── read_content_index_toc
│   ├── refresh_content_index_toc
│   ├── read_databases_index_toc
│   ├── refresh_databases_index_toc
│   ├── read_channels_index_toc
│   ├── refresh_channels_index_toc
│   ├── read_repository_index_toc
│   ├── refresh_repository_index_toc
│   ├── read_media_library_index_toc
│   ├── refresh_media_library_index_toc
│   ├── list_topics
│   ├── get_topic
│   ├── get_topic_url
│   ├── get_topic_meta
│   ├── topic_exists
│   ├── list_slots
│   ├── get_topic_slots_template
│   ├── set_topic_slots_template
│   ├── list_types
│   ├── get_type
│   ├── find_by_id
│   ├── resolve_workspace_id
│   ├── assign_workspace_id
│   ├── resolve_workspace_path
│   ├── get_workspace_open_url_from_path
│   ├── get_workspace_url_page_preview
│   ├── get_external_url_page_preview
│   └── get_link_preview
│
├── 📄 Контент · 18
│   ├── list_content
│   ├── read_content
│   ├── write_content
│   ├── read_content_binary
│   ├── write_content_binary
│   ├── write_content_binary_from_url
│   ├── get_content_binary_url
│   ├── content_exists
│   ├── get_content_meta
│   ├── read_content_property
│   ├── write_content_property
│   ├── create_content
│   ├── delete_content
│   ├── rename_content
│   ├── move_content
│   ├── split_content
│   ├── merge_content
│   └── batch_invoke
│
├── 🧩 Тема · 17
│   ├── 🔴 topic_body_read              ← read_topic_body
│   ├── 🔴 topic_body_write             ← write_topic_body
│   ├── 🔴 topic_properties_read        ← read_topic_properties
│   ├── 🔴 topic_properties_write       ← write_topic_properties
│   ├── 🔴 topic_property_read          ← read_topic_property
│   ├── 🔴 topic_property_write         ← write_topic_property
│   ├── 🔴 topic_schema_read            ← read_topic_schema
│   ├── 🔴 topic_schema_write           ← write_topic_schema
│   ├── 🔴 topic_config_read            ← read_topic_config
│   ├── 🔴 topic_config_write           ← write_topic_config
│   ├── 🔴 topic_env_read               ← read_topic_env
│   ├── 🔴 topic_env_write              ← write_topic_env
│   ├── 🔴 topic_create                 ← create_topic
│   ├── 🔴 topic_update                 ← update_topic
│   ├── 🔴 topic_delete                 ← delete_topic
│   ├── 🔴 topic_rename                 ← rename_topic
│   └── 🔴 topic_move                   ← move_topic
│
├── 🗃 Базы · 12
│   ├── 🟢 databases_list               ← list_databases
│   ├── 🟢 database_get                 ← get_database
│   ├── 🟢 database_register            ← register_database
│   ├── 🟢 database_update              ← update_database
│   ├── 🟢 database_delete              ← delete_database
│   ├── 🟢 database_rename              ← rename_database
│   ├── 🟢 database_schema_read         ← read_database_schema
│   ├── 🟢 database_schema_write        ← write_database_schema
│   ├── 🟢 database_properties_read     ← read_database_properties
│   ├── 🟢 database_properties_write    ← write_database_properties
│   ├── 🟢 database_property_read       ← read_database_property
│   └── 🟢 database_property_write      ← write_database_property
│
├── 📡 Каналы · 6
│   ├── 🟢 channels_list                ← list_channels
│   ├── 🟢 channel_get                  ← get_channel
│   ├── 🟢 channel_register             ← register_channel
│   ├── 🟢 channel_update               ← update_channel
│   ├── 🟢 channel_delete               ← delete_channel
│   └── 🟢 channel_rename               ← rename_channel
│
├── 🖼 Медиатеки · 6
│   ├── 🟢 media_libraries_list         ← list_media_libraries
│   ├── 🟢 media_library_get            ← get_media_library
│   ├── 🟢 media_library_register       ← register_media_library
│   ├── 🟢 media_library_update         ← update_media_library
│   ├── 🟢 media_library_delete         ← delete_media_library
│   └── 🟢 media_library_rename         ← rename_media_library
│
├── 📦 Репозитории · 6
│   ├── 🟢 repositories_list            ← list_repositories
│   ├── 🟢 repository_get               ← get_repository
│   ├── 🟢 repository_register          ← register_repository
│   ├── 🟢 repository_update            ← update_repository
│   ├── 🟢 repository_delete            ← delete_repository
│   └── 🟢 repository_rename            ← rename_repository
│
├── 🔍 Поиск и индексы · 32
│   ├── search_workspace_content
│   ├── search_workspace_semantic
│   ├── search_workspace_hybrid
│   ├── search_workspace_batch
│   ├── search_workspace_links
│   ├── search_and_get_context
│   ├── ask_workspace
│   ├── query_workspace_storage
│   ├── query_workspace_entities
│   ├── explain_workspace_entity_search
│   ├── list_workspace_registry_queries
│   ├── run_workspace_registry_query
│   ├── get_workspace_index_status
│   ├── get_workspace_index_monitor
│   ├── rebuild_workspace_indexes
│   ├── rebuild_workspace_semantic_index
│   ├── rebuild_workspace_fulltext_index
│   ├── rebuild_workspace_storage_index
│   ├── rebuild_workspace_link_index
│   ├── rebuild_workspace_entity_index
│   ├── sync_workspace_index_file
│   ├── run_workspace_ocr_index
│   ├── get_workspace_entity_registry
│   ├── put_workspace_entity_registry
│   ├── upsert_workspace_entity_type
│   ├── list_workspace_entity_catalog
│   ├── merge_workspace_entity_alias
│   ├── reject_workspace_entity
│   ├── seed_workspace_entity
│   ├── audit_workspace_memory
│   ├── list_workspace_feed
│   └── list_workspace_notifications
│
├── 🧠 Facts · glossary · reference · 12
│   ├── create_workspace_fact
│   ├── update_workspace_fact
│   ├── list_workspace_facts
│   ├── search_workspace_facts
│   ├── create_glossary_term
│   ├── update_glossary_term
│   ├── list_glossary_terms
│   ├── search_glossary_terms
│   ├── create_reference_entry
│   ├── update_reference_entry
│   ├── list_reference_entries
│   └── search_reference_entries
│
├── 💬 Inbox · discussion · comments · 10
│   ├── list_inbox
│   ├── triage_inbox_item
│   ├── read_discussion
│   ├── append_discussion
│   ├── list_comments
│   ├── append_comment
│   ├── read_comment
│   ├── update_comment
│   ├── delete_comment
│   └── toggle_comment_reaction
│
├── 📎 Sidecar · pads · buffer · 13
│   ├── resolve_sidecar_path
│   ├── read_sidecar
│   ├── create_sidecar
│   ├── write_sidecar
│   ├── delete_sidecar
│   ├── read_workspace_note
│   ├── write_workspace_note
│   ├── read_workspace_todo
│   ├── write_workspace_todo
│   ├── read_context_buffer
│   ├── append_context_buffer
│   ├── remove_context_buffer_item
│   └── clear_context_buffer
│
├── 🧰 Модули · 23 (🟢 канон `module_*`, без волны переименования)
│   ├── 🟢 module_git_status
│   ├── 🟢 module_git_diff
│   ├── 🟢 module_git_commit
│   ├── 🟢 module_git_push
│   ├── 🟢 module_git_pull
│   ├── 🟢 module_git_remote
│   ├── 🟢 module_git_init
│   ├── 🟢 module_short_link_create
│   ├── 🟢 module_short_link_get
│   ├── 🟢 module_short_link_list
│   ├── 🟢 module_short_link_delete
│   ├── 🟢 module_media_cloud_providers_list
│   ├── 🟢 module_media_cloud_status
│   ├── 🟢 module_media_cloud_sync
│   ├── 🟢 module_media_cloud_links_repair
│   ├── 🟢 module_media_cloud_upload
│   ├── 🟢 module_media_cloud_url
│   ├── 🟢 module_file_hub_outbound_list
│   ├── 🟢 module_file_hub_outbound_enqueue
│   ├── 🟢 module_file_hub_outbound_remove
│   ├── 🟢 module_file_hub_outbound_clear
│   ├── 🟢 module_file_hub_inbound_list_zzz
│   └── 🟢 module_file_hub_inbound_upload_zzz
│
└── 🌐 Web · exec · journal · 9
    ├── search_web
    ├── search_web_images
    ├── read_web_page
    ├── extract_document_text
    ├── run_script
    ├── exec_command
    ├── exec_shell
    ├── append_journal_entry
    └── list_journal_entries
```

Stub: `module_media_cloud_upload`, `module_media_cloud_url`, `module_file_hub_inbound_*_zzz`.

---

## 🧭 Реестры runtime

```
Сейчас
├── get_workspace_always_context_registry — файлы always-context
├── get_workspace_cron_registry — cron темы/записи
└── get_workspace_heartbeat_registry — heartbeat

Фокус и главная
├── get_ui_focus — live «где человек в UI» (не реестр)
├── get_workspace_storage_info — сводка sidebar / главной / index
└── Новые *_registry — только если появится статический конфиг (pinned home);
    иначе get_session_context + get_ui_focus
```

---

## 👁 UI · id · URL · утилиты

```
UI
├── get_ui_focus — фокус CMS: page / slot / content + hints
└── get_ui_open_location — тот же API, акцент на URL → убрать из канона, оставить get_ui_focus

Переименовать
├── generate_workspace_slug → generate_record_slug (slug для topic/content/store/…)
└── assign_workspace_id → assign_record_awn_id (awn-id в frontmatter записи)

id
├── find_by_id — awn-id → path (канон)
├── resolve_workspace_id — дубль find_by_id → legacy
└── assign_workspace_id — выдать следующий awn-id файлу

Прочее
├── list_recent_activity — лента событий workspace (since / limit)
└── get_topic_url — legacy; канон get_workspace_open_url_from_path (любой path, CHPU + view)
```

---

## ✅ Задачи (кратко)

- [x] **Репозитории:** канон в MCP + legacy alias (`mcp-server/lib/repository-tools.js`)
- [x] **Медиатеки:** канон в MCP + legacy alias (`mcp-server/lib/media-library-tools.js`)
- [x] **Каналы:** канон в MCP + legacy alias (`mcp-server/lib/channel-tools.js`)
- [x] **Базы:** канон в MCP + legacy (`list_databases`, `database_frame_*`) — `mcp-server/lib/iblock-tools.js`
- [x] **Модули:** имена `module_*` — без переименования (git, short link, media cloud, file hub)
- [ ] **Волна 1 (🔴 в дереве):** тема — канон `сущность_действие`, старые имена → legacy
- [ ] Карты/TOC темы: `topics_list`, `topic_get`, `topic_meta_get`, … (отдельно от блока «Тема»)
- [ ] Дубли в legacy: `get_ui_open_location`, `resolve_workspace_id`, `get_topic_url`
- [ ] Переименовать: `generate_record_slug`, `assign_record_awn_id`
- [ ] Док/skills: дерево без legacy; URL только `get_workspace_open_url_from_path`
- [ ] Решить: нужны ли реестры «главная / pinned focus» или хватит live + storage-summary
