# Модель инфоблок + элемент

> Полная спецификация: [SPEC.md](./SPEC.md)

Аналог Битрикс: **инфоблок** (таблица) + **свойства** + **элементы** (строки).

## Дерево

```
awn.base
├── awn.table.base          ← ИНФОБЛОК (store / collection)
│   ├── manifest.md         ← настройки + awn-fields (свойства)
│   └── *.md                ← элементы (или типы элементов)
└── awn.row.base            ← ЭЛЕМЕНТ (строка)
        awn-id, awn-created, awn-updated

awn-database/
├── cms-base/entities/      ← канон двух базовых типов
│   ├── base.md
│   ├── table.base.md       ← «Инфоблок»
│   └── row.base.md         ← «Элемент»
│
├── tasks/                  ← инфоблок «задачи»
│   ├── manifest.md
│   └── 1.md, 2.md          ← элементы = данные

awn-system/types/           ← pages, content, slots (источник рантайма)
    └── slots/
        ├── multi-file/
        └── single-file/
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
awn-system/types/*          ←  pages, content, slots (YAML, источник рантайма)
tasks / taxonomies          ←  extends row.base напрямую
```

## UI

При открытии инфоблока (одна колонка, сверху вниз):

1. **Настройки инфobлока** — frontmatter manifest
2. **Описание** — body manifest (markdown)
3. **Свойства элементов** — `awn-fields` / `awn-schema-fields`
4. **Элементы** — список записей `.md`
