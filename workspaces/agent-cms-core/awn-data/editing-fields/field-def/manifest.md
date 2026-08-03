---
awn-type: awn.data.single
awn-id: editing-fields.field-def
awn-name: Мета-схема поля
awn-extends: ../../cms-base/record-base/manifest.md
awn-record:
  storage: md
  file: main.md
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
  awn-fieldId:
    type: awn.string
    title: ID типа
    default: awn.field.base
  awn-extends:
    type: awn.string
    title: Extends
    default: awn.entity
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - "active"
      - "inactive"
    default: active
---

# Мета-схема поля

Singleton `awn.field.base` — properties для инспектора схем.

