---
awn-type: awn.data.single
awn-id: settings-global
awn-name: Глобальные настройки
awn-extends: ../cms-base/record-base/manifest.md
awn-record:
  file: main.md
awn-fields:
  awn-id:
    type: awn.string
    title: ID
    description: Идентификатор записи (= имя файла без .md)
    locked: true
  awn-created:
    type: awn.datetime
    title: Создано
  awn-updated:
    type: awn.datetime
    title: Обновлено
  awn-site-name:
    type: awn.string
    title: Название сайта
    default: Agent CMS
  awn-maintenance-mode:
    type: awn.boolean
    title: Режим обслуживания
    default: false
  awn-default-locale:
    type: awn.enum
    title: Язык
    enum:
      - "ru"
      - "en"
    default: ru
---

# Глобальные настройки

Одиночка — ровно одна запись в `main.md` (настройки агента).

Схема накопителя — в `store.yml`.

