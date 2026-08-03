---
awn-type: awn.data.collection
awn-id: content
awn-name: Контент
awn-extends: awn-data/cms-base/record-base/manifest.md
awn-record:
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
      - "active"
      - "draft"
      - "deprecated"
      - "inactive"
    default: active
awn-extends: awn-data/cms-base/record-base/manifest.md
    type: awn.string
    title: Extends
---

# Контент

Типы записей в слотах — `awn.content.*`.

