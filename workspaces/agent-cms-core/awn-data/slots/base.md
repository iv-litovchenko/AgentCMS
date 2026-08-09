---
awn-id: base
awn-created: "2026-08-03T20:03:50.542Z"
awn-updated: "2026-08-03T20:03:50.542Z"
awn-typeId: awn.slot
awn-title: Слот памяти
awn-kind: slot
awn-domain: slots
awn-status: active
awn-extends: awn.row.base
---
description: Базовый тип слоя памяти у топика
awn-fields:
  awn-storage-driver:
    type: awn.field.choice.one
    title: Драйвер памяти
    description: internal — однофайловая; external — многофайловая; tabular — таблица
    enum:
      - internal
      - external
      - tabular
    default: external
  awn-path:
    type: awn.field.string
    title: Путь
    description: "Подпапка узла (например inbox/)"
    required: true
  awn-allowed-content:
    type: awn.field.array
    title: Разрешённый контент
    description: Какие content-типы можно класть в слот
    items: awn.field.string
  awn-accept-files:
    type: awn.field.array
    title: Принимаемые файлы
    description: "Расширения (.md, .png…)"
    items: awn.field.string
  awn-slot-category:
    type: awn.field.choice.one
    title: Категория
    enum:
      - memory
      - files
      - single-file
      - records
      - communication
  awn-slot-order:
    type: awn.field.integer
    title: Порядок
  awn-slot-tier:
    type: awn.field.choice.one
    title: Уровень
    enum:
      - user
      - system
