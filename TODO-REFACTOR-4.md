# Рефакторинг — часть 4

**Задача:** единая модель **контент** (не «контент страницы»); размещение — страница / канал / медиатека / **root** (workspace path) — отдельно. MCP: один набор методов + `placement` (или `contentRef`).

**✅** сделано · **❌** не сделано.

## Scope размещения (план)


| Контейнер             | Сейчас (отдельные tools)                                                              |
| --------------------- | ------------------------------------------------------------------------------------- |
| Страница              | `read/write/list_content` + `list_slots` (+ legacy `content_*`)                       |
| Канал                 | `read_content` / `write_content` / `list_content` (+ legacy channel tools)            |
| Медиатека             | то же с `kind: media` (+ legacy media tools)                                          |
| Root (workspace path) | `read_content` / `write_content` с `kind: root` (+ legacy `read_file` / `write_file`) |


Цель: те же **content_*** + `placement.kind` для всех контейнеров (где применимо schema/properties). **Сделано:** guard на `/api/content/schema`, section/create, `/api/storage/transfer`; legacy MCP tools по умолчанию выключены (`MCP_LEGACY_TOOLS=1` — старые имена).

---




## Типы каналов (`awn.hub.channel` / sidebar `menu-awn-channels-list`)

Источник заготовок: `lib/config/channel-presets.js` ↔ `CHANNEL_BUILTIN_PRESETS` в `public/main.js`.  
У всех экземпляров в UI: `menu-awn-channels-item--preset`; до создания папки `awn-channels/{slug}/` — ещё `menu-awn-channels-item--pending`.

### Каталог заготовок каналов (краткое дерево)

**Синхронизация:** **✅** → `lib/config/channel-presets.js` ↔ `CHANNEL_BUILTIN_PRESETS` (полный `hintTitle` в коде; в дереве после `·` — кратко). **❌** — только здесь, до переноса в код. Сайдбар: `--preset`; кастом без пресета (напр. `slider`) — вне дерева.

**Ingress:** `awn-channels/0-{slug}/` (legacy `telegram/` → read-alias) + `awn-storage/inbox|outbox|files|assets`. Пресет = метка источника/режима, не отдельная витрина.

```
Заготовки каналов (sidebar menu-awn-channels-list)
├── Агент
│   └── ✅ 💡 capabilities — поиск фишек для ИИ (скиллы, MCP…)
├── Режимы контента и свободное общение
│   ├── ✅ 💬 forum — Форум · дискуссии и идеи
│   ├── ✅ 📝 blog — Блог · посты по запросам, расписание
│   └── ✅ 📰 digest — Дайджесты · сводки агентом
├── Мессенджеры и видео
│   ├── ✅ ▶️ youtube — YouTube
│   ├── ✅ ✈️ telegram — Telegram · ingress из Telegram
│   ├── ✅ 💬 whatsapp — WhatsApp
│   └── ✅ 📷 instagram — Instagram
├── Веб, ссылки, файлы
│   ├── ✅ 🌐 web — Интернет
│   ├── ✅ 🔖 bookmarks — Закладки · до triage
│   ├── ✅ 📥 downloads — Загрузки браузера
│   ├── ✅ 📡 rss — RSS / ленты
│   └── ❌ 🧩 companion — расширение / companion-app
├── Почта и автоматизация
│   ├── ✅ 📧 mailbox — входящая почта
│   ├── ✅ 🔗 webhook — API, n8n
│   └── ✅ ☁️ cloud-inbox — Drive, Dropbox…
├── Медиа и оцифровка
│   ├── ✅ 🖥️ screenshots — Скриншоты
│   ├── ✅ 🖼️ photo-archive — Фотоархив
│   ├── ✅ 📱 photo-phone — Фото (телефон)
│   ├── ✅ 📓 notebooks — Печатные тетради и рукописи
│   ├── ❌ 📄 notebook-white — белая тетрадь (нумерация)
│   ├── ❌ 🩷 notebook-pink — розовый блокнот
│   ├── ✅ 🔍 ocr — сканы, распознавание
│   ├── ✅ 🎙️ voice — STT, записи
│   └── ✅ 📋 clipboard — буфер обмена
├── Новости и контекст
│   ├── ✅ 📰 news — ленты, статьи
│   ├── ✅ 📊 analytics — Аналитика
│   └── ✅ 🌍 real-world — Реальный мир
├── Публикации и рынок
│   ├── ✅ 📢 announcements — Объявления
│   └── ✅ 🛒 market — Барахолка
├── Разработка
│   ├── ✅ 🐙 github — GitHub · issues, PR, Actions
│   ├── ✅ 🦊 gitlab — GitLab · MR, pipelines
│   ├── ✅ 🪣 bitbucket — Bitbucket
│   ├── ✅ 🍵 gitea — Gitea / Forgejo · self-hosted Git
│   ├── ✅ 📋 jira — Jira · задачи, спринты
│   └── ✅ 🐛 sentry — Sentry · ошибки и алерты
└── Черновики и прочее
    ├── ✅ 📒 notes — Заметки · до разбора
    └── ✅ 📦 other — Другое · временный вход
```

**Порядок в коде (✅):** как в `channel-presets.js` (не как в дереве); при ❌→✅ — выровнять порядок в JS с продуктом.

**Пока достаточно:** расширять каталог только при отдельном коннекторе или triage; редкое → `other` / `web` / `rss` / `mailbox`. Ниже — памятка «что ещё бывает», не план на сейчас.

```
Возможные пробелы (❌ = без пресета; не в коде)
├── 💬 Discord · Slack/Teams · Matrix/Signal · VK/X/LinkedIn/TikTok/Reddit
├── 🧩 companion · watch-folder (Inbox на диске)
├── 📓 Notion · Obsidian · Keep · Readwise
├── 🎙️ Meet/Zoom/Teams — транскрипты (рядом с voice)
├── 📧 newsletters · support-тикеты (рядом с mailbox)
├── 🎨 Figma · Miro
├── 📰 Substack · Patreon (частично rss)
├── 🤖 export LLM/IDE · cron→ingress (рядом digest/webhook/capabilities)
├── 🛒 wishlist · отзывы в сторах
└── 🌍 часы · QR/NFC (рядом real-world / photo-phone)
```

---

## 🌳 Дерево hub workspace (REFACTOR-7 + REFACTOR-3)

**Один корень тем:** **`awn-topics/`** (legacy **`awn-container/`**, **`awn-shared/`**, **`awn-agent-kit/`** → read-alias в `manifest-paths.js`).

**Platform slug:** префикс **`0-`** на каждом уровне preset/store (не путать с id workspace `agent-cms-test`).

**Типы hub-тем (`awn.hub.topic.*`):**

| Путь (пример) | `awn-type` | MCP `placement.kind` |
| ------------- | ---------- | -------------------- |
| `manifest.md` (корень ws) | `awn.hub.topic.ws` | — |
| `awn-topics/manifest.md` | `awn.hub.topic.area` | — (корень topic-hub) |
| `awn-topics/0-agent-kit/manifest.md` | **`awn.hub.topic.section`** | — (секция kit; UI: `serviceTree`) |
| `awn-topics/0-shared/manifest.md` | **`awn.hub.topic.section`** | — (секция shared; UI: `sharedTree`) |
| `awn-topics/finansy/manifest.md` | `awn.hub.topic.area` | `topic` |
| `awn-topics/…/tema/manifest.md` | `awn.hub.topic` | `topic` + `slot` |

```
workspace/                              … awn.hub.topic.ws
├── awn-topics/                         … topic-hub (legacy awn-container/)
│   ├── manifest.md                     … area-корень hub
│   ├── 0-agent-kit/                    … section (legacy agent-kit/, awn-agent-kit/)
│   │   ├── manifest.md                 … awn.hub.topic.section
│   │   ├── 0-agent/ 0-user/ 0-devices/ … preset topics (awn.hub.topic)
│   │   └── 0-taxonomies/               … локальные CSV workspace
│   ├── 0-shared/                       … section (legacy shared/, awn-shared/)
│   │   ├── manifest.md                 … awn.hub.topic.section
│   │   └── 0-inbox/ 0-notes/ …         … preset themes
│   └── finansy/ php/ …                 … пользовательские темы (без 0-)
├── awn-channels/
│   ├── 0-telegram/ 0-forum/ …          … CHANNEL_BUILTIN_PRESETS
│   └── slider/ …                       … кастом без preset
├── awn-media/
│   └── 0-documents/ 0-market/ …        … builtin mediatheques
├── awn-databases/
│   ├── 0-taxonomies/
│   │   └── 0-tags/ 0-categories/ …     … scaffold CSV (+ user: kollektsiya-1/)
│   ├── 0-contents/
│   │   └── 0-facts/ 0-glossary/ 0-reference/   … MCP facts / glossary / reference
│   ├── 0-ui/
│   │   └── 0-slogans/ 0-home-titles/   … rotators (agent-cms-core)
│   └── personal-finance/ …             … user stores
├── awn-repositories/  awn-system/  .agent-cms/  …
└── …
```

**MCP / UI:** `list_topics` / **`read_topic_index_toc`** — секции **`0-agent-kit`**, **`0-shared`** **pinned** вверху (`pinnedSections`, порядок agent-kit → shared); в sidebar — отдельные **`serviceTree`** / **`sharedTree`**. **`always-context`:** `awn-topics/0-shared/0-context/awn-storage/` (legacy `awn-shared/context/` → alias).

**Индексы:** `read_topic_index_toc` → **`awn-topics/INDEX.md`**; hub-каталоги — `refresh_*_index_toc` для `awn-channels|awn-media|awn-databases`.

---

## 🗺️ Полная карта MCP (`agent-cms` v0.4.0)

Источник: `mcp-server/index.js` + `mcp-server/lib/*`. **~200 tools** (часть алиасов — см. ниже).  
**workspaceId** — почти везде обязателен (legacy alias: **agentId**); **без workspaceId**: registry workspaces, `search_web`*, `read_web_page`, `get_link_preview`, `test_mcp_connection`, `generate_workspace_slug`, `get_workspace_storage_info`.

```
🚀 Старт чата
├── list_workspaces / list_vaults          … реестр хранилищ (id, name, path)
├── get_session_context                    … topicRegistry, always-context, RULES
├── get_session_documentation              … GLOBAL-DOC-MCP-INSTRUCTION, README (по вызову)
├── get_ui_focus (legacy get_user_active_context_now) … фокус UI → path/slot/ref
├── list_workspace_always_context          … always-load файлы workspace
├── list_workspace_cron                    … awn-runtime-cron
├── list_workspace_heartbeat               … awn-runtime-heartbeat
└── test_mcp_connection                    … ping CMS + версии

🏢 Registry workspace (без workspaceId в args; path/workspaceId в теле где нужно, legacy agentId)
├── create_workspace                       … папка + manifest + запись в реестре
├── register_workspace                     … подхват существующей папки
├── discover_workspaces                    … скан диска на awn.hub.topic.ws (legacy awn.page.ws)
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
├── list_topics                            … дерево тем (flat / parentPath)
├── read_topic_index_toc                   … read INDEX.md (канон workspace)
├── refresh_topic_index_toc                … rebuild INDEX.md
├── get_topic_map                          … deprecated → list_topics + read_topic_index_toc + list_folder
├── get_content_map                        … deprecated → read_content_index_toc + read_content properties
├── read_content_index_toc                 … read index.md темы/слота
├── refresh_content_index_toc              … rebuild index.md темы/слота
├── read_workspace_map / refresh_workspace_map … реестр manifest (WS-MAP.md)
├── resolve_workspace_path                 … breadcrumbs, slot/ref, mcp hints
├── get_page_url                           … URL страницы в UI (CHPU)
├── find_by_id / resolve_workspace_id      … awn-id → path(s)[]
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
├── create_workspace_fact / update_workspace_fact … contents/facts → **`0-contents/0-facts`** (REFACTOR-3)
├── list_workspace_facts / search_workspace_facts
├── create_glossary_term / update_glossary_term   … contents/glossary → **`0-contents/0-glossary`**
├── list_glossary_terms / search_glossary_terms
├── list_journal_entries / append_journal_entry   … .agent-cms/journal/
└── list_workspace_notifications           … колокольчик CMS

📄 Темы (manifest.md · awn.hub.topic.*)
├── get_topic / update_topic               … карточка hub (как channel)
├── list_topics                            … дерево flat / parentPath
├── topic_exists / get_topic_meta
├── read_topic_body / write_topic_body
├── read_topic_properties / write_topic_properties (+ property)
├── read_topic_schema / write_topic_schema · read/write_topic_config · read/write_topic_env
├── create_topic / delete_topic / rename_topic / move_topic
├── read_topic_index_toc / refresh_topic_index_toc

📦 Слоты
└── list_slots                             … placement.kind topic | channel | media | database | repository

📝 Контент (placement.kind: topic | channel | media | database | repository | root)
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

🗄️ awn-databases (list_databases … + *_content_* kind:database)
├── list_databases / get_database / register_database / update_database / delete_database / rename_database
├── read_databases_index_toc / refresh_databases_index_toc   … awn-databases/index.md
├── read_database_schema / write_database_schema
├── read_database_properties / write_database_properties
├── read_database_property / write_database_property
└── записи в data/ → list/create/read/write/delete/move_content (TODO-REFACTOR-6 ✅)

📡 Каналы (awn-channels/)
├── list_channels / get_channel / register_channel / update_channel
├── delete_channel / rename_channel
├── read_channels_index_toc / refresh_channels_index_toc   … awn-channels/index.md
└── *_content_*  kind: channel

🖼️ Медиатеки (awn-media/)
├── list_media_libraries / get_media_library / register_media_library / update_media_library
├── delete_media_library / rename_media_library
├── read_media_library_index_toc / refresh_media_library_index_toc … awn-media/index.md
└── *_content_*  kind: media

📚 Репозитории (awn-repositories/)
├── list_repositories / get_repository / register_repository / update_repository
├── delete_repository / rename_repository
├── read_repository_index_toc / refresh_repository_index_toc … awn-repositories/index.md
└── *_content_*  kind: repository

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
├── get_agent_identity / get_user_identity   … awn-topics/0-agent-kit/0-agent|0-user
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



**placement (канон):** `topic` · `channel` · `media` · `database` · `repository` · `root` (`tree` → root) — единые `read_content` / `write_content` / `list_content`; legacy `page` на входе → `topic` в ответах; hub-индексы и поиск — ветки ⚠️ выше (отдельно от CRUD).

---

**Только если `MCP_LEGACY_TOOLS=1`** (по умолчанию выключено):

```
MCP_LEGACY_TOOLS
│
├─ content (topic / channel / media / database / repository — по placement)
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

