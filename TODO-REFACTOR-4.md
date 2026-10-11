# Рефакторинг — часть 4

**Задача:** единая модель **контент** (не «контент страницы»); размещение — страница / канал / медиатека / дерево — отдельно. MCP: один набор методов + `placement` (или `contentRef`).

**✅** сделано · **❌** не сделано.

Оглавления / индексы — в конце файла (⚠️ обсудить отдельно).

### Пример MCP: страница (тема + слот + файл)

**Сейчас — `read_content_body`**

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

**План — `read_content`**

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
**MCP:** `lib/config/content-placement.js` + `placement.kind`: `page` | `channel` | `media`; legacy `path`+`slot` = `page`. Основные tools — ниже (✅ MCP = `placement` в MCP + серверная политика слотов частично). **`tree`** — шаг 7. Индексы — ⚠️ в конце файла.

---

## Мета

| Статус | MCP (сейчас)     | План (имя)   |
| ------ | ---------------- | ------------ |
| ✅ MCP | `content_exists` | `content_exists` |
| ✅ MCP | `get_content_meta` | `get_content_meta` |

## Body

| Статус | MCP (сейчас)        | План (имя)     |
| ------ | ------------------- | -------------- |
| ✅ MCP | `read_content_body` | `read_content` |
| ✅ MCP | `write_content_body` | `write_content` |

## Properties

| Статус | MCP (сейчас)              | План (имя)                |
| ------ | ------------------------- | ------------------------- |
| ✅ MCP | `read_content_properties` | `read_content` (`part: properties`) или legacy |
| ✅ MCP | `write_content_properties` | `write_content` (`part: properties`) или legacy |
| ✅ MCP | `read_content_property`   | `read_content_property`   |
| ✅ MCP | `write_content_property`  | `write_content_property`  |

## Schema

| Статус | MCP (сейчас)           | План (имя)             |
| ------ | ---------------------- | ---------------------- |
| ✅ MCP | `read_content_schema`  | `read_content` (`part: schema`) или legacy |
| ✅ MCP | `write_content_schema` | `write_content` (`part: schema`) или legacy |

## Жизненный цикл

| Статус | MCP (сейчас)              | План (имя)              |
| ------ | ------------------------- | ----------------------- |
| ✅ MCP | `create_content`          | `create_content`        |
| ✅ MCP | `import_content_from_url` | `import_content_from_url` |
| ✅ MCP | `rename_content`          | `rename_content`        |
| ✅ MCP | `move_content`            | `move_content`          |
| ✅ MCP | `delete_content`          | `delete_content`        |

## Слоты / контейнер

| Статус | MCP (сейчас)      | План (имя)   |
| ------ | ----------------- | ------------ |
| ✅ MCP | `list_page_slots` | `list_slots` |
| ✅ MCP | —                 | `list_content` (каталог файлов в слоте; channel/media/page) |

---

## Scope размещения (план)

| Контейнер   | Сейчас (отдельные tools)        |
| ----------- | ------------------------------- |
| Страница    | `read/write/list_content` + `list_slots` (+ legacy `content_*`) |
| Канал       | `read_content` / `write_content` / `list_content` (+ legacy channel tools) |
| Медиатека   | то же с `kind: media` (+ legacy media tools) |
| Дерево      | в основном `read_file` / `write_file` |

Цель: те же **content_*** + `placement.kind` для всех контейнеров (где применимо schema/properties). **Осталось:** `kind: tree`; при необходимости — guard на `/api/content/schema`, transfer/section API.

---

## ⚠️ Индексы, оглавления, поиск — обсудить отдельно

Не CRUD контента (`read_content` / `write_content` / …). Здесь: **карты**, **markdown-оглавления на диске**, **каталоги hub**, **кэши** `.agent-cms/cache/indexes/*`, **поиск**.

```
⚠️ Навигация и оглавления (файлы в workspace)
├── Workspace (дерево страниц)
│   ├── get_page_map                    … runtime: manifest + папки без manifest
│   ├── get_workspace_page_index        … read INDEX.md
│   └── refresh_workspace_page_index    … rebuild INDEX.md ← get_page_map
├── Тема / слот (TOC контента)
│   ├── get_content_map                 … meta по всем слотам страницы (тяжелее)
│   ├── get_content_index               … read index.md темы или слота
│   └── refresh_content_index           … rebuild index.md темы/слота
├── WS-MAP (реестр всех index/INDEX в ws)
│   ├── get_workspace_wsmap
│   └── refresh_workspace_wsmap         … rebuild WS-MAP.md
├── Hub-каталоги (index.md в корне раздела)
│   ├── awn-databases/index.md
│   │   ├── database_frame_read_index
│   │   ├── database_frame_refresh_index
│   │   ├── iblock_read_index           … alias read
│   │   └── iblock_refresh_index        … alias refresh
│   ├── awn-media/index.md
│   │   └── refresh_media_library_index
│   ├── awn-repositories/index.md
│   │   └── refresh_repository_index
│   └── awn-channels/index.md           … MCP index пока нет ⚠️
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

| Статус | slug | Иконка | Название | Описание |
| ------ | ---- | ------ | -------- | -------- |
| ✅ preset | `forum` | 💬 | Форум | Дискуссии и обсуждения (где люди могут…) |
| ✅ preset | `blog-agent` | 📝 | Блог | Куда агент пишет то, что интересует; что собрал агент сегодня — по моим запросам |
| ✅ preset | `digest` | 📰 | Дайджесты | Сводки и подборки, которые агент собирает сюда |
| ✅ preset | `youtube` | ▶️ | YouTube | Видео и темы для обсуждения / разбора |
| ✅ preset | `telegram` | ✈️ | Telegram | Выгрузка тем и сообщений из Telegram |
| ✅ preset | `whatsapp` | 💬 | WhatsApp | Входящий поток из WhatsApp |
| ✅ preset | `web` | 🌐 | Интернет | Страницы, ссылки и материалы из сети |
| ✅ preset | `bookmarks` | 🔖 | Закладки | Сохранённые ссылки до triage |
| ✅ preset | `browser-downloads` | 📥 | Загрузки | Файлы из загрузок браузера |
| ✅ preset | `notebooks` | 📓 | Печатные тетради | Скан/фото тетрадей, рукописные заметки |
| ✅ preset | `photo-archive` | 🖼️ | Фотоархив | Общий фотоархив |
| ✅ preset | `photo-phone` | 📱 | Фотоархив (телефон) | Фото с телефона |
| ✅ preset | `analytics` | 📊 | Аналитика | Метрики, отчёты, дашборды |
| ✅ preset | `real-world` | 🌍 | Реальный мир | Объекты и факты из офлайн-мира |
| ✅ preset | `market` | 🛒 | Барахолка | Объявления, покупки/продажи |
| ✅ preset | `notes` | 📒 | Заметки | Разрозненные заметки до разбора |
| ✅ preset | `screenshots` | 🖥️ | Скриншоты | Снимки экрана, ingress до triage |
| ✅ preset | `other` | 📦 | Другое | Не знаю куда деть — временный вход |

Пользовательские каналы (созданные в workspace, не из списка выше) — отдельные строки в том же списке без `--preset` (например `slider`, `screenshots` как живые папки).

### Заготовки к добавлению (❌ в `channel-presets.js` пока нет)

| Статус | slug (предлож.) | Иконка | Название | Описание |
| ------ | --------------- | ------ | -------- | -------- |
| ❌ | `news` | 📰 | Новости | Ленты новостей, статьи, анонсы |
| ❌ | `notebook-white` | 📄 | Белая тетрадь | Печатная тетрадь с нумерацией страниц |
| ❌ | `notebook-pink` | 🩷 | Розовый блокнот | Блокнот с нумерацией страниц |
| ❌ | `capabilities` | 💡 | Возможности | Обсуждение возможностей и идей с агентом |
| ❌ | `mailbox` | 📧 | Почта | Mailbox / входящая почта |
| ❌ | `rss` | 📡 | RSS | Подписки и feed-агрегаторы |
| ❌ | `github` | 🐙 | GitHub | Issues, pull requests, уведомления репозитория |
| ❌ | `voice` | 🎙️ | Голос | STT, записи встреч, голосовые заметки |
| ❌ | `ocr` | 🔍 | OCR | Сканы, фото документов, распознавание текста |
| ❌ | `clipboard` | 📋 | Clipboard | Буфер обмена и быстрые вставки |
| ❌ | `webhook` | 🔗 | Webhook | API, n8n и прочие автоматические входы |
| ❌ | `cloud-inbox` | ☁️ | Облачный inbox | Drive, Dropbox и другие облачные папки-источники |
| ❌ | `companion` | 🧩 | Companion | Расширение браузера / companion-приложение |

Примечание: ingress-канал по модели — `inbox` / `todo-single` / `outbox` в `awn-storage/`; пресет в сайдбаре — только **метка источника** и папка `awn-channels/{slug}/`, не отдельный «тип показа».
