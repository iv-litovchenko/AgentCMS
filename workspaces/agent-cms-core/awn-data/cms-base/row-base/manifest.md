---
awn-type: awn.data.base
awn-layer: awn-data-row
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
---

# row.base

Базовые поля строки в awn-data. Канон — `cms-base/entities/row.base.md` (`awn.row.base`).
