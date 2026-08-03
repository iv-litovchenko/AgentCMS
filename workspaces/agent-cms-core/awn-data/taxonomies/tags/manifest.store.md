---
awn-prop-type: awn.data.collection
awn-prop-id: taxonomies.tags
awn-prop-name: Теги
awn-prop-description: Справочник тегов для awn-tags
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

