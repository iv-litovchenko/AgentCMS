# Рефакторинг — часть 4

**Задача:** единая модель **контент** (не «контент страницы»); размещение — страница / канал / медиатека / **root** (workspace path) — отдельно. MCP: один набор методов + `placement` (или `contentRef`).

**✅** сделано · **❌** не сделано.

Оглавления / индексы — в конце файла (⚠️ обсудить отдельно).

### Пример MCP: страница (тема + слот + файл)

**Сейчас —** `read_content_body`

```json
// call
{
  "path": "topics/product-launch",
  "slot": "media",
  "ref": "hero.md"
}

// result (фрагмент)
{
  "file": "hero.md",
  "content": "Текст markdown без frontmatter…"
}
```

Поля `path` + `slot` + `ref` = «контент **на странице**»; имя tool говорит только про **body** (properties/schema — другие tools).

**План —** `read_content`

```json
// call
{
  "placement": {
    "kind": "page",
    "path": "topics/product-launch",
    "slot": "media",
    "ref": "hero.md"
  },
  "part": "body"
}

// result (тот же смысл; имя tool — про сущность «контент»)
{
  "placement": { "kind": "page", "path": "…", "slot": "media", "ref": "hero.md" },
  "body": "Текст markdown без frontmatter…",
  "file": "hero.md"
}
```

`part`: `body` | `properties` | `schema` | `meta` | `all` — вместо отдельных `read_content_body` / `read_content_properties` / … (детали ⚠️).  
**MCP:** `lib/config/content-placement.js` + `placement.kind`: `page` | `channel` | `media` | `root` (alias `tree`); legacy `path`+`slot` = `page`. `root` — workspace path без слота (`read_content` / `write_content`). Индексы/поиск — отдельно от placement (§ ниже, п.1 ✅).

---



## Мета


| Статус | MCP (сейчас)       | План (имя)         |
| ------ | ------------------ | ------------------ |
| ✅ MCP  | `content_exists`   | `content_exists`   |
| ✅ MCP  | `get_content_meta` | `get_content_meta` |




## Body


| Статус | MCP (сейчас)         | План (имя)      |
| ------ | -------------------- | --------------- |
| ✅ MCP  | `read_content_body`  | `read_content`  |
| ✅ MCP  | `write_content_body` | `write_content` |




## Properties


| Статус | MCP (сейчас)               | План (имя)                                      |
| ------ | -------------------------- | ----------------------------------------------- |
| ✅ MCP  | `read_content_properties`  | `read_content` (`part: properties`) или legacy  |
| ✅ MCP  | `write_content_properties` | `write_content` (`part: properties`) или legacy |
| ✅ MCP  | `read_content_property`    | `read_content_property`                         |
| ✅ MCP  | `write_content_property`   | `write_content_property`                        |




## Schema


| Статус | MCP (сейчас)           | План (имя)                                  |
| ------ | ---------------------- | ------------------------------------------- |
| ✅ MCP  | `read_content_schema`  | `read_content` (`part: schema`) или legacy  |
| ✅ MCP  | `write_content_schema` | `write_content` (`part: schema`) или legacy |




## Жизненный цикл


| Статус | MCP (сейчас)              | План (имя)                |
| ------ | ------------------------- | ------------------------- |
| ✅ MCP  | `create_content`          | `create_content`          |
| ✅ MCP  | `import_content_from_url` | `import_content_from_url` |
| ✅ MCP  | `rename_content`          | `rename_content`          |
| ✅ MCP  | `move_content`            | `move_content`            |
| ✅ MCP  | `delete_content`          | `delete_content`          |




## Слоты / контейнер


| Статус | MCP (сейчас)      | План (имя)                                                                                |
| ------ | ----------------- | ----------------------------------------------------------------------------------------- |
| ✅ MCP  | —                 | `list_slots` (page / channel / media; алиас `list_page_slots` снят)                       |
| ✅ MCP  | —                 | `list_content` (слот page/channel/media; **root** — каталог родительской папки по `path`) |


---



## Scope размещения (план)


| Контейнер             | Сейчас (отдельные tools)                                                              |
| --------------------- | ------------------------------------------------------------------------------------- |
| Страница              | `read/write/list_content` + `list_slots` (+ legacy `content_*`)                       |
| Канал                 | `read_content` / `write_content` / `list_content` (+ legacy channel tools)            |
| Медиатека             | то же с `kind: media` (+ legacy media tools)                                          |
| Root (workspace path) | `read_content` / `write_content` с `kind: root` (+ legacy `read_file` / `write_file`) |


Цель: те же **content_*** + `placement.kind` для всех контейнеров (где применимо schema/properties). **Сделано:** guard на `/api/content/schema`, section/create, `/api/storage/transfer`; legacy MCP tools по умолчанию выключены (`MCP_LEGACY_TOOLS=1` — старые имена).

---



## Индексы, оглавления, поиск — отдельно от `placement` (п.1 ✅)

Не CRUD контента (`read_content` / `write_content` / …). Здесь: **карты**, **markdown-оглавления на диске**, **каталоги hub**, **кэши** `.agent-cms/cache/indexes/`*, **поиск**. Канон для агента: `GLOBAL-DOC-MCP.md` §3.

```
⚠️ Навигация и оглавления (файлы в workspace)
├── Workspace (дерево страниц)
│   ├── get_page_map                    … runtime: manifest + папки без manifest
│   ├── get_workspace_page_index_toc        … read INDEX.md
│   └── refresh_workspace_page_index_toc    … rebuild INDEX.md ← get_page_map
├── Тема / слот (TOC контента)
│   ├── get_content_map                 … meta по всем слотам страницы (тяжелее)
│   ├── get_content_index_toc               … read index.md темы или слота
│   └── refresh_content_index_toc           … rebuild index.md темы/слота
├── WS-MAP (реестр всех index/INDEX в ws)
│   ├── get_workspace_wsmap
│   └── refresh_workspace_wsmap         … rebuild WS-MAP.md
├── Hub-каталоги (index.md в корне раздела)
│   ├── awn-databases/index.md
│   │   ├── database_frame_read_index_toc
│   │   └── database_frame_refresh_index_toc
│   ├── awn-media/index.md
│   │   ├── read_media_library_index_toc
│   │   └── refresh_media_library_index_toc
│   ├── awn-repositories/index.md
│   │   ├── read_repository_index_toc
│   │   └── refresh_repository_index_toc
│   └── awn-channels/index.md
│       ├── read_channels_index_toc
│       └── refresh_channels_index_toc
│
⚠️ Поиск (read-only, по индексам / тексту)
├── search_workspace_content            … fulltext
├── search_workspace_semantic           … semantic (hash-TF-IDF)
├── search_workspace_hybrid             … semantic + fulltext (дефолт)
├── search_workspace_batch              … пакет hybrid
├── search_workspace_links              … backlinks / outbound (отдельный граф)
├── query_workspace_storage             … SQL-like по field catalog
├── list_workspace_registry_queries     … именованные пресеты
└── run_workspace_registry_query        … выполнить пресет
│
⚠️ Offline-индексы (.agent-cms/cache/indexes/*)
├── Диагностика
│   ├── get_workspace_index_status      … слои: OCR, fulltext, semantic, storage, link
│   └── get_workspace_index_monitor     … stale / размер / здоровье
├── Rebuild по слою
│   ├── rebuild_workspace_fulltext_index
│   ├── rebuild_workspace_semantic_index
│   ├── rebuild_workspace_storage_index … field catalog (frontmatter)
│   ├── rebuild_workspace_link_index    … sqlite link graph
│   └── run_workspace_ocr_index         … OCR вложений
└── Операции
    ├── rebuild_workspace_indexes       … UI: всё сразу + WS-MAP
    └── sync_workspace_index_file       … инкремент после правки одного файла
```

**Как читать:** сверху вниз — «где лежит правда» (карта → md-оглавление → hub index), отдельно ветки **поиск** и **offline-кэш**. Рефактор `placement` сюда не относится, пока не решим единый `placement` для `get_content_index` по channel/media.

---



## Типы каналов (`awn.hub.channel` / sidebar `menu-awn-channels-list`)

Источник заготовок: `lib/config/channel-presets.js` ↔ `CHANNEL_BUILTIN_PRESETS` в `public/main.js`.  
У всех экземпляров в UI: `menu-awn-channels-item--preset`; до создания папки `awn-channels/{slug}/` — ещё `menu-awn-channels-item--pending`.

### Встроенные заготовки (есть в коде)


| Статус   | slug                | Иконка | Название            | Описание                                                                         |
| -------- | ------------------- | ------ | ------------------- | -------------------------------------------------------------------------------- |
| ✅ preset | `forum`             | 💬     | Форум               | Дискуссии и обсуждения (где люди могут…)                                         |
| ✅ preset | `blog-agent`        | 📝     | Блог                | Куда агент пишет то, что интересует; что собрал агент сегодня — по моим запросам |
| ✅ preset | `digest`            | 📰     | Дайджесты           | Сводки и подборки, которые агент собирает сюда                                   |
| ✅ preset | `youtube`           | ▶️     | YouTube             | Видео и темы для обсуждения / разбора                                            |
| ✅ preset | `telegram`          | ✈️     | Telegram            | Выгрузка тем и сообщений из Telegram                                             |
| ✅ preset | `whatsapp`          | 💬     | WhatsApp            | Входящий поток из WhatsApp                                                       |
| ✅ preset | `web`               | 🌐     | Интернет            | Страницы, ссылки и материалы из сети                                             |
| ✅ preset | `bookmarks`         | 🔖     | Закладки            | Сохранённые ссылки до triage                                                     |
| ✅ preset | `browser-downloads` | 📥     | Загрузки            | Файлы из загрузок браузера                                                       |
| ✅ preset | `notebooks`         | 📓     | Печатные тетради    | Скан/фото тетрадей, рукописные заметки                                           |
| ✅ preset | `photo-archive`     | 🖼️    | Фотоархив           | Общий фотоархив                                                                  |
| ✅ preset | `photo-phone`       | 📱     | Фотоархив (телефон) | Фото с телефона                                                                  |
| ✅ preset | `analytics`         | 📊     | Аналитика           | Метрики, отчёты, дашборды                                                        |
| ✅ preset | `real-world`        | 🌍     | Реальный мир        | Объекты и факты из офлайн-мира                                                   |
| ✅ preset | `market`            | 🛒     | Барахолка           | Объявления, покупки/продажи                                                      |
| ✅ preset | `notes`             | 📒     | Заметки             | Разрозненные заметки до разбора                                                  |
| ✅ preset | `screenshots`       | 🖥️    | Скриншоты           | Снимки экрана, ingress до triage                                                 |
| ✅ preset | `other`             | 📦     | Другое              | Не знаю куда деть — временный вход                                               |


Пользовательские каналы (созданные в workspace, не из списка выше) — отдельные строки в том же списке без `--preset` (например `slider`, `screenshots` как живые папки).

### Заготовки к добавлению (❌ в `channel-presets.js` пока нет)


| Статус | slug (предлож.)  | Иконка | Название        | Описание                                         |
| ------ | ---------------- | ------ | --------------- | ------------------------------------------------ |
| ❌      | `news`           | 📰     | Новости         | Ленты новостей, статьи, анонсы                   |
| ❌      | `notebook-white` | 📄     | Белая тетрадь   | Печатная тетрадь с нумерацией страниц            |
| ❌      | `notebook-pink`  | 🩷     | Розовый блокнот | Блокнот с нумерацией страниц                     |
| ❌      | `capabilities`   | 💡     | Возможности     | Обсуждение возможностей и идей с агентом         |
| ❌      | `mailbox`        | 📧     | Почта           | Mailbox / входящая почта                         |
| ❌      | `rss`            | 📡     | RSS             | Подписки и feed-агрегаторы                       |
| ❌      | `github`         | 🐙     | GitHub          | Issues, pull requests, уведомления репозитория   |
| ❌      | `voice`          | 🎙️    | Голос           | STT, записи встреч, голосовые заметки            |
| ❌      | `ocr`            | 🔍     | OCR             | Сканы, фото документов, распознавание текста     |
| ❌      | `clipboard`      | 📋     | Clipboard       | Буфер обмена и быстрые вставки                   |
| ❌      | `webhook`        | 🔗     | Webhook         | API, n8n и прочие автоматические входы           |
| ❌      | `cloud-inbox`    | ☁️     | Облачный inbox  | Drive, Dropbox и другие облачные папки-источники |
| ❌      | `companion`      | 🧩     | Companion       | Расширение браузера / companion-приложение       |


Примечание: ingress-канал по модели — `inbox` / `outbox` / `files` / `assets` в `awn-storage/` (`awn.hub.channel` storage-slots); пресет в сайдбаре — только **метка источника** и папка `awn-channels/{slug}/`, не отдельный «тип показа».

---



## 🗺️ Полная карта MCP (`agent-cms` v0.4.0)

Источник: `mcp-server/index.js` + `mcp-server/lib/*`. **~200 tools** (часть алиасов — см. ниже).  
**agentId** — почти везде обязателен; **без agentId**: registry workspaces, `search_web`*, `read_web_page`, `get_link_preview`, `test_mcp_connection`, `generate_workspace_slug`, `get_workspace_storage_info`.

```
🚀 Старт чата
├── list_workspaces / list_vaults          … реестр хранилищ (id, name, path)
├── get_session_context                    … topicRegistry, always-context, RULES
├── get_session_documentation              … GLOBAL-DOC-MCP, README (по вызову)
├── get_user_active_context_now            … фокус UI → готовые path/slot/ref
├── list_workspace_always_context          … always-load файлы workspace
├── list_workspace_cron                    … awn-runtime-cron
├── list_workspace_heartbeat               … awn-runtime-heartbeat
└── test_mcp_connection                    … ping CMS + версии

🏢 Registry workspace (без agentId в args; path/agentId в теле где нужно)
├── create_workspace                       … папка + manifest + запись в реестре
├── register_workspace                     … подхват существующей папки
├── discover_workspaces                    … скан диска на awn.page.ws
├── update_workspace                       … имя, статус, emoji, preview…
├── set_default_workspace                  … дефолт при старте платформы
├── set_orchestrator_workspace             … один orchestrator
├── list_workspace_groups                  … группы сайдбара
├── create_workspace_group                 … новая группа UI
├── update_workspace_group                 … rename / light|dark
├── delete_workspace_group                 … группа (ws не удаляются)
├── assign_workspace_to_group              … ws → группа
├── remove_workspace_from_group            … ws в «без группы»
└── reorder_workspace_groups               … порядок групп

⚙️ Platform · settings · deps · git
├── get_platform_info / get_platform_health … CMS / MCP метаданные
├── list_platform_docs / read_platform_doc / write_platform_doc … .md в корне репо
├── list_platform_config                   … сводка platform.yml
├── list_settings / read_setting / write_setting … scope: platform|workspace|user|integrations
├── read_dependencies / write_dependencies … package/deps workspace
├── module_git_init / status / diff / commit / pull / push / remote … git корня workspace

🧭 Навигация · карты · id
├── get_page_map                           … дерево manifest + folder без manifest
├── get_workspace_page_index_toc           … read INDEX.md
├── refresh_workspace_page_index_toc       … rebuild INDEX.md ← page map
├── get_content_map                        … meta по слотам страницы (тяжелее)
├── get_content_index_toc                  … read index.md темы/слота
├── refresh_content_index_toc              … rebuild index.md темы/слота
├── get_workspace_wsmap / refresh_workspace_wsmap … реестр всех index/INDEX
├── resolve_workspace_path                 … breadcrumbs, slot/ref, mcp hints
├── get_page_url                           … URL страницы в UI (CHPU)
├── resolve_workspace_id                   … awn-id → paths[]
└── assign_workspace_id                    … «Присвоить id» записи

🔍 Поиск workspace (read-only)
├── search_workspace_content               … fulltext (как поиск в шапке)
├── search_workspace_semantic              … hash-TF-IDF offline
├── search_workspace_hybrid                  … semantic + fulltext + where
├── search_workspace_batch                 … пакет hybrid (до 20 запросов)
├── search_workspace_links                 … backlinks / outbound / neighbors
├── query_workspace_storage                … SQL-like по field catalog
├── list_workspace_registry_queries        … именованные пресеты
└── run_workspace_registry_query           … выполнить пресет

📊 Offline-индексы (.agent-cms/cache/indexes/*)
├── get_workspace_index_status             … OCR, fulltext, semantic, storage, link
├── get_workspace_index_monitor            … stale / размер / здоровье
├── rebuild_workspace_fulltext_index
├── rebuild_workspace_semantic_index
├── rebuild_workspace_storage_index        … field catalog (frontmatter)
├── rebuild_workspace_link_index           … sqlite link graph
├── run_workspace_ocr_index                … OCR вложений → sidecar
├── rebuild_workspace_indexes              … pipeline «всё» + WS-MAP
└── sync_workspace_index_file              … инкремент одного файла

🧠 Сводка · память · Q&A
├── audit_workspace_memory                 … stale always-context, ## Current State
├── list_workspace_feed                    … activity + intake + audit summary
├── ask_workspace                          … semantic + fulltext + always → цитаты
├── search_and_get_context                 … то же для «найди в архиве»
├── create_workspace_fact / update_workspace_fact … awn-databases/contents/facts
├── list_workspace_facts / search_workspace_facts
├── create_glossary_term / update_glossary_term   … contents/glossary
├── list_glossary_terms / search_glossary_terms
├── list_journal_entries / append_journal_entry   … .agent-cms/journal/
└── list_workspace_notifications           … колокольчик CMS

📄 Страница (manifest.md)
├── page_exists / get_page_meta
├── read_page_body / write_page_body
├── read_page_properties / write_page_properties
├── read_page_property / write_page_property
├── read_page_schema / write_page_schema
├── read_page_config / write_page_config
├── read_page_env / write_page_env
├── create_page / delete_page / rename_page / move_page

📦 Слоты
└── list_slots                             … page / channel / media

📝 Контент (placement.kind: page | channel | media | root)
├── content_exists / get_content_meta
├── read_content                           … part: body | properties | schema | meta | all
├── write_content                          … то же; root: base64 upload
├── list_content                           … каталог слота или папки (root)
├── read_content_property / write_content_property
├── create_content / import_content_from_url
├── rename_content / move_content / delete_content
└── 🗄️ legacy (env): read/write_content_body|properties|schema

🏷️ Типы схем
├── list_types                             … реестр awn-types
└── get_type                               … одна схема типа

🗄️ awn-databases (только database_frame_* / database_element_*)
├── database_frame_list / get / create / delete / rename
├── database_frame_read_index_toc / refresh_index_toc   … awn-databases/index.md
├── database_frame_read_schema / write_schema
├── database_frame_read_properties / write_properties
├── database_frame_read_property / write_property
├── database_element_list / create / delete / rename
├── database_element_read_body / write_body
└── database_element_read_properties / write_properties / read_property / write_property

📡 Каналы (awn-channels/)
├── list_channels / get_channel / register_channel / update_channel
├── list_channel_items
├── upload_channel_file
├── read_channels_index_toc / refresh_channels_index_toc   … awn-channels/index.md

🖼️ Медиатеки (awn-media/)
├── list_media_libraries / get_media_library / register_media_library / update_media_library
├── list_media_library_items / upload_media_library_file
├── read_media_library_index_toc / refresh_media_library_index_toc … awn-media/index.md

📚 Репозитории (awn-repositories/)
├── list_repositories / get_repository / register_repository / update_repository
└── read_repository_index_toc / refresh_repository_index_toc … awn-repositories/index.md

📥 Inbox · обсуждение · комментарии
├── list_inbox / triage_inbox_item
├── read_discussion / append_discussion    … slot discussion/
├── read_dialogs / append_dialog           … deprecated → discussion
├── list_comments / read_comment / append_comment / update_comment / delete_comment
└── toggle_comment_reaction

📎 Sidecar (awn.annotation.sidecar)
├── resolve_sidecar_path
├── read_sidecar / write_sidecar
├── create_sidecar / delete_sidecar

📁 Файлы workspace (root / произвольный path)
├── list_root_files / read_root_file / write_root_file
├── list_system_files / read_system_file / write_system_file   … alias root
├── read_file / write_file / patch_file
├── upload_file / upload_file_from_url
├── list_folder
└── batch_invoke                           … пакет одного tool

☁️ Media cloud (локальные blobs + заглушки API)
├── list_media_cloud_providers
├── get_media_cloud_file_status / sync_media_cloud_file / repair_media_cloud_links
├── upload_media_cloud_to_provider_zzz     … stub
└── get_remote_url_zzz                     … stub

🌐 Web (часть без agentId)
├── search_web / search_web_images
├── read_web_page
├── get_link_preview                       … OpenGraph
└── extract_document_text                  … pdf/docx/… URL или path

⚡ Shell / скрипты
├── run_script                             … npm/node в sandbox CMS
├── exec_command                           … argv без shell
└── exec_shell                             … произвольная строка shell

🛠️ Утилиты
├── generate_workspace_slug                … slug из title (presets)
├── get_workspace_storage_info               … stats + git + индексы
├── get_agent_identity / get_user_identity   … awn-agent-kit
└── list_recent_activity

📤 File hub queue (Shell «в файлообменник»)
├── read_file_hub_queue
├── add_file_to_file_hub / remove_file_from_file_hub
└── clear_file_hub_queue

📓 Workspace pads (.agent-cms/)
├── read_workspace_note / write_workspace_note
└── read_workspace_todo / write_workspace_todo

🔔 notify_user                            … push в колокольчик UI

🗄️ MCP legacy (состояние на 2026-03)
├── ✅ снято с MCP: `*_index` без `_toc`, все `iblock_*`, `retain_workspace_fact` / `recall_workspace_facts`, `list_page_slots`
├── всегда (алиасы): `list_vaults`, `list/read/write_system_*`, `read_dialogs` / `append_dialog`
└── только `MCP_LEGACY_TOOLS=1`: read/write_content_{body,properties,schema}, `read_file`/`write_file`, channel/media list|read|upload_*
```



**placement (план рефакторинга):** `page` · `channel` · `media` · `root` (`tree`) — единые `read_content` / `write_content` / `list_content`; hub-индексы и поиск — ветки ⚠️ выше (отдельно от CRUD).

---

**Только если `MCP_LEGACY_TOOLS=1`** (по умолчанию выключено):

```
MCP_LEGACY_TOOLS
│
├─ content (страница / канал / медиа — по placement)
│   ├─ read_content_body      → read_content  (part=body)
│   ├─ write_content_body     → write_content (part=body)
│   ├─ read_content_properties  → part=properties
│   ├─ write_content_properties → part=properties
│   ├─ read_content_schema      → part=schema
│   └─ write_content_schema     → part=schema
│
├─ файлы workspace (не слот)
│   ├─ read_file  → read_content  (kind=root)
│   └─ write_file → write_content (kind=root)
│
├─ канал (awn-channels)
│   ├─ list_channel_items    → list_content   (kind=channel)
│   ├─ read_channel_file     → read_content
│   └─ upload_channel_file   → write_content (+ base64)
│
└─ медиатека (awn-media)
    ├─ list_media_library_items    → list_content   (kind=media)
    ├─ read_media_library_file     → read_content
    └─ upload_media_library_file   → write_content (+ base64)
```

**Вне этого флага** (агент видит всегда, пока не удалишь):

```
всегда в MCP
├─ list_vaults → list_workspaces
├─ list/read/write_system_* → list/read/write_root_*
└─ read_dialogs / append_dialog → read/append_discussion
```

---



## Остаток рефакторинга (нумерация из общего списка)

Пункты **2, 3, 4** закрыты (индекс каналов, guard, legacy MCP). **1, 5, 6, 7** — закрыты (номера **не** перенумеровывать в 1–4).


| №     | Статус | Тема                                         |
| ----- | ------ | -------------------------------------------- |
| **1** | ✅      | Индексы и поиск — без `placement`            |
| **5** | ✅      | `read_content`: `part: meta` | `all`         |
| **6** | ✅      | Канал: YAML `storage-slots` vs policy слотов |
| **7** | ✅      | Репозиторий hub — вне `placement` (не делаем) |




### 1. Индексы и поиск — отдельный блок, без `placement` — ✅

**Решение (документация):** CRUD контента — `placement` + `read_content` / `write_content` / `list_content`. Карты, `*_index_toc`, hub-каталоги, `search_workspace_*`, `rebuild_workspace_*` — **отдельные** tools (дерево § «⚠️ Индексы…» выше). Единый `placement.kind: index` **не вводим**. Search/rebuild в `read_content` **не** тащим. Зафиксировано в `GLOBAL-DOC-MCP.md` §3, `mcp-server/README.md` («Два слоя API»).




### 5. `read_content`: `part: meta` | `all` — ✅

Реализовано: `contentPartSchema` + `readContentMeta` / `readContentAll` в `content-core.js`. `get_content_meta` / `content_exists` остаются тонкими алиасами.




### 6. Канал (`awn.hub.channel`): YAML `storage-slots` vs policy слотов — ✅

Выровнено: `channel.yml` → `inbox`, `outbox`, `files`, `assets`; `files.yml` / `assets.yml` — `awn.hub.channel` в `allowed-containers`; `ensureChannelStorageDirs` создаёт все четыре; `todo-single` без channel; `GLOBAL-DOC-MCP` — слоты channel.




### 7. Репозиторий hub (`awn.hub.repository`) — ✅ решение: не в `placement`

**Продуктово закрыто:** отдельный `placement.kind: repository` **не вводим**. Repo остаётся hub-карточкой (`list_repositories`, `get_repository`, …, index toc) + файлы клона через **`kind: root`**. Если когда-нибудь у repo появятся слоты как у page — тогда новый дизайн; до этого пункт не работа.