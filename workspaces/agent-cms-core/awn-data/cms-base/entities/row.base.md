---
awn-id: row.base
awn-created: "2026-08-03T20:03:50.484Z"
awn-updated: "2026-08-03T20:03:50.484Z"
awn-typeId: awn.row.base
awn-title: Элемент
awn-kind: element
awn-domain: base
awn-status: active
awn-extends: awn.base
---
description: Базовый тип «элемент» — одна запись в инфоблоке (файл .md или строка CSV)
awn-fields:
  awn-id:
    type: awn.field.string
    title: ID
    description: Идентификатор элемента (= имя файла без .md)
    locked: true
    group: system
  awn-created:
    type: awn.field.datetime
    title: Создано
    locked: true
    group: system
  awn-updated:
    type: awn.field.datetime
    title: Обновлено
    locked: true
    group: system
field-groups:
  -
    id: system
    name: Системные
    description: Заполняется автоматически
    collapsed: true
