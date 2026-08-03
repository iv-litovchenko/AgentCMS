---
awn-prop-type: awn.data.collection
awn-prop-id: markdown-blocks.blocks
awn-prop-name: MD-Блоки
awn-prop-description: "Блоки палитры редактора — awn.block.* с шаблоном в теле записи"
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
  awn-blockId:
    type: awn.string
    title: ID типа
    description: "awn.block.h2, awn.block.quote…"
    required: true
  awn-group:
    type: awn.string
    title: Группа палитры
    description: id из markdown-blocks/groups
  awn-sort:
    type: awn.integer
    title: Порядок в группе
    default: 0
  awn-icon:
    type: awn.string
    title: Иконка
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - active
      - draft
      - inactive
    default: active
  awn-render:
    type: awn.enum
    title: Рендер
    enum:
      - template
      - fence
    default: template
  awn-fenceTag:
    type: awn.string
    title: Fence-тег
  awn-renderer:
    type: awn.string
    title: JS-рендер
  awn-extends:
    type: awn.string
    title: Extends
    default: awn.block.base
---

