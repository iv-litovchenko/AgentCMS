---
awn-prop-type: awn.data.collection
awn-prop-id: taxonomies.colors
awn-prop-name: Палитра
awn-prop-description: Brand-цвета для awn-color
awn-prop-extends: ../../cms-base/record-base/manifest.store.md
awn-prop-record:
  storage: csv
  file: main.csv
  id-mode: slug
  hierarchy: false
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
  awn-code:
    type: awn.string
    title: Код
    required: true
  awn-label:
    type: awn.string
    title: Подпись
    required: true
  awn-emoji:
    type: awn.string
    title: Эмодзи
  awn-color:
    type: awn.color
    title: Цвет
  awn-sort:
    type: awn.integer
    title: Порядок
    default: 0
---

