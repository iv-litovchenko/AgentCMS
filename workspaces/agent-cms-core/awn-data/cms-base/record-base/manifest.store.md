---
awn-prop-type: awn.data.collection
awn-prop-layer: awn-data-base
awn-prop-description: Базовые поля каждой записи в awn-data (наследуются всеми накопителями)
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

