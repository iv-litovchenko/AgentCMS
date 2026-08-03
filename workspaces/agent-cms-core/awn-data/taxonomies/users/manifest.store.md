---
awn-prop-type: awn.data.collection
awn-prop-id: taxonomies.users
awn-prop-name: Пользователи
awn-prop-description: Справочник для awn-owner
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
  awn-email:
    type: awn.string
    title: Email
  awn-sort:
    type: awn.integer
    title: Порядок
    default: 0
---

