---
awn-supertype: awn-data/cms-base/data-containers/collection.md
awn-name: Пресеты

awn-record-id-mode: slug
awn-record-file: "{id}.md"
awn-record-hierarchy: false

awn-data-elements-schema-extends: awn-data/cms-base/data-elements/default.md
awn-data-elements-schema-mixins: []
awn-data-elements-schema:
  fields:
    awn-title:
      type: awn.string
      title: Название
      required: true
      tab: main
    awn-preset-id:
      type: awn.string
      title: ID пресета
      required: true
      tab: main
    awn-target-file:
      type: awn.string
      title: Целевой файл
      required: true
      tab: main
    awn-hint-title:
      type: awn.string
      title: Подсказка — заголовок
      tab: main
    awn-hint-text:
      type: awn.string
      title: Подсказка — текст
      tab: main
    awn-status:
      type: awn.field.choice.one
      title: Статус
      enum: [active, draft, deprecated, inactive]
      default: active
      tab: main
    awn-sort:
      type: awn.number
      title: Порядок
      default: 0
      tab: main
  tabs:
    main: Пресет
---
# Пресеты

Store id = **awn-data/system-presets**.

Заготовки содержимого файлов workspace (.env, SKILL.md, AGENTS.md, промпты Shell).

Используются UI «Вставить шаблон» и API GET /api/system-file-templates.
