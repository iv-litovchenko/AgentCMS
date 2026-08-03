---
awn-prop-type: awn.data.collection
awn-prop-id: agent-registry.groups
awn-prop-name: Группы агентов
awn-prop-description: UI-группировка агентов на landing
awn-prop-extends: ../../cms-base/record-base/manifest.store.md
awn-prop-record:
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
      - light
      - dark
    default: light
  awn-system:
    type: awn.boolean
    title: Системная запись
    description: _ungrouped — настройки агентов без группы
    default: false
---

