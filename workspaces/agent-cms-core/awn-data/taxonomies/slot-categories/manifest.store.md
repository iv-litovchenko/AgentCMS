---
awn-prop-type: awn.data.collection
awn-prop-id: taxonomies.slot-categories
awn-prop-name: Категории слотов
awn-prop-description: "Группы слотов в каталоге типов (Память, Файлы, …). Поле слота — slot-category."
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

