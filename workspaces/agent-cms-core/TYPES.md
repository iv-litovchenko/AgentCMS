# Каталог типов platform core

Тип = **yaml-схема с наследованием**, не отдельная онтология.

## Дерево (workspace)

```
agent-cms-core/types/                    area «Types»
├── base/awn-storage/configuration/types/_base.yml     → awn.entity
├── pages/.../types/                                   → awn.page.*
├── content/.../types/                                 → awn.content.*
├── slots/.../types/                                   → awn.slot.*
├── fields/.../types/                                  → awn.string …
└── md-blocks/.../types/                               → awn.block.*
```

## Pages (узлы дерева)

| id | Назначение |
|----|------------|
| `awn.page.base` | Общие поля frontmatter |
| `awn.page.ws` | Корень workspace |
| `awn.page.area` | Область |
| `awn.page.topic` | Тема |

## Content (типы записей)

| id | Назначение |
|----|------------|
| `awn.content.record` | Запись в слоте |
| `awn.content.sidecar` | Sidecar медиа |
| `awn.content.record.category` | Категория в main |

## Slots (слои памяти)

`awn.slot.main`, `awn.slot.inbox`, `awn.slot.thread`, `awn.slot.media`, `awn.slot.repository`, …

## Legacy aliases

`awn.topic` → `awn.page.topic`, `awn.record` → `awn.content.record`, …

## API

- `GET /api/type-catalog`
- `GET /api/awn-types` (поле `typeCatalog`)
