---
awn-id: dialog
awn-created: "2026-08-03T20:03:50.537Z"
awn-updated: "2026-08-03T20:03:50.537Z"
awn-typeId: awn.content.dialog
awn-title: Сообщение диалога
awn-kind: type
awn-domain: content
awn-status: active
awn-extends: awn.base
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
