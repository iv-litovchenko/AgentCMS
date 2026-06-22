---
awn-preview: ""
awn-emoji: ""
awn-name: manifest-paths
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: "2026-06-21T18:00"
awn-update: 2026-06-21T18:00:00.000Z
awn-description: Конвенции путей — workspace, area, topic, awn-storage
awn-main: false
awn-category: ""
awn-tags: [runtime]
awn-color: ""
awn-version: 1
awn-sort: ""
---

# manifest-paths

Единый модуль конвенций файловой системы Agent CMS.

| | |
|---|---|
| **Код** | `manifest-paths.js` |
| **Схема** | — (план: `awn-storage/manifest-paths/configuration/schema.yml`) |

## Основные правила

- **Workspace:** `_registration.md` в корне агента (`awn.workspace`)
- **Область:** `{Name}/_registration.md` (`awn.area`)
- **Тема:** `{Name}.md` (`awn.topic`)
- **Слот данных:** `awn-storage/{slug}/` рядом с манифестом

## Bundle-файлы в слоте

| Файл | Режим UI |
|------|----------|
| `content.md` | internal / память |
| `content.csv` | tabular |
| `configuration.yml` | configs / схема полей темы |
| `todo.md` | todo |
| `history/` | версии |

## Связанные типы

Описаны в [types-of-components/nodes/](../types-of-components/nodes/_registration.md): `workspace`, `area`, `topic`, `record`.
