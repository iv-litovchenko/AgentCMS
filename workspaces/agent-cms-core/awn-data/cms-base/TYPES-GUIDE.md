# CMS Base — типы

## Два уровня `awn-fields`

| Где | Что описывает |
|-----|----------------|
| **`manifest.md` → `awn-fields`** | Схема **строки каталога** (frontmatter записи: title, typeId, status…) |
| **Тело типа → `awn-fields`** | Схема **полей типа** (что mixin/page/content добавляет в форму) |

Пример mixin `preview.md`:
- frontmatter: `awn-title`, `awn-typeId` — из `mixins/manifest.md`
- body: `awn-fields: { awn-preview: … }` — поля, которые mixin подмешивает к page/content

## Три базовых типа (Сущности)

| typeId | Файл | Роль |
|--------|------|------|
| `awn.base` | `base.md` | `awn-name`, `awn-description` |
| `awn.table.base` | `table.base.md` | шаблон накопителя |
| `awn.row.base` | `row.base.md` | шаблон записи |

```
awn.base
 ├── awn.table.base  → tasks, taxonomies…
 └── awn.row.base    → pages, slots, content…
```

**entities/table-base/manifest.md** — технический `awn-extends` для накопителей (поля строки).

Карта workspace — [MAP.md](./MAP.md).
