# CMS Base — типы (инфоблок / элемент)

## Базовые сущности (`entities/`)

```
base.md (awn.base)
 ├── table.base.md (awn.table.base)   ← ИНФОБЛОК
 └── row.base.md (awn.row.base)       ← ЭЛЕМЕНТ

mixins → base.md
```

| Файл | typeId | Роль |
|------|--------|------|
| `base.md` | `awn.base` | корень: name, description |
| `table.base.md` | `awn.table.base` | шаблон инфоблока + ключи manifest |
| `row.base.md` | `awn.row.base` | шаблон элемента: id, created, updated |

## Накопители

| Режим | extends | Примеры | Элемент = |
|-------|---------|---------|-----------|
| Каталог типов | `table.base.md` | pages, slots, content | описание типа |
| Данные | `row.base.md` | tasks, taxonomies | строка данных |
| Mixins | `base.md` | cms-base/mixins | примесь |

Полная карта — [IBLOCK-MODEL.md](./IBLOCK-MODEL.md).
