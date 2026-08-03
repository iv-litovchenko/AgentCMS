---
id: topic
created: "2026-08-03T20:03:50.533Z"
updated: "2026-08-03T20:03:50.533Z"
typeId: awn.page.topic
title: "Тема"
kind: type
domain: pages
status: active
extends: awn.page.base
---
description: Тема — manifest.md + слоты памяти
storage-slots:
  - main
  - main-single
  - main-single-csv
  - inbox
  - note
  - references
  - artefacts
  - assets
  - media
  - repository
  - scripts
  - todo-single
  - log-single
manifest-pattern: "{slug}/manifest.md"
fields:
  awn-slots-disabled:
    type: awn.field.boolean
    title: Общий слот (lite)
    description: "Скрыть слоты данных; многофайловая память читается из папки темы (рядом с manifest.md), без awn-storage/"
    default: false
    group: nav
