---
awn-preview: ""
awn-emoji: ""
awn-name: _base
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: 2026-06-17T10:43:02.343Z
awn-update: 2026-06-17T13:45:00.000Z
awn-description: Базовый класс видов — awn.view.base (черновик)
awn-main: false
awn-category: ""
awn-tags: []
awn-color: ""
awn-version: 2
awn-sort: ""
---

# _base — `awn.view.base` (черновик)

Базовый **класс группы views** — способ отображения данных агента.

| | |
|---|---|
| **id** | `awn.view.base` (план) |
| **Схема** | `storage/_base/configuration/schema.yml` (добавить) |
| **kind** | `view` |

Примеры наследников: dashboard, table, map, graph, timeline, kanban.

Связь с нодами: вид читает `storage` и метаданные topic/record, не создаёт файлы сам.
