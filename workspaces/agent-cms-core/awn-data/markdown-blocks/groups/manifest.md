---
awn-type: awn.data.collection
awn-id: markdown-blocks.groups
awn-name: Группы блоков
awn-extends: awn-data/cms-base/entities/table.base.md
awn-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
  awn-sort:
    type: awn.integer
    title: Порядок в палитре
    default: 0
---
# Группы блоков

Записи групп палитры: **Структура**, **Текст**, **Списки**, **Код и таблицы**, **AWN**.

Поле `sort` задаёт порядок секций в палитре редактора.
