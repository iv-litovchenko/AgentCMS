# CMS Base — типы

## Иерархия в «Сущностях»

```
base.md (awn.base)
 ├── table.base.md (awn.table.base)  ← накопители (entities, pages, content…)
 └── row.base.md (awn.row.base)      ← строки данных (tasks, taxonomies…)

mixins → base.md (awn.base)
```

| Файл | typeId | `awn-extends` store | body `awn-fields` |
|------|--------|---------------------|-------------------|
| `base.md` | `awn.base` | — | name, description |
| `table.base.md` | `awn.table.base` | `awn.base` (type) + chain → `row.base.md` | поля каталога типов |
| `row.base.md` | `awn.row.base` | `awn.base` (type) | id, created, updated |

## Два уровня `awn-fields`

| Где | Что описывает |
|-----|----------------|
| **`manifest.md`** | локальные поля накопителя (+ наследование через `awn-extends:`) |
| **body типа** | поля runtime-типа (forms, mixins) |

Накопители:
- **типовые** (pages, content…) → `awn-extends: …/table.base.md`
- **данные** (tasks, taxonomies…) → `awn-extends: …/row.base.md`
- **mixins** → `awn-extends: …/base.md`

Карта workspace — [MAP.md](./MAP.md).
