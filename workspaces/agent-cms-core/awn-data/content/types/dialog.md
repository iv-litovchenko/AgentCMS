---
id: dialog
created: "2026-08-03T20:03:50.537Z"
updated: "2026-08-03T20:03:50.537Z"
typeId: awn.content.dialog
title: "Сообщение диалога"
kind: type
domain: content
status: active
extends: awn.base
---
description: Одно сообщение в слоте thread/ (awn.slot.dialogs) — диалог с агентом
slot: dialogs
fields:
  awn-role:
    type: awn.field.enum
    name: Роль
    enum:
      -
        key: user
        name: Пользователь
      -
        key: assistant
        name: Ассистент
      -
        key: system
        name: Система
