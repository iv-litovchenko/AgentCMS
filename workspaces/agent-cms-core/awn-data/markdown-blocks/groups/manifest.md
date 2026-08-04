---
awn-type: awn.data.collection
awn-id: markdown-blocks.groups
awn-name: Группы блоков
awn-extends: awn-data/cms-base/entities/table-base/manifest.md
awn-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
  awn-title:
    type: awn.string
    title: Название
    required: true
  awn-sort:
    type: awn.integer
    title: Порядок в палитре
    default: 0
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - active
      - inactive
    default: active
---
# Группы блоков

Записи групп палитры: **Структура**, **Текст**, **Списки**, **Код и таблицы**, **AWN**.

Поле `sort` задаёт порядок секций в палитре редактора.
