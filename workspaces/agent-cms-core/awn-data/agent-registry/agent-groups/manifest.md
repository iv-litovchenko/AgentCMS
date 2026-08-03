---
awn-type: awn.data.collection
awn-id: agent-registry.groups
awn-name: Группы агентов
awn-extends: awn-data/cms-base/record-base/manifest.md
awn-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
  awn-id:
    type: awn.string
    title: ID
    description: Идентификатор записи (= имя файла без .md)
    locked: true
  awn-created:
    type: awn.datetime
    title: Создано
  awn-updated:
    type: awn.datetime
    title: Обновлено
  awn-title:
    type: awn.string
    title: Название
    required: true
  awn-agentIds:
    type: awn.string
    title: Агенты
    description: id агентов через запятую
  awn-background:
    type: awn.string
    title: Фон (путь к изображению)
    description: "awn-storage/assets/attachments/{id}.png"
  awn-appearance:
    type: awn.enum
    title: Тема
    enum:
      - "light"
      - "dark"
    default: light
  awn-system:
    type: awn.boolean
    title: Системная запись
    description: _ungrouped — настройки агентов без группы
    default: false
---

# Группы агентов

UI-группировка на landing: «Работа», «Хобби», «Образование» и т.д.

- **agentIds** — список id агентов через запятую
- **background** — путь к PNG/JPG в `awn-storage/assets/attachments/` этого накопителя
- **appearance** — `light` или `dark`

Системная запись `_ungrouped.md` — настройки для агентов без группы.

Legacy fallback: `awn-agents.json`.

