---
awn-supertype: awn-data/cms-base/data-containers/collection.md
awn-name: Задачи

awn-record-id-mode: numeric
awn-record-file: "{id}.md"
awn-record-hierarchy: true

awn-data-elements-schema-extends: awn-data/cms-base/data-elements/default.md
awn-data-elements-schema-mixins: []
awn-data-elements-schema:
  fields:
    awn-title:
      type: awn.string
      title: Название
      required: true
      tab: main
    awn-parent:
      type: awn.string
      title: Родитель
      description: id родительской задачи
      tab: main
    awn-status:
      type: awn.enum
      title: Статус
      enum: [open, in_progress, done, cancelled]
      default: open
      tab: main
    awn-priority:
      type: awn.enum
      title: Приоритет
      enum: [low, normal, high]
      default: normal
      tab: main
  tabs:
    main: Задача
---
# Задачи

Store id = **`awn-data/tasks`**.
