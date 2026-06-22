---
awn-preview: ""
awn-emoji: ""
awn-name: Компоненты (типы)
awn-status: 🟡 Черновик
awn-type: awn.area
awn-create: "2026-06-17T11:52"
awn-update: 2026-06-17T14:30:00.000Z
awn-description: Каталог компонентов Agent CMS — MD манифест + schema в awn-storage
awn-main: false
awn-category: ""
awn-tags: []
awn-color: "#000000"
awn-version: 6
awn-sort: ""
---

# Компоненты (типы)

Каталог типов фреймворка **agent-cms-core**. Каждый компонент — **нода CMS**:

```
{component}.md
awn-storage/{component}/configuration/schema.yml
```

## Иерархия

```
_base.md + awn-storage/_base/configuration/schema.yml   ← awn.component
├── nodes/    topic.md + awn-storage/topic/configuration/schema.yml
├── fields/   string.md + awn-storage/string/configuration/schema.yml
├── blocks/   h2.md + awn-storage/h2/configuration/schema.yml
├── views/
├── mcp/
└── skills/
```

- **`*.md`** — human (манифест темы, frontmatter)
- **`awn-storage/…/configuration/schema.yml`** — machine (схема типа)
- **`_registration.md`** — область группы
- **`awn-sort.json`** — порядок в меню

## Корневой класс

[Базовый компонент](_base.md) · `awn-storage/_base/configuration/schema.yml`

## Группы

| Группа | Папка | Базовый класс |
|--------|-------|---------------|
| Ноды | [nodes/](nodes/_registration.md) | `awn.base` |
| Поля | [fields/](fields/_registration.md) | `awn.field-def` |
| Блоки | [blocks/](blocks/_registration.md) | `awn.block.base` |
| Виды | [views/](views/_registration.md) | `awn.view.base` |

Runtime по-прежнему читает `awn-types/` в корне репозитория; эталон — здесь.  
См. также [runtime/](../runtime/loaders.md), [integrations/](../integrations/_registration.md), [catalog/](../catalog/overview.md).
