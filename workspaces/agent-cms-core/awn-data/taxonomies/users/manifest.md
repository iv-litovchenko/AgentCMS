---
awn-type: awn.data.collection
awn-id: taxonomies.users
awn-name: Пользователи
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
  awn-email:
    type: awn.string
    title: Email
  awn-sort:
    type: awn.integer
    title: Порядок
    default: 0
---
# Пользователи

Справочник для `awn-owner`. Данные — `main.csv`.
