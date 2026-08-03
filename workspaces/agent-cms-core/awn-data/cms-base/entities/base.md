---
awn-id: base
awn-created: "2026-08-03T20:03:50.487Z"
awn-updated: "2026-08-03T20:03:50.487Z"
awn-typeId: awn.base
awn-title: База сущности
awn-kind: base
awn-domain: base
awn-status: active
awn-extends: awn.entity
---
description:
  Общие поля любого контента и узла: отображение и системные. Узлы дерева
mixins:
  - awn.mixin.preview
  - awn.mixin.web-url
field-groups:
  -
    id: content
    name: Основное
    description: Что заполняет человек или агент
    collapsed: false
  -
    id: system
    name: Системные
    description: "Заполняется автоматически, только чтение"
    collapsed: true
fields:
  awn-name:
    type: awn.field.string
    title: Имя
    description: Отображаемое имя в меню
    group: content
    locked: true
  awn-emoji:
    type: awn.field.string
    title: Эмодзи
    description: "Показывается вместо иконки, если превью не задано"
    group: content
  awn-status:
    type: awn.field.enum
    title: Статус
    group: content
    enum:
      -
        key: open
        name: 🟢 Открыта
      -
        key: draft
        name: 🟡 Черновик
      -
        key: closed
        name: 🔴 Закрыта
      -
        key: none
        name: ⚪ Без статуса
    default: open
  awn-description:
    type: awn.field.text
    title: Описание
    group: content
  awn-tags:
    type: awn.field.array
    title: Теги
    items: awn.field.string
    group: content
  awn-type:
    type: awn.field.string
    title: Тип
    required: true
    locked: true
    group: system
  awn-create:
    type: awn.field.datetime
    title: Создан
    locked: true
    group: system
  awn-update:
    type: awn.field.datetime
    title: Изменён
    locked: true
    group: system
  awn-version:
    type: awn.field.integer
    title: Версия
    default: 1
    locked: true
    group: system
