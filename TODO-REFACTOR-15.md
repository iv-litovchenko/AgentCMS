# Рефакторинг — часть 15 (MCP Agent CMS)

**Цель:** канон имён tools, без legacy в доке; убрать дубли и переименовать утилиты.  
**Статус:** дерево канона — источник правды. **🟢** = канон в MCP (+ legacy) · **🟡** = канон частично / имя на проверке · **🔴** = не зафиксировано или не в коде.

### Именование `сущность_действие`

- **Список реестра** → **множественное** + `_list`: `databases_list`, `channels_list` (не `database_list` — это звучит как «список внутри одной базы»).
- **Одна запись / поля** → **единственное** + `_get|_register|_read|…`: `database_get`, `topic_body_read`.
- Старые `list_*` / `get_*` / `read_*` → legacy после миграции.
- **Слои индекса `index_N_*`:** **`_search_query`** — поиск (hits); **`_query`** без `search` — structured (storage); **`index_{N}_*_rebuild` / `index_1_ocr_run`** — слои 1–6. **Без номера:** `index_status_get`, `index_monitor_get`, `index_rebuild_all`, `index_search_query_batch`. **Запись:** `record_index_sync` — индексы одного файла после save.
- **Слой 6 (entity, эксперимент):** в дереве только **`index_6_entity_*_zzz`** (🟡); рабочие **`index_6_entity_*`** без `_zzz` — MCP + legacy, не в счётчике.

---

## 🌳 Канон MCP `user-agent-cms` (без legacy)

**Итого в дереве: 221 метода** (legacy-алиасы и `*_zzz` stub не считаются).

```
user-agent-cms
│
├── ⚙️ Платформа (Platform) · 7
│   ├── 🟢 platform_info_get
│   ├── 🟢 platform_health_get
│   ├── 🟢 platform_docs_list
│   ├── 🟢 platform_doc_read
│   ├── 🟢 platform_config_list
│   ├── 🟢 platform_types_list
│   └── 🟢 platform_type_get
│
├── 🎛 Настройки (Settings) · 3
│   ├── 🟢 settings_list
│   ├── 🟢 setting_read
│   └── 🟢 setting_write
│
├── 🚀 Старт и workspace (Start & workspace) · 20
│   ├── 🟢 workspaces_list
│   ├── 🟢 workspaces_scan
│   ├── 🟢 workspace_create
│   ├── 🟢 workspace_register
│   ├── 🟢 workspace_update
│   ├── 🟢 workspace_default_set
│   ├── 🟢 workspace_orchestrator_set
│   ├── 🟢 workspace_groups_list
│   ├── 🟢 workspace_group_create
│   ├── 🟢 workspace_group_update
│   ├── 🟢 workspace_group_delete
│   ├── 🟢 workspace_group_assign
│   ├── 🟢 workspace_group_unassign
│   ├── 🟢 workspace_groups_reorder
│   ├── 🟢 workspace_dependencies_read
│   ├── 🟢 workspace_dependencies_write
│   ├── 🟢 workspace_summary_get
│   ├── 🟢 workspace_activity_list
│   ├── 🟢 workspace_feed_list
│   └── 🟢 workspace_memory_audit
│
├── 🎬 Сессия (Session) · 17
│   ├── 🟢 session_context_get
│   ├── 🟢 session_context_get_user_open_url_location_in_ui
│   ├── 🟢 session_agent_profile_get
│   ├── 🟢 session_user_profile_get
│   ├── 🟢 session_list_always_context
│   ├── 🟢 session_list_cron
│   ├── 🟢 session_list_heartbeat
│   ├── 🟢 session_list_in_focus
│   ├── 🟢 session_list_on_main
│   ├── Заметка (Note) · 2
│   │   ├── 🟢 session_note_read
│   │   └── 🟢 session_note_write
│   ├── Todo (Todo) · 2
│   │   ├── 🟢 session_todo_read
│   │   └── 🟢 session_todo_write
│   └── Буфер контекста (Context buffer) · 4
│       ├── 🟢 session_context_buffer_read
│       ├── 🟢 session_context_buffer_append
│       ├── 🟢 session_context_buffer_remove
│       └── 🟢 session_context_buffer_clear
│
├── 📋 Запросы реестра (Registry queries) · 2
│   ├── 🟢 registry_queries_list
│   └── 🟢 registry_query_run
│
├── 🧭 Навигация (Navigation) · 14
│   ├── 🟢 nav_map_workspace_read
│   ├── 🟢 nav_map_workspace_refresh
│   ├── 🟢 nav_index_toc_topics_read
│   ├── 🟢 nav_index_toc_topics_refresh
│   ├── 🟢 nav_index_toc_contents_read
│   ├── 🟢 nav_index_toc_contents_refresh
│   ├── 🟢 nav_index_toc_databases_read
│   ├── 🟢 nav_index_toc_databases_refresh
│   ├── 🟢 nav_index_toc_channels_read
│   ├── 🟢 nav_index_toc_channels_refresh
│   ├── 🟢 nav_index_toc_repositories_read
│   ├── 🟢 nav_index_toc_repositories_refresh
│   ├── 🟢 nav_index_toc_media_libraries_read
│   └── 🟢 nav_index_toc_media_libraries_refresh
│
├── 🗺 ID и URL (ID & URL) · 4
│   ├── 🔴 get_record_url_from_path              ← get_workspace_open_url_from_path ← get_topic_url
│   ├── 🔴 get_workspace_page_preview_from_path  ← get_workspace_url_page_preview
│   ├── 🔴 get_external_page_preview_from_url    ← get_external_url_page_preview ← get_link_preview
│   └── 🔴 get_record_binary_url_from_path       ← content_binary_url_get ← get_content_binary_url
│
├── 📚 Темы (Topics) · 23
│   ├── 🟢 topics_list
│   ├── 🟢 topic_get
│   ├── 🟢 topic_meta_get
│   ├── 🟢 topic_exists
│   ├── 🟢 topic_slots_template_get
│   ├── 🟢 topic_slots_template_set
│   ├── 🟢 topic_body_read
│   ├── 🟢 topic_body_write
│   ├── 🟢 topic_properties_read
│   ├── 🟢 topic_properties_write
│   ├── 🟢 topic_property_read
│   ├── 🟢 topic_property_write
│   ├── 🟢 topic_schema_read
│   ├── 🟢 topic_schema_write
│   ├── 🟢 topic_config_read
│   ├── 🟢 topic_config_write
│   ├── 🟢 topic_env_read
│   ├── 🟢 topic_env_write
│   ├── 🟢 topic_create
│   ├── 🟢 topic_update
│   ├── 🟢 topic_delete
│   ├── 🟢 topic_rename
│   └── 🟢 topic_move
│
├── 📄 Контент (Content) · 17
│   ├── 🟢 contents_list
│   ├── 🟢 content_read
│   ├── 🟢 content_write
│   ├── 🟢 content_binary_read
│   ├── 🟢 content_binary_write
│   ├── 🟢 content_binary_write_from_url
│   ├── 🟢 content_exists
│   ├── 🟢 content_meta_get
│   ├── 🟢 content_property_read
│   ├── 🟢 content_property_write
│   ├── 🟢 content_create
│   ├── 🟢 content_delete
│   ├── 🟢 content_rename
│   ├── 🟢 content_move
│   ├── 🟢 content_split
│   ├── 🟢 content_merge
│   └── 🟢 contents_slots_list
│
├── 🗃 Базы (Databases) · 12
│   ├── 🟢 databases_list
│   ├── 🟢 database_get
│   ├── 🟢 database_register
│   ├── 🟢 database_update
│   ├── 🟢 database_delete
│   ├── 🟢 database_rename
│   ├── 🟢 database_schema_read
│   ├── 🟢 database_schema_write
│   ├── 🟢 database_properties_read
│   ├── 🟢 database_properties_write
│   ├── 🟢 database_property_read
│   └── 🟢 database_property_write
│
├── 📡 Каналы (Channels) · 6
│   ├── 🟢 channels_list
│   ├── 🟢 channel_get
│   ├── 🟢 channel_register
│   ├── 🟢 channel_update
│   ├── 🟢 channel_delete
│   └── 🟢 channel_rename
│
├── 🖼 Медиатеки (Media libraries) · 6
│   ├── 🟢 media_libraries_list
│   ├── 🟢 media_library_get
│   ├── 🟢 media_library_register
│   ├── 🟢 media_library_update
│   ├── 🟢 media_library_delete
│   └── 🟢 media_library_rename
│
├── 📦 Репозитории (Repositories) · 6
│   ├── 🟢 repositories_list
│   ├── 🟢 repository_get
│   ├── 🟢 repository_register
│   ├── 🟢 repository_update
│   ├── 🟢 repository_delete
│   └── 🟢 repository_rename
│
├── 🔍 Поиск и индексы (Search & indexes) · 15
│   ├── 0. Запрос (Query) · 1
│   │   └── 🟢 query_workspace_ask
│   ├── 1. OCR (OCR) · 1
│   │   └── 🟡 index_1_ocr_run_zzz
│   ├── 2. Слова (Fulltext) · 2
│   │   ├── 🟢 index_2_fulltext_search_query
│   │   └── 🟢 index_2_fulltext_rebuild
│   ├── 3. Смысл (Semantic) · 3
│   │   ├── 🟢 index_3_semantic_search_query
│   │   ├── 🟢 index_3_hybrid_search_query
│   │   └── 🟢 index_3_semantic_rebuild
│   ├── 4. Поля (Storage) · 2
│   │   ├── 🟢 index_4_storage_query
│   │   └── 🟢 index_4_storage_rebuild
│   ├── 5. Связи (Links) · 2
│   │   ├── 🟢 index_5_link_search_query
│   │   └── 🟢 index_5_link_rebuild
│   ├── 6. Сущности (Entities) · 10
│   │   ├── 🟡 index_6_entity_query_zzz
│   │   ├── 🟡 index_6_entity_catalog_list_zzz
│   │   ├── 🟡 index_6_entity_query_explain_zzz
│   │   ├── 🟡 index_6_entity_rebuild_zzz
│   │   ├── 🟡 index_6_entity_registry_get_zzz
│   │   ├── 🟡 index_6_entity_registry_put_zzz
│   │   ├── 🟡 index_6_entity_type_upsert_zzz
│   │   ├── 🟡 index_6_entity_alias_merge_zzz
│   │   ├── 🟡 index_6_entity_reject_zzz
│   │   └── 🟡 index_6_entity_seed_zzz
│   ├── 7. ID (Record) · 0
│   ├── Мониторинг (Monitoring) · 2
│   │   ├── 🟢 index_status_get
│   │   └── 🟢 index_monitor_get
│   └── Операции (Ops) · 2
│       ├── 🟢 index_rebuild_all
│       └── 🟢 index_search_query_batch
│
├── 🆔 Запись (Record) · 7
│   ├── 🔴 record_find_by_id
│   ├── 🔴 record_index_sync
│   ├── 🟢 record_id_exists
│   ├── 🟢 record_id_assign
│   ├── 🟢 record_generate_slug
│   ├── 🟢 record_slug_exists
│   └── 🟢 record_path_resolve
│
├── 🧠 Факты, глоссарий, справочник (Facts, glossary & reference) · 12
│   ├── Факты (Facts) · 4
│   │   ├── 🟢 fact_create
│   │   ├── 🟢 fact_update
│   │   ├── 🟢 facts_list
│   │   └── 🟢 facts_search
│   ├── Глоссарий (Glossary) · 4
│   │   ├── 🟢 glossary_term_create
│   │   ├── 🟢 glossary_term_update
│   │   ├── 🟢 glossary_terms_list
│   │   └── 🟢 glossary_terms_search
│   └── Справочник (Reference) · 4
│       ├── 🟢 reference_entry_create
│       ├── 🟢 reference_entry_update
│       ├── 🟢 reference_entries_list
│       └── 🟢 reference_entries_search
│
├── 📝 Аннотации (Annotations) · 11
│   ├── Комментарии (Comments) · 6
│   │   ├── 🟢 annotation_comments_list
│   │   ├── 🟢 annotation_comment_append
│   │   ├── 🟢 annotation_comment_read
│   │   ├── 🟢 annotation_comment_update
│   │   ├── 🟢 annotation_comment_delete
│   │   └── 🟢 annotation_comment_reaction_toggle
│   └── Сайдкар (Sidecar) · 5
│       ├── 🟢 annotation_sidecar_path_resolve
│       ├── 🟢 annotation_sidecar_read
│       ├── 🟢 annotation_sidecar_create
│       ├── 🟢 annotation_sidecar_update
│       └── 🟢 annotation_sidecar_delete
│
├── 🧰 Модули (Modules) · 23
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
├── 🛠 Утилиты (Utilities) · 8
│   ├── 🟢 utility_mcp_ping
│   ├── 🟢 utility_web_search
│   ├── 🟢 utility_web_images_search
│   ├── 🟢 utility_web_page_read
│   ├── 🟢 utility_document_text_extract
│   ├── 🟢 utility_script_run
│   ├── 🟢 utility_command_exec
│   └── 🟢 utility_shell_exec
│
├── 📥 Входящие (Inbox) · 2
│   ├── 🟢 inbox_items_list
│   └── 🟢 inbox_item_triage
│
├── 💬 Обсуждение (Discussion) · 2
│   ├── 🟢 discussion_read
│   └── 🟢 discussion_append
│
├── 📓 Журнал (Journal) · 2
│   ├── 🟢 journal_entry_append
│   └── 🟢 journal_entries_list
│
├── 🔔 Уведомления (Notifications) · 2
│   ├── 🟢 user_notifications_list
│   └── 🟢 user_notification_send
│
└── ⚡ Специальные (Special) · 1
    └── 🟢 batch_tools_invoke
```

Stub в MCP (не в счётчике): `module_file_hub_inbound_*_zzz`, `index_1_ocr_run_zzz`, `index_6_entity_*_zzz` (🟡 в дереве; рабочие без `_zzz` + legacy).

---

## Осталось (не 🟢 в дереве)
- **Доки:** `GLOBAL-SKILL-*`, `docs/mcp-0.0.2.js` — только канон, без дублирующих секций
