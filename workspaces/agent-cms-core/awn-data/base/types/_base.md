---
id: _base
created: "2026-08-03T20:03:50.482Z"
updated: "2026-08-03T20:03:50.482Z"
typeId: awn.entity
title: "Сущность CMS"
kind: entity
domain: base
status: active
---
description: "Корневой тип platform — от него наследуют pages, content, fields, md-blocks"
properties:
  id:
    title: Идентификатор
    description: "Стабильный id типа (awn.topic, awn.string, awn.block.h2…)"
    required: true
  name:
    title: Название
    description: Человекочитаемое имя
  description:
    title: Описание
    description: Назначение типа
  extends:
    title: Родитель
    description: id типа-родителя в цепочке наследования
  status:
    title: Статус
    description: active — в runtime; draft/disabled — скрыт
  kind:
    title: Класс
    description: entity · type · field · block · slot
