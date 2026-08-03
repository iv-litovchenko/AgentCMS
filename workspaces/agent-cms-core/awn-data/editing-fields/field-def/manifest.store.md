---
awn-prop-type: awn.data.single
awn-prop-id: editing-fields.field-def
awn-prop-name: Мета-схема поля
awn-prop-description: awn.field.base — properties для описания полей в схемах
awn-prop-extends: ../../cms-base/record-base/manifest.store.md
awn-prop-record:
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
      - active
      - inactive
    default: active
---

