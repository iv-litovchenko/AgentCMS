---
awn-id: topic
awn-created: "2026-08-03T20:03:50.533Z"
awn-updated: "2026-08-03T20:03:50.533Z"
awn-typeId: awn.page.topic
awn-title: Тема
awn-kind: type
awn-domain: pages
awn-status: active
awn-extends: awn.page.base
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
