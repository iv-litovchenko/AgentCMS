---
awn-id: dialog
awn-created: "2026-08-03T20:03:50.537Z"
awn-updated: "2026-08-03T20:03:50.537Z"
awn-typeId: awn.content.dialog
awn-title: Сообщение диалога
awn-kind: type
awn-domain: content
awn-status: active
awn-extends: awn.row.base
---
description: Одно сообщение в слоте thread/ (awn.slot.dialogs) — диалог с агентом
slot: dialogs
awn-fields:
  awn-role:
    type: awn.field.enum
    title: Роль
    enum:
      -
        key: user
        title: Пользователь
      -
        key: assistant
        title: Ассистент
      -
        key: system
        title: Система
