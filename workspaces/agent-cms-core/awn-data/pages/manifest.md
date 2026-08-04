---
awn-type: awn.data.collection
awn-id: pages
awn-name: Страницы
awn-extends: awn-data/cms-base/entities/table-base/manifest.md
awn-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
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
# Страницы

Типы узлов дерева меню — `awn.page.*`.
