---
awn-id: base
awn-created: "2026-08-03T20:03:50.508Z"
awn-updated: "2026-08-03T20:03:50.508Z"
awn-typeId: awn.page.base
awn-title: База страницы
awn-kind: base
awn-domain: pages
awn-status: active
awn-extends: awn.row.base
---
description: Узел дерева (ws/section/topic) — база awn.row.base плюс навигация и runtime
mixins:
  - awn.mixin.preview
  - awn.mixin.runtime
field-groups:
  -
    id: content
    name: Основное
    description: Что заполняет человек или агент
    collapsed: false
  -
    id: nav
    name: Дерево и вид
    description: Поведение в меню и на главной (для узлов дерева)
    collapsed: true
  -
    id: runtime
    name: Runtime агента
    description: "Загрузка в контекст, cron, heartbeat"
    collapsed: true
  -
    id: system
    name: Системные
    description: "Заполняется автоматически, только чтение"
    collapsed: true
fields:
  awn-main:
    type: awn.field.boolean
    title: На главной
    default: false
    group: nav
  awn-category:
    type: awn.field.string
    title: Категория
    group: nav
  awn-owner:
    type: awn.field.string
    title: Владелец
    group: nav
  awn-priority:
    type: awn.field.string
    title: Приоритет
    group: nav
  awn-color:
    type: awn.field.color
    title: Цвет
    group: nav
  awn-sort:
    type: awn.field.integer
    title: Сортировка
    group: nav
