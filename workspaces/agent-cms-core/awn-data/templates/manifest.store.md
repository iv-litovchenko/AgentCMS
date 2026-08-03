---
awn-prop-type: awn.data.collection
awn-prop-id: zagotovki-shablonov
awn-prop-name: Заготовки шаблонов
awn-prop-description: Заготовки шаблонов
awn-prop-extends: ../cms-base/record-base/manifest.store.md
awn-prop-record:
  storage: md
  id-mode: slug
  file: "{id}.md"
  hierarchy: true
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
  awn-title:
    type: awn.string
    title: Название
    required: true
  awn-parent:
    type: awn.string
    title: Родитель
    description: id родительской записи
  awn-target-file:
    type: awn.string
    title: Целевой файл
    description: "Имя системного файла: .env, .gitignore, SKILL.md, AGENTS.md, …"
    required: true
  awn-hint-title:
    type: awn.string
    title: Заголовок подсказки
  awn-hint-text:
    type: awn.string
    title: Текст подсказки
    description: HTML-подсказка в редакторе (кнопка «Вставить шаблон»)
  awn-status:
    type: awn.enum
    title: Статус
    enum:
      - open
      - done
    default: open
---

