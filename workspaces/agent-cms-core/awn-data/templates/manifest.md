---
awn-type: awn.data.collection
awn-id: zagotovki-shablonov
awn-name: Заготовки шаблонов
awn-extends: awn-data/cms-base/entities/row.base.md
awn-record:
  storage: md
  id-mode: slug
  file: "{id}.md"
  hierarchy: true
awn-fields:
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
# Заготовки шаблонов

Коллекция `zagotovki-shablonov` в `awn-data/templates/`.

Каждая запись `{slug}.md` (например `gitignore.md`, `skill.md`):
- `target-file` — имя системного файла (`.env`, `SKILL.md`, …)
- `hint-title` / `hint-text` — подсказка и кнопка «Вставить шаблон» в редакторе
- тело файла — содержимое шаблона для вставки
