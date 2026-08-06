---
awn-super-type: awn-data/cms-base/data-elements/manifest.md
awn-name: Element default
awn-description: Базовая схема полей для любой записи

awn-data-elements-schema:
  fields:
    awn-created:
      type: awn.field.datetime
      title: Создано
    awn-updated:
      type: awn.field.datetime
      title: Обновлено
    awn-name:
      type: awn.field.string
      title: Имя
    awn-description:
      type: awn.field.text
      title: Описание
    awn-status:
      type: awn.field.string
      title: Статус
    awn-version:
      type: awn.field.integer
      title: Версия
    awn-owner:
      type: awn.field.string
      title: Владелец
  tabs:
    system: Системное
---
# data-elements.default

Type id = **`awn-data/cms-base/data-elements/default.md`**
