---
awn-type: awn.data.collection
awn-id: markdown-blocks.blocks
awn-name: MD-Блоки
awn-extends: awn-data/cms-base/table-base/manifest.md
awn-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
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
# MD-Блоки

Каждая запись — один блок палитры редактора.

- **blockId** — стабильный awn.block.*
- **group** — секция палитры (structure, text, …)
- **template** — текст вставки в теле .md (после frontmatter)
- **status: active** — блок показывается в палитре
