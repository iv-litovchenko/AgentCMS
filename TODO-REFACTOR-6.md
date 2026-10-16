# Рефакторинг — часть 6

**Задача:** один слой **контента** (`placement` + `*_content_*`) вместо параллельного **`database_element_*`** и дублирующих типов **`awn-system/types/databases/elements/`**.

**✅** сделано · **❌** не сделано.

**Связано:** часть 4 (placement `database`), `GLOBAL-DOC-MCP.md` §6, `database_frame_*`.

---

## Часть 1 — MCP `database_element_*` → `*_content_*`

✅ Все tools сняты; записи через `placement: { kind: "database", path, slot: "data" }`.

---

## Часть 2 — типы `types/databases/elements/`

| Было | Стало |
| ---- | ----- |
| `awn.database.element.record` | **`awn.content.record`** (alias в TYPE_ID_ALIASES) |
| `awn.database.element.record-lite` | **`awn.content.record-lite`** (новый YAML в `types/content/`) |
| `awn.database.element.record-csv` | **`awn.content.record-csv`** |
| `awn.database.element.category` | **`awn.content.category`** |
| `elements/*.yml` | **удалены** |

Новые записи в `data/` получают `awn-type: awn.content.*`. Старые manifest/schema с `awn.database.element.*` читаются через aliases + `LEGACY_EXTENDS_TO_TYPE_ID`.

`list_types` preset **`data-elements`** — только четыре `awn.content.*` id.

---

## План

| Статус | Шаг |
| ------ | --- |
| ✅ | Часть 1 MCP |
| ✅ | `awn.content.record-lite.yml`, aliases, `awn-data-loader` constants |
| ✅ | Удалить `types/databases/elements/` |
| ✅ | Массово обновлены `awn-type` / `extends` в workspace data (`md`/`yml`, без `history/*.mdback`) |
| ✅ | UI `public/main.js`: проверки типов через `normalizeAwnTypeName` + `awn.content.*`; legacy map в `legacyToCanonical` |

## Чат (Cursor)

`<!-- uuid при старте работы -->`
