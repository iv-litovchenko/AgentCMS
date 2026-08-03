---
id: _base
created: "2026-08-03T20:03:50.542Z"
updated: "2026-08-03T20:03:50.542Z"
typeId: awn.slot
title: "Слот памяти"
kind: slot
domain: slots
status: active
extends: awn.entity
---
description: Базовый тип слоя памяти у топика
properties:
  storage-driver:
    title: Драйвер памяти
    description:
      узла: internal — Однофайловая (один .md на слот); external — Многофайловая
    enum:
      - internal
      - external
      - tabular
    default: external
  path:
    title: Путь
    description: "Подпапка узла, куда складывается контент слота (например inbox/)"
    required: true
  allowed-content:
    title: Разрешённый контент
    type: list
    description: Какие content-типы можно класть в слот (awn.content.record…)
  accept-files:
    title: Принимаемые файлы
    type: list
    description: "Расширения файлов, допустимые в слоте (.md, .png…)"
  slot-category:
    title: Категория
    description: Группа слота в каталоге (см. awn-system/slot-categories.yml)
    enum:
      - memory
      - files
      - single-file
      - records
      - communication
  slot-order:
    title: Порядок
    type: integer
    description: Сортировка внутри категории
  slot-tier:
    title: Уровень
    description: "system — служебный слот, управляется runtime"
    enum:
      - user
      - system
