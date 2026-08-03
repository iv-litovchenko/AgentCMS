---
awn-type: awn.data.collection
awn-id: tasks
awn-name: Задачи
awn-extends: awn-data/cms-base/record-base/manifest.md
awn-record:
  id-mode: numeric
  file: "{id}.md"
  hierarchy: true
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
  awn-parent:
    type: awn.string
    title: Родитель
    description: id родительской задачи (иерархия)
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - "open"
      - "in_progress"
      - "done"
      - "cancelled"
    default: open
  awn-priority:
    type: awn.enum
    title: Приоритет
    enum:
      - "low"
      - "normal"
      - "high"
    default: normal
---

# Задачи

Коллекция задач агента — плоский список без привязки к дереву тем.

