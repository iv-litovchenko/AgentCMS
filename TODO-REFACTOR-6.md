# Рефакторинг — часть 6

**Задача:** один слой **контента** (`placement` + `*_content_*`) вместо параллельного **`database_element_*`** и дублирующих типов **`awn-system/types/databases/elements/`**. На диске запись базы уже лежит в `awn-storage/data/` как файл — различие сейчас в API и типах, не в формате.

**✅** сделано · **❌** не сделано · **⚠️** не выкинуть без переноса логики.

**Связано:** часть 4 (placement `database`), `GLOBAL-DOC-MCP.md` §6, `database_frame_*` (каркас остаётся).

---

## Часть 1 — `database_element_*` vs `*_content_*`

| MCP | Аналог content | Статус |
| --- | -------------- | ------ |
| `database_element_list` | `list_content` (`kind: database`, `slot: data`) | ✅ снято → `list_content` → `/api/awn-databases/records` |
| `database_element_read_body` | `read_content` `part=body` | ✅ снято |
| `database_element_write_body` | `write_content` `part=body` | ✅ снято |
| `database_element_read_properties` | `read_content` `part=properties` | ✅ снято |
| `database_element_write_properties` | `write_content` `part=properties` | ✅ снято |
| `database_element_read_property` | `read_content_property` | ✅ снято |
| `database_element_write_property` | `write_content_property` | ✅ снято |
| `database_element_delete` | `delete_content` | ✅ снято → DELETE `/api/awn-databases/records` |
| `database_element_rename` | `move_content` (`targetParent`, `slug`) | ✅ снято → POST `records/rename` |
| `database_element_create` | `create_content` (`isSection`, `fileExtension`, …) | ✅ снято → POST `/api/awn-databases/records` |

**Остаётся:** `database_frame_*`, **`database_frame_get`**.

**Адрес записей:** `placement: { kind: "database", path: "<store>", slot: "data", ref: "…" }`.

---

## Часть 2 — `types/databases/elements/` vs `types/content/`

```
awn-system/types/databases/elements/
├── _base.yml          → domain: database, kind: element-base     [❌]
├── record.yml         → extends awn.content.record               [❌ удалить после aliases]
├── record-lite.yml    → md-lite profile                         [⚠️]
├── record-csv.yml     → extends awn.content.record-csv           [❌]
└── category.yml       → extends awn.content.category             [⚠️ record-role → frame]
```

**Итог части 2:** ❌ не начато.

---

## План (кратко)

| Статус | Шаг |
| ------ | --- |
| ✅ | `*_content_*` для database: list/create/delete/move → awn-databases API |
| ✅ | Remove all `database_element_*` из MCP (`iblock-tools.js`) |
| ❌ | Свести типы: aliases `awn.database.element.*` → `awn.content.*` |
| ❌ | Удалить `types/databases/elements/` |
| ✅ | SKILL / GLOBAL-DOC-MCP / mcp-policy / docs |

## Чат (Cursor)

`<!-- uuid при старте работы -->`
