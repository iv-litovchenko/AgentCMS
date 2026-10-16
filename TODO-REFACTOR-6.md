# Рефакторинг — часть 6

**Задачи:**

1. **Контент** — один слой (`placement` + `*_content_*`) вместо **`database_element_*`** и дублирующих **`types/databases/elements/`** → **`awn.content.*`**.
2. **Hub-узлы** — единая семья **`awn.hub.*`** (дерево тем + channel / media / repository); каталог **`types/pages/`** → **`types/hubs/`**; id **`awn.page.*`** → **`awn.hub.*`** (aliases, как для content).

**✅** сделано · **❌** не сделано.

**Связано:** часть 4 (placement), `GLOBAL-DOC-MCP.md`, `database_frame_*`. **Не путать:** hub = карточка узла (`manifest.md`); записи в слотах = **`awn.content.*`**; карточка базы = **`awn.database.frame.*`**.

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
    └── frames/
        ├── _base.yml                      → awn.hub.database.frame.base
        ├── single.yml | group.yml | collection.yml
        └── collection/taxonomy.yml
```

**Наследование (id):** `awn.hub.base` → `awn.hub.topic.base` → ws | area | section | **topic**; отдельно channel / media / **repository** (сейчас один тип; `repository.group` — позже); database.base → frame.base → single | group | collection.

**Legacy после D:** `awn.hub.ws` → `awn.hub.topic.ws`, `awn.hub.topic` (плоский) → тот же id; `awn.database.frame.*` → `awn.hub.database.frame.*`.

| Статус | Шаг |
| ------ | --- |
| ✅ | Подпапки `topic|channel|media|repository|database`; ingest `hubs` + `hubs/database` |
| ✅ | Aliases; `awn.hub.topic.*`; `awn.hub.database.frame.*`; миграция manifest (ws/area/section) |
| ✅ | Удалены плоские `types/hubs/*.yml` и `types/databases/` |

---

## Чат (Cursor)

`<!-- uuid при старте работы -->`
