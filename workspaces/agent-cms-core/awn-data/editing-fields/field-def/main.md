---
id: field-def
created: "2026-08-03T00:00:00.000Z"
updated: "2026-08-03T00:00:00.000Z"
title: База поля
fieldId: awn.field.base
extends: awn.table.base
status: active
---

Базовые мета-свойства любого поля

properties:
  type:
    title: "Тип данных"
    description: "ID типа поля (awn.field.string, awn.field.choice.one…)"
    required: true
  name:
    title: "Название"
    description: "Подпись поля в форме (человекочитаемое)"
    required: true
  description:
    title: "Описание"
    description: "Развёрнутое пояснение для схемы и документации"
    type: "awn.field.text"
  hint:
    title: "Подсказка"
    description: "Краткая подсказка в UI (placeholder, title)"
    type: "awn.field.string"
  required:
    type: "awn.field.boolean"
    title: "Обязательное"
    default: false
  locked:
    type: "awn.field.boolean"
    title: "Заблокированное"
    description: "Только чтение в форме"
    default: false
  format:
    title: "Формат"
    description: "Пример или шаблон заполнения (YYYY-MM-DD, 0.0.1)"
    type: "awn.field.string"
  default:
    title: "По умолчанию"
    description: "Значение при создании"
    type: "awn.field.string"
  widget:
    title: "Виджет"
    description: "Переопределить виджет по умолчанию для этого типа"
    type: "awn.field.string"
  enum:
    title: "Варианты"
    description: "Список key/name для awn.field.choice.one и awn.field.choice.many"
  items:
    title: "Тип элементов"
    description: "Тип элементов для awn.field.array (awn.field.string, awn.field.relation.one…)"
    type: "awn.field.string"
