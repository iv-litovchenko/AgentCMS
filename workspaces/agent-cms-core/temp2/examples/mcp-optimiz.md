agent-cms ( Agent MCP ) · 71
│
├── СТАРТ / КОНТЕКСТ (5)
│   ├── get_session_context              — START HERE
│   ├── get_user_active_context_now      — что открыто в UI
│   ├── list_workspace_always_context    — always + AGENTS/SKILL/GLOBAL_MCP_DOC
│   ├── list_workspace_cron              — реестр cron
│   └── list_workspace_heartbeat         — реестр heartbeat
│
├── НАВИГАЦИЯ (8)
│   ├── get_page_map                     — карта workspace (+ kind:folder без manifest)
│   ├── get_workspace_page_index         — оглавление страниц (INDEX.md)
│   ├── refresh_workspace_page_index     — обновить INDEX.md в корне workspace
│   ├── get_content_index                — оглавление темы/слота (path, type, title, description)
│   ├── refresh_content_index            — обновить index.md на диск
│   ├── get_content_map                  — карта контента темы (meta + properties)
│   ├── resolve_workspace_path           — path → breadcrumbs + topic/area/ws + slot/ref
│   ├── search_workspace_content         — полнотекстовый поиск (paths + body); pathPrefix
│   └── search_workspace_semantic        — semantic search (offline); pathPrefix
│
├── СТРАНИЦА (19)
│   ├── read_page_body / write_page_body
│   ├── read_page_properties / write_page_properties
│   ├── read_page_property / write_page_property   — одно свойство manifest
│   ├── read_page_schema / write_page_schema
│   ├── read_page_config / write_page_config       — config.yml (awn_settings, awn_ui)
│   ├── page_exists / get_page_meta
│   ├── read_page_env / write_page_env
│   ├── create_page / delete_page
│   └── rename_page / move_page
│
├── СЛОТ (1)
│   └── list_page_slots                  — слоты + allowedContent
│
├── КОНТЕНТ (13)
│   ├── content_exists / get_content_meta
│   ├── read_content_body / write_content_body
│   ├── read_content_properties / write_content_properties
│   ├── read_content_property / write_content_property — одно свойство .md
│   ├── create_content
│   ├── import_content_from_url          — скачать URL → slot (media/, repository/, …)
│   └── rename_content / move_content / delete_content
│
├── ТИПЫ (2)
│   ├── list_types                       — индекс: domain | kind | filter preset
│   └── get_type                         — merged schema по id
│
├── AWN-DATA / инфоблоки (13)
│   ├── list_data_stores / get_data_store
│   ├── create_data_store / create_data_record
│   ├── read_data_store_schema
│   ├── read_store_properties / write_store_properties — manifest инфоблока (как page)
│   ├── read_store_property / write_store_property
│   ├── read_record_properties / write_record_properties — элемент {id}.md
│   └── read_record_property / write_record_property
│
├── SCHEMA страницы (не каталог типов)
│   └── read_page_schema / write_page_schema
│
├── INTAKE (4)
│   ├── list_inbox
│   ├── triage_inbox_item
│   ├── read_dialogs
│   └── append_dialog
│
├── СИСТЕМА + FS (6)
│   ├── list_system_files
│   ├── read_file / write_file
│   ├── upload_file / upload_file_from_url — base64 или http(s) URL → path
│   └── list_folder
│
├── ВЫПОЛНЕНИЕ (3)
│   ├── run_script                       — .py / .js / .sh из workspace
│   ├── exec_command                     — command + args (без shell)
│   └── exec_shell                       — произвольная shell-строка
│
└── УВЕДОМЛЕНИЕ (1)
    └── notify_user
