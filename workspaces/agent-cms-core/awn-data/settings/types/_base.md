---
id: _base
created: "2026-08-03T20:03:50.572Z"
updated: "2026-08-03T20:03:50.572Z"
typeId: awn.settings.base
title: "База настройки"
kind: base
domain: settings
status: active
extends: awn.entity
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
