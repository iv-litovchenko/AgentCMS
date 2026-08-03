---
awn-prop-type: awn.data.collection
awn-prop-id: slots
awn-prop-name: Слоты
awn-prop-description: "Слоты хранения топика (awn.slot.*)"
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
  awn-slot-category:
    type: awn.enum
    title: Категория
    enum:
      - memory
      - files
      - single-file
      - records
      - communication
    default: memory
  awn-storage-driver:
    type: awn.enum
    title: Драйвер памяти
    enum:
      - internal
      - external
      - tabular
    default: external
  awn-path:
    type: awn.string
    title: Путь
    description: Подпапка в topic/awn-storage/ (например inbox/)
    required: true
  awn-allowed-content:
    type: awn.string
    title: Разрешённый контент
    description: "Список awn.content.* — в frontmatter или в теле записи"
  awn-accept-files:
    type: awn.string
    title: Принимаемые файлы
    description: "Шаблоны расширений (*, .md, .png) — в frontmatter или в теле"
  awn-slot-order:
    type: awn.integer
    title: Порядок
    description: Сортировка внутри категории
  awn-slot-tier:
    type: awn.enum
    title: Уровень
    enum:
      - user
      - system
    default: user
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

