---
awn-type: awn.data.collection
awn-id: taxonomies.categories
awn-name: Категории
awn-extends: awn-data/cms-base/table-base/manifest.md
awn-record:
  storage: csv
  file: main.csv
  id-mode: slug
  hierarchy: false
awn-fields:
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
# Категории

Справочник категорий для `awn-category`. Данные — `main.csv`.
