agent-cms ( Agent MCP ) · 40
│
├── СТАРТ / КОНТЕКСТ (5)
│   ├── get_session_context              — START HERE
│   ├── get_user_active_context_now      — что открыто в UI
│   ├── list_workspace_always_context    — always + AGENTS/SKILL/GLOBAL_MCP_DOC
│   ├── list_workspace_cron              — реестр cron
│   └── list_workspace_heartbeat         — реестр heartbeat
│
├── НАВИГАЦИЯ (3)
│   ├── get_page_map                     — карта страниц
│   ├── get_content_map                  — карта контента темы
│   └── search_workspace                 — поиск
│
├── СТРАНИЦА (10)
│   ├── read_page_body / write_page_body
│   ├── read_page_properties / write_page_properties
│   ├── read_page_schema / write_page_schema
│   ├── create_page / delete_page
│   └── rename_page / move_page
│
├── СЛОТ (1)
│   └── list_page_slots                  — слоты + allowedContent
│
├── КОНТЕНТ (8)
│   ├── read_content_body / write_content_body
│   ├── read_content_properties / write_content_properties
│   ├── create_content
│   └── rename_content / move_content / delete_content
│
├── ТИПЫ (2)
│   ├── list_types                       — индекс: domain | kind | filter preset
│   └── get_type                         — merged schema по id
│
├── AWN-DATA runtime (3)
│   ├── list_data_stores / get_data_store
│   ├── create_data_store / create_data_record
│   └── read_data_store_schema           — schema store (экземпляр, не каталог)
│
├── SCHEMA страницы (не каталог типов)
│   └── read_page_schema / write_page_schema
│
├── INTAKE (4)
│   ├── list_inbox
│   ├── triage_inbox_item
│   ├── read_thread
│   └── append_thread
│
├── СИСТЕМА + FS (5)
│   ├── list_system_files
│   ├── read_file / write_file
│   ├── upload_file
│   └── list_folder
│
└── УВЕДОМЛЕНИЕ (1)
    └── notify_user
