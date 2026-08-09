---
awn-id: base
awn-created: "2026-08-03T20:03:50.572Z"
awn-updated: "2026-08-03T20:03:50.572Z"
awn-typeId: awn.settings.base
awn-title: База настройки
awn-kind: base
awn-domain: settings
awn-status: active
awn-extends: awn.row.base
---
description: Базовый тип настройки
awn-fields:
  awn-scope:
    type: awn.field.choice.one
    title: Область
    description: К чему относится настройка
    enum:
      - agent
      - workspace
      - ui
    default: agent
  awn-value:
    type: awn.field.string
    title: Значение
  awn-enabled:
    type: awn.field.boolean
    title: Включено
    default: true
