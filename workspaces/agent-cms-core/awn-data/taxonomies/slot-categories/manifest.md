---
awn-type: awn.data.collection
awn-id: taxonomies.slot-categories
awn-name: Категории слотов
awn-extends: awn-data/cms-base/table-base/manifest.md
awn-record:
  storage: csv
  file: main.csv
  id-mode: slug
  hierarchy: false
awn-fields:
  awn-code:
    type: awn.string
    title: Код (id)
    required: true
  awn-label:
    type: awn.string
    title: Название
    required: true
  awn-sort:
    type: awn.integer
    title: Порядок
    default: 0
  awn-description:
    type: awn.string
    title: Описание
---
# Категории слотов

Группы для поля `slot-category` у типов `awn.slot.*`. Данные — `main.csv`.
