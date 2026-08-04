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
description:
properties:
  scope:
    title: Область
    description: К чему относится настройка
    enum:
      - agent
      - workspace
      - ui
    default: agent
  value:
    title: Значение
    description: Значение настройки (строка / число / флаг)
  enabled:
    title: Включено
    description: Активна ли настройка
    widget: checkbox
    default: true
