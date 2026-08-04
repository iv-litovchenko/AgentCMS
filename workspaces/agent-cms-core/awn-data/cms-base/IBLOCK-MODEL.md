# Модель инфоблок + элемент

Аналог Битрикс: **инфоблок** (таблица) + **свойства** + **элементы** (строки).

## Дерево

```
awn.base
├── awn.table.base          ← ИНФОБЛОК (store / collection)
│   ├── manifest.md         ← настройки + awn-fields (свойства)
│   └── *.md                ← элементы (или типы элементов)
└── awn.row.base            ← ЭЛЕМЕНТ (строка)
        awn-id, awn-created, awn-updated

awn-data/
├── cms-base/entities/      ← канон двух базовых типов
│   ├── base.md
│   ├── table.base.md       ← «Инфоблок»
│   └── row.base.md         ← «Элемент»
│
├── pages/                  ← инфоблок «типы страниц»
│   ├── manifest.md         ← свойства инфоблока
│   └── topic.md …          ← элементы = описания типов
│
├── tasks/                  ← инфоблок «задачи»
│   ├── manifest.md
│   └── 1.md, 2.md          ← элементы = данные
│
└── slots/                  ← инфоблок «слоты»
    ├── manifest.md
    └── inbox.md …
```

## Три слоя у инфоблока

| Слой | Где | Пример |
|------|-----|--------|
| **Настройки** | frontmatter `manifest.md` | `awn-type`, `awn-id`, `awn-extends`, `awn-record` |
| **Свойства** | `awn-fields:` в manifest | `awn-title`, `awn-status`, `awn-path` |
| **Описание** | body `manifest.md` | markdown после `---` |

## Наследование инфоблоков

```
row.base  ←  id, created, updated
   ↑ awn-extends
table.base  ←  + title, typeId, kind, status
   ↑ awn-extends
pages / slots / content     ←  + свои свойства
tasks / taxonomies          ←  extends row.base напрямую
```

## UI

При открытии инфоблока:

- **Слева** — настройки, описание, свойства (manifest)
- **Справа** — список элементов (записи `.md`)
