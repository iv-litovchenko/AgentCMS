---
awn-type: awn.data.collection
awn-id: editing-fields.fields
awn-name: Поля
awn-extends: awn-data/cms-base/entities/table.base.md
awn-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
  awn-fieldId:
    type: awn.string
    title: ID типа
    description: awn.field.string, awn.field.choice.one…
    required: true
  awn-group:
    type: awn.string
    title: Группа
    description: id из editing-fields/groups
  awn-sort:
    type: awn.integer
    title: Порядок в группе
    default: 0
  awn-widget:
    type: awn.string
    title: Виджет
    required: true
  awn-storage:
    type: awn.string
    title: Storage
  awn-mdbase:
    type: awn.string
    title: MD-base
  awn-format:
    type: awn.string
    title: Формат
  awn-settings:
    type: awn.string
    title: Settings
    description: Список через запятую (hint, required, locked, …)
---
# Поля

Типы полей `awn.field.*` для схем frontmatter и форм.
