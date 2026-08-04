---
awn-type: awn.data.collection
awn-id: editing-fields.groups
awn-name: Группы полей
awn-extends: awn-data/cms-base/table-base/manifest.md
awn-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
  awn-title:
    type: awn.string
    title: Название
    required: true
  awn-sort:
    type: awn.integer
    title: Порядок
    default: 0
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - active
      - inactive
    default: active
---
# Группы полей

Категории типов полей в каталоге `editing-fields/fields/`.
