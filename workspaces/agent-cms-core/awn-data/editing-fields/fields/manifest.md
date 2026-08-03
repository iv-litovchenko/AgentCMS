---
awn-type: awn.data.collection
awn-id: editing-fields.fields
awn-name: Поля
awn-extends: ../../cms-base/record-base/manifest.md
awn-record:
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
  awn-fieldId:
    type: awn.string
    title: ID типа
    description: "awn.field.string, awn.field.enum…"
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
  awn-extends:
    type: awn.string
    title: Extends
    default: awn.field.base
  awn-settings:
    type: awn.string
    title: Settings
    description: "Список через запятую (hint, required, locked, …)"
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - "active"
      - "draft"
      - "inactive"
    default: active
---

# Поля

Типы полей `awn.field.*` для схем frontmatter и форм.

