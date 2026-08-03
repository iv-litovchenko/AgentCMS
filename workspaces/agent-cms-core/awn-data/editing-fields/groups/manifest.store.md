---
awn-prop-type: awn.data.collection
awn-prop-id: editing-fields.groups
awn-prop-name: Группы полей
awn-prop-description: Категории типов полей в каталоге и палитре
awn-prop-extends: ../../cms-base/record-base/manifest.store.md
awn-prop-record:
  id-mode: slug
  file: "{id}.md"
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
  awn-title:
    type: awn.string
    title: Название
    required: true
  awn-sort:
    type: awn.integer
    title: Порядок
    default: 0
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - active
      - inactive
    default: active
---

