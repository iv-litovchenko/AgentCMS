---
awn-type: awn.data.base
awn-layer: awn-data-table
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

# table.base

Технический контракт `awn-extends` для накопителей. Канон типов — `base.md`, `table.base.md`, `row.base.md` в этой папке.
