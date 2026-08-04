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
description: Шаблон накопителя (таблицы) в awn-data — от него наследуют tasks, taxonomies, agents…
properties:
  type:
    title: Тип накопителя
    description: "awn.data.collection | awn.data.single | awn.data.group"
  record:
    title: Правила записи
    description: storage, id-mode, file, hierarchy
  fields:
    title: Схема строк
    description: awn-fields — локальные поля записей таблицы
