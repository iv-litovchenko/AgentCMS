---
awn-id: runtime
awn-created: "2026-08-03T20:03:50.566Z"
awn-updated: "2026-08-03T20:03:50.566Z"
awn-typeId: awn.mixin.runtime
awn-title: Runtime
awn-kind: mixin
awn-domain: mixins
awn-status: active
---
description: "Загрузка в контекст агента, cron, heartbeat, команды"
awn-fields:
  awn-runtime-load-always:
    type: awn.field.boolean
    title: Всегда в контексте
    group: runtime
    description: Тема всегда в контексте агента; иначе — только по запросу (по умолчанию)
    default: false
  awn-runtime-heartbeat:
    type: awn.field.boolean
    title: Heartbeat
    group: runtime
  awn-runtime-cron:
    type: awn.field.boolean
    title: "Тип расписания (выполнение по расписанию)"
    group: runtime
  awn-runtime-cron-schedule:
    type: awn.field.string
    title: Расписание cron
    group: runtime
    description: "День и время, шаблон или своё cron-выражение"
  awn-runtime-commands:
    type: awn.field.boolean
    title: Выполнение команд
    group: runtime
    description: В инструкции темы есть команды для выполнения (визуальный маркер)
    default: false
