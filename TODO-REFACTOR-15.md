# Рефакторинг — часть 15 (MCP Agent CMS)

**Цель:** канон имён tools, без legacy в доке; убрать дубли и переименовать утилиты.  
**Статус:** набросок (дерево + решения). **🔴** = не в коде · **🟢** = переименовано в MCP (+ legacy) · **🟡** = имя оставили (`*_exists`, `list_slots` — уже `сущность_глагол`).

### Именование `сущность_действие`

- **Список реестра** → **множественное** + `_list`: `databases_list`, `channels_list` (не `database_list` — это звучит как «список внутри одной базы»).
- **Одна запись / поля** → **единственное** + `_get|_register|_read|…`: `database_get`, `topic_body_read`.
- Старые `list_*` / `get_*` / `read_*` → legacy после миграции.

---

## 🌳 Канон MCP `user-agent-cms` (без legacy)

**Итого в дереве: 232 метода** (legacy-алиасы и `*_zzz` stub не считаются; `get_topic_url` = alias, не отдельная строка).

```
user-agent-cms
│
├── ⚙️ Платформа и настройки · 8
│   ├── 🟢 platform_info_get                  ← get_platform_info
│   ├── 🟢 platform_health_get                ← get_platform_health
│   ├── 🟢 platform_docs_list                 ← list_platform_docs
│   ├── 🟢 platform_doc_read                  ← read_platform_doc
│   ├── 🟢 platform_config_list               ← list_platform_config
│   ├── 🟢 settings_list                      ← list_settings
│   ├── 🟢 setting_read                       ← read_setting
│   └── 🟢 setting_write                      ← write_setting
│
├── 🚀 Старт и workspace · 29
│   ├── 🟢 workspaces_list                    ← list_workspaces (+ list_vaults legacy)
│   ├── 🟢 workspaces_discover                ← discover_workspaces
│   ├── 🟢 workspace_create                   ← create_workspace
│   ├── 🟢 workspace_register                 ← register_workspace
│   ├── 🟢 workspace_update                   ← update_workspace
│   ├── 🟢 workspace_default_set              ← set_default_workspace
│   ├── 🟢 workspace_orchestrator_set         ← set_orchestrator_workspace
│   ├── 🟢 workspace_groups_list              ← list_workspace_groups
│   ├── 🟢 workspace_group_create             ← create_workspace_group
│   ├── 🟢 workspace_group_update             ← update_workspace_group
│   ├── 🟢 workspace_group_delete             ← delete_workspace_group
│   ├── 🟢 workspace_group_assign             ← assign_workspace_to_group
│   ├── 🟢 workspace_group_unassign           ← remove_workspace_from_group
│   ├── 🟢 workspace_groups_reorder           ← reorder_workspace_groups
│   ├── 🟢 workspace_dependencies_read        ← dependencies_read / read_dependencies
│   ├── 🟢 workspace_dependencies_write       ← dependencies_write / write_dependencies
│   ├── 🔴 session_context_get                ← get_session_context (имя/граница light vs heavy — TBD)
│   ├── 🔴 get_ui_focus                       ← get_user_active_context_now (канон ui_* — TBD)
│   ├── 🔴 get_ui_open_location               (дубль get_ui_focus → legacy-only — TBD)
│   ├── 🔴 workspace_always_context_registry_get ← get_workspace_always_context_registry (TBD)
│   ├── 🔴 workspace_cron_registry_get        ← get_workspace_cron_registry (TBD)
│   ├── 🔴 workspace_heartbeat_registry_get   ← get_workspace_heartbeat_registry (TBD)
│   ├── 🔴 mcp_connection_test                ← test_mcp_connection (ожидает platform_* / блок платформы)
│   ├── 🔴 workspace_storage_info_get         ← get_workspace_storage_info (TBD)
│   ├── 🔴 agent_identity_get                 ← get_agent_identity (TBD)
│   ├── 🔴 user_identity_get                  ← get_user_identity (TBD)
│   ├── 🔴 record_slug_generate               ← generate_workspace_slug (TBD)
│   ├── 🔴 workspace_activity_list            ← list_recent_activity (TBD)
│   └── 🔴 notify_user                        (TBD)
│
├── 🗺 Карты, id, URL · 12
│   ├── read_workspace_map
│   ├── refresh_workspace_map
│   ├── list_types
│   ├── get_type
│   ├── find_by_id
│   ├── resolve_workspace_id
│   ├── assign_workspace_id
│   ├── resolve_workspace_path
│   ├── get_workspace_open_url_from_path   (канон URL; legacy get_topic_url)
│   ├── get_workspace_url_page_preview
│   ├── get_external_url_page_preview
│   └── get_link_preview
│
├── 🧭 Темы · topics_ / topic_ · 28
│   ├── 🟢 topics_index_toc_read          ← read_topic_index_toc
│   ├── 🟢 topics_index_toc_refresh       ← refresh_topic_index_toc
│   ├── 🟢 topics_list                    ← list_topics
│   ├── 🟢 topic_get                      ← get_topic
│   ├── 🟢 topic_meta_get                 ← get_topic_meta
│   ├── 🟡 topic_exists
│   ├── 🟡 list_slots
│   ├── 🟢 topic_slots_template_get       ← get_topic_slots_template
│   ├── 🟢 topic_slots_template_set       ← set_topic_slots_template
│   ├── 🟢 topic_body_read                ← read_topic_body
│   ├── 🟢 topic_body_write               ← write_topic_body
│   ├── 🟢 topic_properties_read          ← read_topic_properties
│   ├── 🟢 topic_properties_write         ← write_topic_properties
│   ├── 🟢 topic_property_read            ← read_topic_property
│   ├── 🟢 topic_property_write           ← write_topic_property
│   ├── 🟢 topic_schema_read              ← read_topic_schema
│   ├── 🟢 topic_schema_write             ← write_topic_schema
│   ├── 🟢 topic_config_read              ← read_topic_config
│   ├── 🟢 topic_config_write             ← write_topic_config
│   ├── 🟢 topic_env_read                 ← read_topic_env
│   ├── 🟢 topic_env_write                ← write_topic_env
│   ├── 🟢 topic_create                   ← create_topic
│   ├── 🟢 topic_update                   ← update_topic
│   ├── 🟢 topic_delete                   ← delete_topic
│   ├── 🟢 topic_rename                   ← rename_topic
│   └── 🟢 topic_move                     ← move_topic
│
├── 📄 Контент · 20
│   ├── 🟢 contents_index_toc_read       ← read_content_index_toc
│   ├── 🟢 contents_index_toc_refresh    ← refresh_content_index_toc
│   ├── 🟢 contents_list                 ← list_content
│   ├── 🟢 content_read                  ← read_content
│   ├── 🟢 content_write                 ← write_content
│   ├── 🟢 content_binary_read           ← read_content_binary
│   ├── 🟢 content_binary_write          ← write_content_binary
│   ├── 🟢 content_binary_write_from_url ← write_content_binary_from_url (+ import_content_from_url)
│   ├── 🟢 content_binary_url_get        ← get_content_binary_url
│   ├── 🟡 content_exists
│   ├── 🟢 content_meta_get              ← get_content_meta
│   ├── 🟢 content_property_read         ← read_content_property
│   ├── 🟢 content_property_write        ← write_content_property
│   ├── 🟢 content_create                ← create_content
│   ├── 🟢 content_delete                ← delete_content
│   ├── 🟢 content_rename                ← rename_content
│   ├── 🟢 content_move                  ← move_content
│   ├── 🟢 content_split                 ← split_content
│   ├── 🟢 content_merge                 ← merge_content
│   └── batch_invoke                      (имя без изменений)
│
├── 🗃 Базы · 14
│   ├── 🟢 databases_index_toc_read     ← read_databases_index_toc / read_database_frame_index_toc
│   ├── 🟢 databases_index_toc_refresh  ← refresh_databases_index_toc / refresh_database_frame_index_toc
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
├── 📡 Каналы · 8
│   ├── 🟢 channels_index_toc_read      ← read_channels_index_toc
│   ├── 🟢 channels_index_toc_refresh   ← refresh_channels_index_toc
│   ├── 🟢 channels_list                ← list_channels
│   ├── 🟢 channel_get                  ← get_channel
│   ├── 🟢 channel_register             ← register_channel
│   ├── 🟢 channel_update               ← update_channel
│   ├── 🟢 channel_delete               ← delete_channel
│   └── 🟢 channel_rename               ← rename_channel
│
├── 🖼 Медиатеки · 8
│   ├── 🟢 media_libraries_index_toc_read    ← read_media_library_index_toc
│   ├── 🟢 media_libraries_index_toc_refresh ← refresh_media_library_index_toc
│   ├── 🟢 media_libraries_list         ← list_media_libraries
│   ├── 🟢 media_library_get            ← get_media_library
│   ├── 🟢 media_library_register       ← register_media_library
│   ├── 🟢 media_library_update         ← update_media_library
│   ├── 🟢 media_library_delete         ← delete_media_library
│   └── 🟢 media_library_rename         ← rename_media_library
│
├── 📦 Репозитории · 8
│   ├── 🟢 repositories_index_toc_read  ← read_repository_index_toc
│   ├── 🟢 repositories_index_toc_refresh ← refresh_repository_index_toc
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
│   └── 🔴 workspace_notifications_list     ← list_workspace_notifications (имя/группа — TBD)
│
├── 🧠 Facts · glossary · reference · 12
│   ├── 🟢 workspace_fact_create          ← create_workspace_fact
│   ├── 🟢 workspace_fact_update          ← update_workspace_fact
│   ├── 🟢 workspace_facts_list           ← list_workspace_facts
│   ├── 🟢 workspace_facts_search         ← search_workspace_facts
│   ├── 🟢 glossary_term_create           ← create_glossary_term
│   ├── 🟢 glossary_term_update           ← update_glossary_term
│   ├── 🟢 glossary_terms_list            ← list_glossary_terms
│   ├── 🟢 glossary_terms_search          ← search_glossary_terms
│   ├── 🟢 reference_entry_create         ← create_reference_entry
│   ├── 🟢 reference_entry_update         ← update_reference_entry
│   ├── 🟢 reference_entries_list         ← list_reference_entries
│   └── 🟢 reference_entries_search       ← search_reference_entries
│
├── 💬 Inbox · discussion · comments · 10
│   ├── list_inbox
│   ├── triage_inbox_item
│   ├── read_discussion
│   ├── append_discussion
│   ├── 🟢 comments_list                   ← list_comments
│   ├── 🟢 comment_append                  ← append_comment
│   ├── 🟢 comment_read                    ← read_comment
│   ├── 🟢 comment_update                  ← update_comment
│   ├── 🟢 comment_delete                  ← delete_comment
│   └── 🟢 comment_reaction_toggle         ← toggle_comment_reaction
│
├── 📎 Sidecar · pads · buffer · 13
│   ├── sidecar (5)
│   │   ├── 🟢 sidecar_path_resolve         ← resolve_sidecar_path
│   │   ├── 🟢 sidecar_read                 ← read_sidecar
│   │   ├── 🟢 sidecar_create               ← create_sidecar
│   │   ├── 🟢 sidecar_write                ← write_sidecar
│   │   └── 🟢 sidecar_delete               ← delete_sidecar
│   ├── pads (4)
│   │   ├── 🟢 workspace_note_read          ← read_workspace_note
│   │   ├── 🟢 workspace_note_write         ← write_workspace_note
│   │   ├── 🟢 workspace_todo_read          ← read_workspace_todo
│   │   └── 🟢 workspace_todo_write         ← write_workspace_todo
│   └── context_buffer (4)
│       ├── 🟢 context_buffer_read            ← read_context_buffer
│       ├── 🟢 context_buffer_append          ← append_context_buffer
│       ├── 🟢 context_buffer_item_remove     ← remove_context_buffer_item
│       └── 🟢 context_buffer_clear           ← clear_context_buffer
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
├── 🔧 tool_* · 7
│   ├── 🟢 tool_web_search                 ← search_web
│   ├── 🟢 tool_web_images_search          ← search_web_images
│   ├── 🟢 tool_web_page_read              ← read_web_page
│   ├── 🟢 tool_document_text_extract      ← extract_document_text
│   ├── 🟢 tool_script_run                 ← run_script
│   ├── 🟢 tool_command_exec               ← exec_command
│   └── 🟢 tool_shell_exec                 ← exec_shell
└── 📓 Journal · 3
    ├── 🟢 journal_entry_append              ← append_journal_entry
    ├── 🟢 journal_entries_list              ← list_journal_entries
    └── 🔴 workspace_notifications_list      ← list_workspace_notifications (имя/группа — TBD)
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
├── 🔴 record_slug_generate ← generate_workspace_slug (slug для topic/content/store/… — TBD)
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
- [x] **Facts · glossary · reference:** канон в MCP + legacy — `facts-tools.js`, `glossary-tools.js`, `reference-tools.js`
- [x] **Тема:** канон в MCP + legacy — `page-tools.js`, `topics_list` в `map-tools.js`
- [x] **Контент:** канон в MCP + legacy — `content-tools.js` (`content_*`, `contents_list`; `batch_invoke` без переименования)
- [x] **Sidecar · context_buffer:** `sidecar_*`, `context_buffer_*` — `sidecar-tools.js`, `context-buffer-tools.js`
- [x] **Старт и workspace:** канон в MCP + legacy — `index.js`, `workspace-tools.js`, `agent-utils-tools.js`
- [x] **Платформа и настройки:** канон в MCP + legacy — `platform-tools.js`, `settings-tools.js` (регистрация **до** workspace); `dependencies_*` — `dependencies-tools.js`, в дереве и `index.js` **в блоке хранилища** (нужен `workspaceId`)
- [x] **Comments:** канон в MCP + legacy — `mcp-server/lib/comment-tools.js`
- [x] **Journal:** канон в MCP + legacy — `mcp-server/lib/journal-tools.js`
- [x] **tool_*:** web + extract + exec — `web-search-tools.js` (`tool_web_*`), `tool-tools.js` (legacy `search_web*`, `read_web_page`, `run_script`, `exec_*`, `extract_document_text`)
- [x] **Hub index TOC:** `*_index_toc_read` / `*_index_toc_refresh` в группах hub-tools + `page-tools` / `content-tools`; legacy `read_*_index_toc`
- [ ] Дубли в legacy: `get_ui_open_location`, `resolve_workspace_id`, `get_topic_url`
- [ ] Переименовать: `generate_record_slug`, `assign_record_awn_id`
- [ ] Док/skills: дерево без legacy; URL только `get_workspace_open_url_from_path`
- [ ] Решить: нужны ли реестры «главная / pinned focus» или хватит live + storage-summary
