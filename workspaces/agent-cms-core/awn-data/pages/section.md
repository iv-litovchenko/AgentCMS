---
awn-id: section
awn-created: "2026-08-08T15:12:00.000Z"
awn-updated: "2026-08-08T15:12:00.000Z"
awn-typeId: awn.page.section
awn-title: Секция
awn-kind: type
awn-domain: pages
awn-status: active
awn-extends: awn.page.base
---
description: "Служебная секция workspace — только в корне агента. Создаётся через UI (awn-agent-kit, awn-shared, awn-container). Не для областей контента внутри awn-container."
manifest-pattern: "{slug}/manifest.md"
storage-slots: []
awn-fields:
  awn-section-bg:
    type: awn.field.color
    title: Цвет фона
    description: Фон секции в меню workspace
    group: nav
  awn-section-border:
    type: awn.field.color
    title: Цвет бордюра
    description: Обводка секции в меню workspace
    group: nav
