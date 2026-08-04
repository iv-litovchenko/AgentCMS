---
awn-id: table.base
awn-created: "2026-08-03T20:03:50.483Z"
awn-updated: "2026-08-03T20:03:50.483Z"
awn-typeId: awn.table.base
awn-title: База таблицы
awn-kind: table
awn-domain: base
awn-status: active
awn-extends: awn.base
---
description: Шаблон накопителя (таблицы) — от него наследуют entities, pages, content, slots…
awn-store-extends: awn-data/cms-base/entities/row.base.md
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
