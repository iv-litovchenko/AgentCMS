# Рефакторинг — часть 6

**Задачи:**

1. **Контент** — один слой (`placement` + `*_content_*`) вместо **`database_element_*`** и дублирующих **`types/databases/elements/`** → **`awn.content.*`**.
2. **Hub-узлы** — единая семья **`awn.hub.*`** (дерево тем + channel / media / repository); каталог **`types/pages/`** → **`types/hubs/`**; id **`awn.page.*`** → **`awn.hub.*`** (aliases, как для content).

**✅** сделано · **❌** не сделано.

**Связано:** часть 4 (placement), `GLOBAL-DOC-MCP.md`, `database_frame_*`. **Не путать:** hub = карточка `manifest.md`; слот **`data/`** = **`awn.content.*`**; карточка базы = **`awn.hub.database.*`** (см. E — без сегмента `frame`).

---

## A — MCP `database_element_*` → `*_content_*`

✅ Все tools сняты; записи через `placement: { kind: "database", path, slot: "data" }`.

---

## B — типы `types/databases/elements/` → `awn.content.*`

| Было | Стало |
| ---- | ----- |
| `awn.database.element.record` | **`awn.content.record`** (alias в TYPE_ID_ALIASES) |
| `awn.database.element.record-lite` | **`awn.content.record-lite`** (новый YAML в `types/content/`) |
| `awn.database.element.record-csv` | **`awn.content.record-csv`** |
| `awn.database.element.category` | **`awn.content.category`** |
| `elements/*.yml` | **удалены** |

Новые записи в `data/` получают `awn-type: awn.content.*`. Старые manifest/schema с `awn.database.element.*` читаются через aliases + `LEGACY_EXTENDS_TO_TYPE_ID`.

`list_types` preset **`data-elements`** — только четыре `awn.content.*` id.

| Статус | Шаг |
| ------ | --- |
| ✅ | Часть A MCP |
| ✅ | `awn.content.record-lite.yml`, aliases, `awn-data-loader` constants |
| ✅ | Удалить `types/databases/elements/` |
| ✅ | Массово обновлены `awn-type` / `extends` в workspace data (`md`/`yml`, без `history/*.mdback`) |
| ✅ | UI `public/main.js`: проверки типов через `normalizeAwnTypeName` + `awn.content.*`; legacy map в `legacyToCanonical` |

---

## C — `awn.page.*` → **`awn.hub.*`** (каталог hubs)

### Зачем

Сейчас смешение: дерево — **`awn.page.*`** (`domain: pages`), ingress-карточки — уже **`awn.hub.*`** (`domain: hubs`), но в **`types/pages/hubs/`** и **`extends: awn.page.base`**. Одно имя **hub** и одна папка каталога упрощают модель.

**Не делаем:** **`awn.hub.topic.ws`** — корень workspace не «разновидность topic». Плоские id: **`awn.hub.ws`**, **`awn.hub.area`**, …

### Карта id (канон)

| Было | Станет | Примечание |
| ---- | ------ | ---------- |
| `awn.page.base` | **`awn.hub.base`** | общие поля hub-узла |
| `awn.page.ws` | **`awn.hub.ws`** | корневой `manifest.md` workspace |
| `awn.page.area` | **`awn.hub.area`** | |
| `awn.page.section` | **`awn.hub.section`** | legacy `awn.page.section.*` → alias |
| `awn.page.topic` | **`awn.hub.topic`** | legacy `awn.page.topic.*` → alias |
| `awn.hub.channel` / `media` / `repository` | id без смены | каталог + **`extends: awn.hub.base`** |
| `awn.repository` / `awn.media` | уже aliases → hub | проверить после смены base |

**Опционально позже:** `awn.hub.database` vs **`awn.database.frame.*`**. **Placement:** kind **`page`** / **`topic`** можно оставить; переименование в `hub` — отдельный микро-шаг.

### План C

| Статус | Шаг |
| ------ | --- |
| ✅ | **`awn-system/types/hubs/`**: base, ws/area/section/topic, channel/media/repository |
| ✅ | YAML: **`domain: hubs`**, **`extends: awn.hub.base`** |
| ✅ | Удалён **`types/pages/`**; **`platform-sources.js`**, **`registry.yml`**, MCP type-list |
| ✅ | **`TYPE_ID_ALIASES`**, **`manifest-paths.js`**, **`page-tools.js`**, lib + **`public/main.js`**, DQL-тесты |
| ✅ | **`awn-type:`** в manifest / INDEX (без `history/*.mdback`); legacy **`awn.page.*`** → alias |
| ✅ | **`GLOBAL-DOC-MCP.md`** (SKILL / GLOBAL-DOC-MARKDOWN — по мере правок) |

**Порядок:** YAML + aliases → код создания узлов → миграция manifest → удаление `types/pages/`.

---

## D — раскладка hub-типов (семьи) · ✅

Один каталог **`types/hubs/`**: подпапка = семья, у семьи свой **`*.base`**. Лист темы — **`awn.hub.topic`** (не `.card`). Второй сегмент (`.group`, `.frame.*`) — только если в семье несколько типов одного уровня. **`types/databases/`** → **`types/hubs/database/`**. Записи в слотах по-прежнему **`awn.content.*`**.

```
types/hubs/
├── _base.yml                              → awn.hub.base
├── topic/
│   ├── _base.yml                          → awn.hub.topic.base
│   ├── ws.yml                             → awn.hub.topic.ws
│   ├── area.yml                           → awn.hub.topic.area
│   ├── section.yml                        → awn.hub.topic.section
│   └── topic.yml                          → awn.hub.topic
├── channel/
│   ├── _base.yml                          → awn.hub.channel.base
│   └── channel.yml                        → awn.hub.channel
├── media/
│   ├── _base.yml                          → awn.hub.media.base
│   └── media.yml                          → awn.hub.media
├── repository/
│   ├── _base.yml                          → awn.hub.repository.base
│   ├── repository.yml                     → awn.hub.repository
│   └── group.yml                          → awn.hub.repository.group  *(план, типа ещё нет)*
└── database/
    ├── _base.yml                          → awn.hub.database.base
    ├── single.yml | group.yml | collection.yml | taxonomy-collection.yml
```

**Наследование (id):** `awn.hub.base` → `awn.hub.topic.base` → ws | area | section | **topic**; channel / media / repository; database — см. **E**.

**Legacy после D:** `awn.hub.ws` → `awn.hub.topic.ws`; `awn.database.frame.*` → `awn.hub.database.frame.*` (до E).

| Статус | Шаг |
| ------ | --- |
| ✅ | Подпапки `topic|channel|media|repository|database`; ingest `hubs` + `hubs/database` |
| ✅ | Aliases; `awn.hub.topic.*`; `awn.hub.database.frame.*`; миграция manifest (ws/area/section) |
| ✅ | Удалены плоские `types/hubs/*.yml` и `types/databases/` |

---

## E — hub database: убрать `frame` · ✅

**Зачем:** сегмент **`frame`** и папка **`frames/`** — наследие `kind: frame`, не как у **`awn.hub.topic.*`**. Канон: **`awn.hub.database.single`**, не `…database.frame.single`.

**MCP:** каркас — **`list_databases`**, **`get_database`**, … (legacy **`database_frame_*`**); записи — **`*_content_*`**, `placement: { kind: "database", slot: "data" }`. См. **F**.

### Целевое дерево каталога

```
types/hubs/database/
├── _base.yml                    → awn.hub.database.base
├── single.yml                   → awn.hub.database.single
├── group.yml                    → awn.hub.database.group
├── collection.yml               → awn.hub.database.collection
└── taxonomy-collection.yml      → awn.hub.database.taxonomy-collection
```

*(Файл `taxonomy-collection.yml`, id с точками только в YAML `id:` — не `collection/taxonomy` как сегмент id, если не нужна вложенность.)*

### Карта id

| Сейчас (после D) | Канон (E) |
| ---------------- | --------- |
| `awn.hub.database.frame.base` | *(убрать)* — типы **`extends: awn.hub.database.base`** |
| `awn.hub.database.frame.single` | **`awn.hub.database.single`** |
| `awn.hub.database.frame.group` | **`awn.hub.database.group`** |
| `awn.hub.database.frame.collection` | **`awn.hub.database.collection`** |
| `awn.hub.database.frame.taxonomy-collection` | **`awn.hub.database.taxonomy-collection`** |
| `awn.database.frame.*` | aliases → **`awn.hub.database.*`** |

### План E

| Статус | Шаг |
| ------ | --- |
| ✅ | Плоский `database/`; id **`awn.hub.database.single|group|collection|taxonomy-collection`** |
| ✅ | **`TYPE_ID_ALIASES`**, `awn-data-loader`, `isDatabaseFrameTypeId`, `public/main.js` |
| ✅ | `awn-type` / `extends` в manifest и `schema.yml`; legacy **`awn.database.frame.*`** → alias |
| ✅ | `GLOBAL-DOC-MCP.md` |
| ✅ | Удалён `database/frames/` |

---

## F — MCP: `list_databases` … (legacy `database_frame_*`) · ✅

| Канон | Legacy alias |
| ----- | ------------- |
| `list_databases` | `database_frame_list` |
| `get_database` | `database_frame_get` |
| `register_database` / `delete_database` / `rename_database` | `create_database`, `database_frame_*` |
| `read_database_schema` / `write_database_schema` | … |
| `read_database_properties` / `write_*` | … |
| `read_databases_index_toc` | `read_database_frame_index_toc` |
| `refresh_databases_index_toc` | `refresh_database_frame_index_toc` |

Записи в `data/` — без изменений: **`*_content_*`**, `placement: database`.

| ✅ | `iblock-tools.js`, `mcp-policy.yml`, docs, `server.js` hints |

---

## G — выравнивание hub-семейств (MCP) · ❌ опционально

Модель уже единая: **hub-карточка + index TOC + `list_slots` + `*_content_*`**. Ниже — косметика и онбординг, **не блокер** после A–F.

| # | Область | Сейчас | Целевое / идея | Приоритет |
| - | ------- | ------ | -------------- | --------- |
| G1 | **Topics vs ingress** | ~~только `read_topic_*`~~ | ✅ **`get_topic` / `update_topic`** (как channel); **`read|write_topic_*`** для schema/config/env — без снятия | ✅ |
| G2 | **Database hub** | ~~`create_database`~~ | ✅ **`register_database`** (legacy `create_database`, `database_frame_create`); **`update_database`** (G3) | ✅ |
| G3 | **Database** | ~~нет `update_database`~~ | ✅ **`update_database`** = patch manifest (как `update_channel`); schema — **`write_database_schema`** | ✅ |
| G4 | **Channel / media / repo** | ~~только register/update~~ | ✅ **`delete_*` / `rename_*`** hub-папки (soft-delete в корзину; builtin presets channel/media — 403) | ✅ |
| G5 | **Topics — каталог** | ~~нет `list_topics`~~ | ✅ **`list_topics`** — flat или `parentPath` + `scope=children\|subtree`; INDEX → `read_topic_index_toc` | ✅ |
| G6 | **Placement** | ~~`page` в docs~~ | ✅ канон **`topic`**; **`page`** — legacy input (Zod preprocess + `content-placement.js`) | ✅ |
| G7 | **Repository** | тонкий MCP (manifest + index) | Тип **`awn.hub.repository.group`** в `types/hubs/repository/` + при необходимости tools | отложено |
| G8 | **Legacy MCP** | ~~`database_frame_*` / `iblock_*` в policy read list~~ | ✅ whitelist **только канон**; aliases остаются на MCP-сервере | ✅ |
| G9 | **Документация** | ~~расхождения деревьев~~ | ✅ `TODO-REFACTOR-4`, `GLOBAL-DOC-MCP`, `docs/mcp-0.0.2.js`, `mcp-server/README` | ✅ |

**Не трогаем без отдельного решения:** записи в слотах — только **`*_content_*`** (не `list_database_records` и т.п.); **schema store** у database остаётся отдельным слоем (у topic — `read_topic_schema`).

---

## Чат (Cursor)

`<!-- uuid при старте работы -->`
