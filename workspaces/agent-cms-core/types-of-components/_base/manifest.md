---
awn-preview: ""
awn-emoji: ""
awn-name: Базовый компонент
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: "2026-06-17T13:25"
awn-update: 2026-06-17T14:30:00.000Z
awn-description: Корневой класс awn.component — общий предок всех компонентов каталога
awn-main: false
awn-category: ""
awn-tags: []
awn-color: "#000000"
awn-version: 5
awn-sort: ""
---

# Базовый компонент (`awn.component`)

Корневой **класс** для всего каталога `types-of-components/`.

| | |
|---|---|
| **id** | `awn.component` |
| **Схема** | `awn-storage/_base/configuration/schema.yml` |
| **extends** | — |

## Свойства класса

- `id` — стабильный идентификатор (`awn.topic`, `awn.string`…)
- `name` — название в каталоге
- `description` — назначение
- `kind` — класс: `component` · `type` · `field` · `block` · `view` · `tool`

## Группы (наследники по смыслу)

| Группа | Папка | Базовый класс группы |
|--------|-------|----------------------|
| Ноды | `nodes/` | `awn.base` |
| Поля | `fields/` | `awn.field-def` |
| Блоки | `blocks/` | `awn.block.base` |
| Виды | `views/` | `awn.view.base` (черновик) |

Этот файл — документация; machine — в `awn-storage/_base/configuration/schema.yml`.
