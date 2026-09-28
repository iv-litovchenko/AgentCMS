---
awn-name: Таксономии (справочники)
awn-preview: ""
awn-web-url: ""
awn-status: open
awn-quality: 4
awn-importance: 0
awn-note-todo-sticker: ""
awn-emoji: ""
awn-sort: ""
awn-runtime-load-always: false
awn-runtime-heartbeat: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-commands: false
awn-index-exclude: false
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: ""
awn-tags: ""
awn-type: awn.database.frame.group
awn-id: taxonomies
awn-create: 2026-09-20T12:00:00.000Z
awn-update: 2026-09-24T12:00:00.000Z
awn-version: 1
awn-description: "Группировка enum-справочников платформы"
---
# Таксономии (справочники)

Встроенная группа CSV-справочников workspace. Каждый поднакопитель — коллекция `main.csv` в `awn-databases/awn-taxonomies/`.

Значения подключаются к записям через единое поле `awn-taxonomy`:

```yaml
awn-taxonomy:
  tags: [demo, idea]
  category: work
  color: [blue, slate]
```

| Справочник | Ключ | Кардинальность |
|------------|------|----------------|
| [tags/](./tags/manifest.md) | `tags` | many |
| [categories/](./categories/manifest.md) | `category` | one |
| [colors/](./colors/manifest.md) | `color` | many |

Метаданные словаря (тип `awn.database.frame.taxonomy-collection`): `awn-taxonomy-cardinality` (`one`/`many`), `awn-taxonomy-hierarchy`. Ключ в `awn-taxonomy.*` — из slug папки.

`awn-status` — отдельное поле (не часть `awn-taxonomy`).
