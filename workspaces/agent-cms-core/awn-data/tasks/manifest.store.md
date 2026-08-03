---
awn-prop-type: awn.data.collection
awn-prop-id: tasks
awn-prop-name: Задачи
awn-prop-description: Коллекция задач — плоские и вложенные записи
awn-prop-extends: ../cms-base/record-base/manifest.store.md
awn-prop-record:
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
      - open
      - in_progress
      - done
      - cancelled
    default: open
  awn-priority:
    type: awn.enum
    title: Приоритет
    enum:
      - low
      - normal
      - high
    default: normal
---

