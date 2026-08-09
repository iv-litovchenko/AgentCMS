---
awn-type: awn.data.single
awn-id: editing-fields.field-def
awn-name: Мета-схема поля
awn-extends: awn-data/cms-base/entities/row.base.md
awn-record:
  storage: md
  file: main.md
awn-fields:
  awn-title:
    type: awn.string
    title: Название
  awn-fieldId:
    type: awn.string
    title: ID типа
    default: awn.field.base
  awn-extends:
    type: awn.string
    title: Extends
    default: awn.table.base
  awn-status:
    type: awn.field.choice.one
    title: Статус
    enum:
      - active
      - inactive
    default: active
---
# Мета-схема поля

Singleton `awn.field.base` — properties для инспектора схем.
