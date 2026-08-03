---
awn-type: awn.data.collection
awn-id: taxonomies.tags
awn-name: Теги
awn-extends: ../../cms-base/record-base/manifest.md
awn-record:
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

