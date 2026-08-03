---
awn-prop-type: awn.data.collection
awn-prop-id: pages
awn-prop-name: Страницы
awn-prop-description: "Типы узлов дерева (awn.page.*)"
awn-prop-extends: ../cms-base/record-base/manifest.store.md
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
  awn-typeId:
    type: awn.string
    title: ID типа
    required: true
  awn-kind:
    type: awn.string
    title: Kind
  awn-domain:
    type: awn.string
    title: Domain
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - active
      - draft
      - deprecated
      - inactive
    default: active
  awn-extends:
    type: awn.string
    title: Extends
---

