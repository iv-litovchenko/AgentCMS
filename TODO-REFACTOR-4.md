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
Позже тот же `read_content` с `placement.kind`: `channel` | `media` | `tree` — без смены имени tool.

---

## Мета

| Статус | MCP (сейчас)     | План (имя)   |
| ------ | ---------------- | ------------ |
| ❌      | `content_exists` | `content_exists` |
| ❌      | `get_content_meta` | `get_content_meta` |

## Body

| Статус | MCP (сейчас)        | План (имя)     |
| ------ | ------------------- | -------------- |
| ❌      | `read_content_body` | `read_content` |
| ❌      | `write_content_body` | `write_content` |

## Properties

| Статус | MCP (сейчас)              | План (имя)                |
| ------ | ------------------------- | ------------------------- |
| ❌      | `read_content_properties` | `read_content_properties` |
| ❌      | `write_content_properties` | `write_content_properties` |
| ❌      | `read_content_property`   | `read_content_property`   |
| ❌      | `write_content_property`  | `write_content_property`  |

## Schema

| Статус | MCP (сейчас)           | План (имя)             |
| ------ | ---------------------- | ---------------------- |
| ❌      | `read_content_schema`  | `read_content_schema`  |
| ❌      | `write_content_schema` | `write_content_schema` |

## Жизненный цикл

| Статус | MCP (сейчас)              | План (имя)              |
| ------ | ------------------------- | ----------------------- |
| ❌      | `create_content`          | `create_content`        |
| ❌      | `import_content_from_url` | `import_content_from_url` |
| ❌      | `rename_content`          | `rename_content`        |
| ❌      | `move_content`            | `move_content`          |
| ❌      | `delete_content`          | `delete_content`        |

## Слоты / контейнер

| Статус | MCP (сейчас)      | План (имя)   |
| ------ | ----------------- | ------------ |
| ❌      | `list_page_slots` | `list_slots` |

---

## Scope размещения (план)

| Контейнер   | Сейчас (отдельные tools)        |
| ----------- | ------------------------------- |
| Страница    | `content_*` + слоты             |
| Канал       | `read_channel_file`, `upload_channel_file`, … |
| Медиатека   | `read_media_library_file`, `upload_media_library_file`, … |
| Дерево      | в основном `read_file` / `write_file` |

Цель: те же **content_*** + `placement.kind` для всех контейнеров (где применимо schema/properties).

---

## ⚠️ Индексы, оглавления, поиск — обсудить отдельно

Одна таблица: всё, что строит/читает `index.md` / `INDEX.md` / `WS-MAP.md`, каталоги manifest, offline-кэши `.agent-cms/cache/indexes/*`, поиск по workspace. CRUD контента сюда не входит.

| ⚠️ | Группа | MCP (сейчас) | Кратко |
| -- | ------ | ------------ | ------ |
| ⚠️ | **Карта workspace** | `get_page_map` | дерево: manifest-страницы + папки без manifest |
| ⚠️ | **Карта workspace** | `get_workspace_page_index` | read `INDEX.md` (оглавление страниц) |
| ⚠️ | **Карта workspace** | `refresh_workspace_page_index` | rebuild `INDEX.md` из `get_page_map` |
| ⚠️ | **Карта контента (тема)** | `get_content_map` | все слоты страницы, meta без body |
| ⚠️ | **Карта контента (тема)** | `get_content_index` | read `index.md` темы/слота (TOC) |
| ⚠️ | **Карта контента (тема)** | `refresh_content_index` | rebuild `index.md` темы или слота |
| ⚠️ | **WS-MAP** | `get_workspace_wsmap` | список всех `index.md` / `INDEX.md` в workspace |
| ⚠️ | **WS-MAP** | `refresh_workspace_wsmap` | rebuild `WS-MAP.md` |
| ⚠️ | **Инфоблоки (каталог БД)** | `database_frame_read_index` | read `awn-databases/index.md` |
| ⚠️ | **Инфоблоки (каталог БД)** | `database_frame_refresh_index` | rebuild `awn-databases/index.md` |
| ⚠️ | **Инфоблоки (каталог БД)** | `iblock_read_index` | alias → `database_frame_read_index` |
| ⚠️ | **Инфоблоки (каталог БД)** | `iblock_refresh_index` | alias → `database_frame_refresh_index` |
| ⚠️ | **Медиатека** | `refresh_media_library_index` | rebuild `awn-media/index.md` |
| ⚠️ | **Репозитории** | `refresh_repository_index` | rebuild `awn-repositories/index.md` |
| ⚠️ | **Каналы** | — | index MCP пока нет (аналог медиатеки — ⚠️) |
| ⚠️ | **Поиск (read)** | `search_workspace_content` | fulltext по workspace |
| ⚠️ | **Поиск (read)** | `search_workspace_semantic` | semantic (hash-TF-IDF) |
| ⚠️ | **Поиск (read)** | `search_workspace_hybrid` | semantic + fulltext |
| ⚠️ | **Поиск (read)** | `search_workspace_batch` | пакет hybrid-запросов |
| ⚠️ | **Поиск (read)** | `search_workspace_links` | граф ссылок / backlinks |
| ⚠️ | **Поиск (read)** | `query_workspace_storage` | SQL-like по field catalog |
| ⚠️ | **Поиск (read)** | `list_workspace_registry_queries` | именованные пресеты запросов |
| ⚠️ | **Поиск (read)** | `run_workspace_registry_query` | выполнить пресет |
| ⚠️ | **Offline-индексы** | `get_workspace_index_status` | статус слоёв (OCR, fulltext, semantic, storage, link) |
| ⚠️ | **Offline-индексы** | `get_workspace_index_monitor` | здоровье / stale / размер |
| ⚠️ | **Offline-индексы** | `rebuild_workspace_fulltext_index` | `.agent-cms/cache/indexes/fulltext` |
| ⚠️ | **Offline-индексы** | `rebuild_workspace_semantic_index` | `.agent-cms/cache/indexes/semantic` |
| ⚠️ | **Offline-индексы** | `rebuild_workspace_storage_index` | field catalog (frontmatter) |
| ⚠️ | **Offline-индексы** | `rebuild_workspace_link_index` | link graph (sqlite) |
| ⚠️ | **Offline-индексы** | `run_workspace_ocr_index` | OCR вложений |
| ⚠️ | **Offline-индексы** | `rebuild_workspace_indexes` | UI pipeline: всё сразу + WS-MAP |
| ⚠️ | **Offline-индексы** | `sync_workspace_index_file` | инкремент после правки одного файла |
