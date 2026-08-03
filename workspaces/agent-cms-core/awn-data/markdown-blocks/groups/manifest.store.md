---
awn-prop-type: awn.data.collection
awn-prop-id: markdown-blocks.groups
awn-prop-name: Группы блоков
awn-prop-description: "Группы палитры блоков редактора (structure, text, lists…)"
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
  awn-sort:
    type: awn.integer
    title: Порядок в палитре
    default: 0
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - active
      - inactive
    default: active
---

