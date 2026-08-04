---
awn-type: awn.data.collection
awn-id: taxonomies.tags
awn-name: Теги
awn-extends: awn-data/cms-base/entities/row.base.md
awn-record:
  storage: csv
  file: main.csv
  id-mode: slug
  hierarchy: false
awn-fields:
  awn-code:
    type: awn.string
    title: Код (slug)
    required: true
  awn-label:
    type: awn.string
    title: Подпись
    required: true
  awn-sort:
    type: awn.integer
    title: Порядок
    default: 0
---
# Теги

Список тегов workspace — как `#tag` в Obsidian. Поле темы: `awn-tags`. Данные — `main.csv`.
