# Рефакторинг — часть 15 (MCP Agent CMS)

**Цель:** канон имён tools, без legacy в доке; убрать дубли и переименовать утилиты.  
**Статус:** набросок (дерево + решения). **🔴** = не в коде · **🟢** = переименовано в MCP (+ legacy) · **🟡** = имя оставили (`*_exists`, `list_slots` — уже `сущность_глагол`).

### Именование `сущность_действие`

- **Список реестра** → **множественное** + `_list`: `databases_list`, `channels_list` (не `database_list` — это звучит как «список внутри одной базы»).
- **Одна запись / поля** → **единственное** + `_get|_register|_read|…`: `database_get`, `topic_body_read`.
- Старые `list_*` / `get_*` / `read_*` → legacy после миграции.

---

## 🌳 Канон MCP `user-agent-cms` (без legacy)

**Итого в дереве: 234 метода** (legacy-алиасы и `*_zzz` stub не считаются; `get_topic_url` = alias, не отдельная строка).

```
user-agent-cms
│
├── ⚙️ Платформа · platform_* · 5
│   ├── 🟢 platform_info_get                  ← get_platform_info
│   ├── 🟢 platform_health_get                ← get_platform_health
│   ├── 🟢 platform_docs_list                 ← list_platform_docs
│   ├── 🟢 platform_doc_read                  ← read_platform_doc
│   └── 🟢 platform_config_list               ← list_platform_config
│
├── 🎛 Settings · settings_* · setting_* · 3
│   ├── 🟢 settings_list                      ← list_settings
│   ├── 🟢 setting_read                       ← read_setting
│   └── 🟢 setting_write                      ← write_setting
│
├── 🚀 Старт и workspace · 20
│   ├── 🟢 workspaces_list                    ← list_workspaces (+ list_vaults legacy)
│   ├── 🟢 workspaces_scan                    ← workspaces_discover ← discover_workspaces
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
│   ├── 🟢 workspace_summary_get              ← get_workspace_storage_info ← workspace_storage_info_get
│   ├── 🟢 workspace_activity_list            ← list_recent_activity
│   ├── 🟢 workspace_feed_list                ← list_workspace_feed
│   └── 🟢 workspace_notifications_list     ← list_workspace_notifications
│
├── 🎬 Session · session_* · workspaceId · 16
│   ├── 🟢 session_context_get                ← get_session_context
│   ├── 🟢 session_agent_profile_get          ← agent_identity_get ← get_agent_identity ← session_agent_get
│   ├── 🟢 session_user_profile_get           ← user_identity_get ← get_user_identity ← session_user_get
│   ├── 🟢 session_list_always_context        ← session_always_registry_list ← get_workspace_always_context_registry
│   ├── 🟢 session_list_cron                  ← session_cron_registry_list ← get_workspace_cron_registry
│   ├── 🟢 session_list_heartbeat             ← session_heartbeat_registry_list ← get_workspace_heartbeat_registry
│   ├── 🟢 session_list_in_focus              ← session_nav_focus_list ← session_nav_focus_get
│   ├── 🟢 session_list_on_main               ← session_nav_main_list ← session_nav_main_get
│   ├── session_note_* (2)
│   │   ├── 🟢 session_note_read              ← workspace_note_read ← read_workspace_note
│   │   └── 🟢 session_note_write             ← workspace_note_write ← write_workspace_note
│   ├── session_todo_* (2)
│   │   ├── 🟢 session_todo_read              ← workspace_todo_read ← read_workspace_todo
│   │   └── 🟢 session_todo_write             ← workspace_todo_write ← write_workspace_todo
│   └── session_context_buffer_* (4)
│       ├── 🟢 session_context_buffer_read    ← session_buffer_read ← read_context_buffer
│       ├── 🟢 session_context_buffer_append  ← session_buffer_append ← append_context_buffer
│       ├── 🟢 session_context_buffer_remove  ← session_buffer_item_remove ← remove_context_buffer_item
│       └── 🟢 session_context_buffer_clear   ← session_buffer_clear ← clear_context_buffer
│
├── 📋 Registry queries · registry_* · 2
│   ├── 🟢 registry_queries_list              ← list_workspace_registry_queries ← session_registry_queries_list
│   └── 🟢 registry_query_run                 ← run_workspace_registry_query ← session_registry_query_run
│
├── 🆔 Record · record_* · workspaceId · 5
│   ├── 🟢 record_find_by_id                  ← find_by_id ← resolve_workspace_id
│   ├── 🟢 record_id_exists
│   ├── 🟢 record_id_assign                   ← assign_workspace_id
│   ├── 🟢 record_generate_slug               ← generate_workspace_slug ← record_slug_generate
│   └── 🟢 record_slug_exists
│
├── 🧭 Навигация · nav_* · 14
│   ├── 🟢 nav_map_workspace_read             ← workspace_map_read / read_workspace_map
│   ├── 🟢 nav_map_workspace_refresh          ← workspace_map_refresh / refresh_workspace_map
│   ├── 🟢 nav_index_toc_topics_read          ← topics_index_toc_read / read_topic_index_toc
│   ├── 🟢 nav_index_toc_topics_refresh       ← refresh_topic_index_toc
│   ├── 🟢 nav_index_toc_contents_read        ← contents_index_toc_read / read_content_index_toc
│   ├── 🟢 nav_index_toc_contents_refresh     ← refresh_content_index_toc
│   ├── 🟢 nav_index_toc_databases_read       ← databases_index_toc_read / read_database_frame_index_toc
│   ├── 🟢 nav_index_toc_databases_refresh    ← refresh_databases_index_toc / refresh_database_frame_index_toc
│   ├── 🟢 nav_index_toc_channels_read        ← channels_index_toc_read
│   ├── 🟢 nav_index_toc_channels_refresh     ← refresh_channels_index_toc
│   ├── 🟢 nav_index_toc_repositories_read    ← repositories_index_toc_read
│   ├── 🟢 nav_index_toc_repositories_refresh ← refresh_repository_index_toc
│   ├── 🟢 nav_index_toc_media_libraries_read ← media_libraries_index_toc_read
│   └── 🟢 nav_index_toc_media_libraries_refresh ← refresh_media_library_index_toc
│
├── 🗺 id, URL, типы · 7
│   ├── 🟡 list_types
│   ├── 🟡 get_type
│   ├── 🟡 list_slots
│   ├── 🔴 get_workspace_open_url_from_path   ← get_topic_url
│   ├── 🔴 get_workspace_url_page_preview
│   ├── 🔴 get_external_url_page_preview      ← get_link_preview
│   └── 🔴 get_link_preview                   (legacy alias)
│
├── 🧭 Темы · topics_ / topic_ · 25
│   ├── 🟢 topics_list                    ← list_topics
│   ├── 🟢 topic_get                      ← get_topic
│   ├── 🟢 topic_meta_get                 ← get_topic_meta
│   ├── 🟢 topic_exists
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
├── 📄 Контент · 16
│   ├── 🟢 contents_list                 ← list_content
│   ├── 🟢 content_read                  ← read_content
│   ├── 🟢 content_write                 ← write_content
│   ├── 🟢 content_binary_read           ← read_content_binary
│   ├── 🟢 content_binary_write          ← write_content_binary
│   ├── 🟢 content_binary_write_from_url ← write_content_binary_from_url ← import_content_from_url
│   ├── 🟢 content_exists
│   ├── 🟢 content_meta_get              ← get_content_meta
│   ├── 🟢 content_property_read         ← read_content_property
│   ├── 🟢 content_property_write        ← write_content_property
│   ├── 🟢 content_create                ← create_content
│   ├── 🟢 content_delete                ← delete_content
│   ├── 🟢 content_rename                ← rename_content
│   ├── 🟢 content_move                  ← move_content
│   ├── 🟢 content_split                 ← split_content
│   └── 🟢 content_merge                 ← merge_content
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
├── 🔍 Поиск и индексы · 28
│   ├── 🟢 search_content                   ← search_workspace_content
│   ├── 🟢 search_semantic                  ← search_workspace_semantic
│   ├── 🟢 search_hybrid                    ← search_workspace_hybrid
│   ├── 🟢 search_batch                     ← search_workspace_batch (denied in batch_invoke)
│   ├── 🟢 search_links                     ← search_workspace_links
│   ├── 🔴 search_and_get_context
│   ├── 🔴 ask_workspace
│   ├── 🟡 index_status_get                 ← get_workspace_index_status
│   ├── 🟡 index_monitor_get                ← get_workspace_index_monitor
│   ├── 🟡 index_storage_query              ← query_workspace_storage
│   ├── 🟡 indexes_rebuild                  ← index_rebuild ← rebuild_workspace_indexes
│   ├── 🟡 index_ocr_run                    ← run_workspace_ocr_index
│   ├── 🟡 index_fulltext_rebuild           ← rebuild_workspace_fulltext_index
│   ├── 🟡 index_semantic_rebuild           ← rebuild_workspace_semantic_index
│   ├── 🟡 index_storage_rebuild            ← rebuild_workspace_storage_index
│   ├── 🟡 index_link_rebuild               ← rebuild_workspace_link_index
│   ├── 🟡 index_entity_rebuild             ← rebuild_workspace_entity_index
│   ├── 🟡 index_entity_query               ← entity_query ← query_workspace_entities
│   ├── 🟡 index_entity_catalog_list        ← entity_catalog_list ← list_workspace_entity_catalog
│   ├── 🟡 index_entity_search_explain      ← entity_search_explain ← explain_workspace_entity_search
│   ├── 🟡 index_file_sync                  ← sync_workspace_index_file
│   ├── 🟢 entity_registry_get              ← get_workspace_entity_registry
│   ├── 🟢 entity_registry_put              ← put_workspace_entity_registry
│   ├── 🟢 entity_type_upsert               ← upsert_workspace_entity_type
│   ├── 🟢 entity_alias_merge               ← merge_workspace_entity_alias
│   ├── 🟢 entity_reject                    ← reject_workspace_entity
│   ├── 🟢 entity_seed                      ← seed_workspace_entity
│   └── 🟢 workspace_memory_audit           ← audit_workspace_memory
│
├── 🧠 Facts · glossary · reference · 13
│   ├── 🧠 fact_* · workspaceId · 4
│   ├── 🟢 fact_create                    ← workspace_fact_create ← create_workspace_fact
│   ├── 🟢 fact_update                    ← workspace_fact_update ← update_workspace_fact
│   ├── 🟢 facts_list                     ← workspace_facts_list ← list_workspace_facts
│   ├── 🟢 facts_search                   ← workspace_facts_search ← search_workspace_facts
│   ├── 🟢 glossary_term_create           ← create_glossary_term
│   ├── 🟢 glossary_term_update           ← update_glossary_term
│   ├── 🟢 glossary_terms_list            ← list_glossary_terms
│   ├── 🟢 glossary_terms_search          ← search_glossary_terms
│   ├── 🟢 reference_entry_create         ← create_reference_entry
│   ├── 🟢 reference_entry_update         ← update_reference_entry
│   ├── 🟢 reference_entries_list         ← list_reference_entries
│   └── 🟢 reference_entries_search       ← search_reference_entries
│
├── 📝 Annotations · annotation_* · domain annotations · 11
│   ├── annotation_comment · awn.annotation.comment · slot comments/ (6)
│   │   ├── 🟢 annotation_comments_list         ← comments_list ← list_comments
│   │   ├── 🟢 annotation_comment_append        ← comment_append ← append_comment
│   │   ├── 🟢 annotation_comment_read          ← comment_read ← read_comment
│   │   ├── 🟢 annotation_comment_update        ← comment_update ← update_comment
│   │   ├── 🟢 annotation_comment_delete        ← comment_delete ← delete_comment
│   │   └── 🟢 annotation_comment_reaction_toggle ← comment_reaction_toggle ← toggle_comment_reaction
│   └── annotation_sidecar · awn.annotation.sidecar · *.sidecar.md (5)
│       ├── 🟢 annotation_sidecar_path_resolve  ← sidecar_path_resolve ← resolve_sidecar_path
│       ├── 🟢 annotation_sidecar_read          ← sidecar_read ← read_sidecar
│       ├── 🟢 annotation_sidecar_create        ← sidecar_create ← create_sidecar
│       ├── 🟢 annotation_sidecar_update        ← annotation_sidecar_write ← sidecar_write ← write_sidecar
│       └── 🟢 annotation_sidecar_delete        ← sidecar_delete ← delete_sidecar
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
├── 🔧 tool_* · 8
│   ├── 🟢 tool_mcp_ping                   ← mcp_connection_test ← test_mcp_connection
│   ├── 🟢 tool_web_search                 ← search_web
│   ├── 🟢 tool_web_images_search          ← search_web_images
│   ├── 🟢 tool_web_page_read              ← read_web_page
│   ├── 🟢 tool_document_text_extract      ← extract_document_text
│   ├── 🟢 tool_script_run                 ← run_script
│   ├── 🟢 tool_command_exec               ← exec_command
│   └── 🟢 tool_shell_exec                 ← exec_shell
│
├── 💬 Inbox · discussion · 4
│   ├── 🔴 list_inbox
│   ├── 🔴 triage_inbox_item
│   ├── 🔴 read_discussion
│   └── 🔴 append_discussion
│
├── 🔴 TBD · канон / группа не зафиксированы · 6
│   ├── 🔴 batch_invoke
│   ├── 🔴 resolve_workspace_path
│   ├── 🔴 notify_user
│   ├── 🔴 session_ui_focus_get             ← get_ui_focus ← get_user_active_context_now
│   ├── 🔴 get_ui_open_location             ← legacy session_ui_focus_get (тот же API)
│   └── 🔴 content_binary_url_get           ← get_content_binary_url
│
└── 📓 Journal · 2
    ├── 🟢 journal_entry_append              ← append_journal_entry
    └── 🟢 journal_entries_list              ← list_journal_entries
```

Stub: `module_media_cloud_upload`, `module_media_cloud_url`, `module_file_hub_inbound_*_zzz`.

---

## 🧭 Реестры runtime

```
Сейчас
├── session_list_always_context — always-context
├── session_list_cron — cron
├── session_list_heartbeat — heartbeat
├── session_list_in_focus — awn-focus
└── session_list_on_main — awn-main

Фокус и главная
├── get_ui_focus — live «где человек в UI» (не реестр)
├── workspace_summary_get — сводка sidebar / главной / index
└── Новые *_registry — только если появится статический конфиг (pinned home);
    иначе get_session_context + get_ui_focus
```

---

## 👁 UI · id · URL · утилиты

```
UI
├── get_ui_focus — фокус CMS: page / slot / content + hints
└── get_ui_open_location — тот же API, акцент на URL → убрать из канона, оставить get_ui_focus

id / path / slug / batch / inbox — см. блок 🔴 TBD в дереве канона

Прочее
├── workspace_activity_list — лента событий workspace (since / limit); 🟢
├── workspace_notifications_list — колокольчик / journal notify (since / limit); 🟢
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
- [x] **Контент:** канон в MCP + legacy — `content-tools.js` (`content_*`, `contents_list`)
- [ ] **🔴 TBD:** `batch_invoke`, id/path/slug, `notify_user`, inbox/discussion — имена и группы
- [x] **Annotations:** `annotation_comment_*`, `annotation_sidecar_*` — `comment-tools.js`, `sidecar-tools.js`, `annotation-tools.js`
- [x] **Session · pads · buffer:** `session_note_*`, `session_todo_*`, `session_context_buffer_*` — `workspace-pad-tools.js`, `context-buffer-tools.js` (регистрация в `session-tools.js`)
- [x] **Старт и workspace:** канон в MCP + legacy — `index.js`, `workspace-tools.js`, `agent-utils-tools.js`
- [x] **Платформа:** `platform_*` — `platform-tools.js` (регистрация **до** workspace)
- [x] **Settings:** `settings_list`, `setting_*` — `settings-tools.js` (регистрация **до** workspace)
- [x] **Workspace deps:** `workspace_dependencies_*` — `dependencies-tools.js`, в дереве **Старт и workspace** (нужен `workspaceId`)
- [x] **Journal:** канон в MCP + legacy — `mcp-server/lib/journal-tools.js`
- [x] **tool_*:** web + extract + exec — `web-search-tools.js` (`tool_web_*`), `tool-tools.js` (legacy `search_web*`, `read_web_page`, `run_script`, `exec_*`, `extract_document_text`)
- [x] **Навигация `nav_*`:** `nav-tools.js` — `nav_map_workspace_*`, `nav_index_toc_{hub}_*`; legacy `*_index_toc_*`, `read_*_index_toc`, `read_workspace_map`
- [ ] Дубли в legacy: `get_ui_open_location`, `resolve_workspace_id`, `get_topic_url`
- [ ] Переименовать: `generate_record_slug`, `assign_record_awn_id`
- [ ] Док/skills: дерево без legacy; URL только `get_workspace_open_url_from_path`
- [ ] Решить: нужны ли реестры «главная / pinned focus» или хватит live + storage-summary
