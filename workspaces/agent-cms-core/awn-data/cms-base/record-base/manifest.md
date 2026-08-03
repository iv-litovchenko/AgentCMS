---
awn-type: awn.data.collection
awn-layer: awn-data-base
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

# _base

Базовые поля каждой записи в awn-data (наследуются всеми накопителями)

