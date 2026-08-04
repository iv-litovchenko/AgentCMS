---
awn-id: table.base
awn-created: "2026-08-03T20:03:50.483Z"
awn-updated: "2026-08-03T20:03:50.483Z"
awn-typeId: awn.table.base
awn-title: Инфоблок
awn-kind: iblock
awn-domain: base
awn-status: active
awn-extends: awn.base
---
description: Базовый тип «инфоблок» — коллекция с manifest (настройки + свойства) и элементами (*.md)
awn-store-extends: awn-data/cms-base/entities/row.base.md
awn-manifest-keys:
  awn-type:
    title: awn-type
    description: "Тип: awn.data.collection | awn.data.group | awn.data.single"
  awn-id:
    title: awn-id
    description: Уникальный ID инфоблока
  awn-name:
    title: awn-name
    description: Название в UI
  awn-extends:
    title: awn-extends
    description: Наследование схемы от родительского типа
  awn-record:
    title: awn-record
    description: "Хранение элементов: id-mode, file, hierarchy"
  awn-fields:
    title: awn-fields
    description: Свойства элементов инфоблока
awn-fields:
  awn-title:
    type: awn.field.string
    title: Название
    required: true
  awn-typeId:
    type: awn.field.string
    title: ID типа
    required: true
  awn-kind:
    type: awn.field.string
    title: Kind
  awn-domain:
    type: awn.field.string
    title: Domain
  awn-status:
    type: awn.field.enum
    title: Статус
    enum:
      - active
      - draft
      - deprecated
      - inactive
    default: active
  awn-extends:
    type: awn.field.string
    title: Extends
