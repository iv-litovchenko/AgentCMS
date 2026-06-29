---
AWN-TYPE: "NODE/SOLO"
AWN-TITLE: MetadataFiles — контракт *.metadata.md
AWN-DESC: "Контракт файлов *.metadata.md: что это, правило имени, поля шапки, примеры."
AWN-LOAD: start
AWN-PRIORITY: 20
AWN-TRIGGERS: [metadata.md, sidecar, метаданные медиа, описание файла, бинарник]
AWN-STATUS: active
AWN-MEMORY: none
AWN-AUTOMATIZATION: false
AWN-CRON: "0 9 * * *"
AWN-CATEGORY: system
AWN-VERSION: 1.1.2
AWN-CREATED: 2026-05-05
AWN-UPDATED: 2026-05-07
---

# Sidecar-файлы (`*.metadata.md`)

> [!info] О файле
> Это **нода-контракт** (`*.node.md`, `NODE/SOLO`): правила для файлов `*.metadata.md`. Поле `AWN-LOAD: start` значит, что **именно эта нода** попадает в контекст при старте полной сессии — чтобы агент знал, чем sidecar отличается от ноды и от `*.main.md`. Сами sidecar-файлы по одному при старте **не** подгружаются — только когда работаешь с конкретным бинарником.

## Что такое `*.metadata.md`

Sidecar — текстовое описание бинарного носителя (картинка, аудио, видео, PDF) в той же папке. Агент читает его вместо «немого» бинарника.

**Чем не является:**
- Не `*.node.md` — нет AWN-контракта, в реестр `AGENTS.NODES.md` не попадает
- Не `*.main.md` — нет `AWN-OWNER` с путём к ноде и `AWN-TYPE: "RECORD/MEMORY"`

## Когда создавать

Новый `*.metadata.md` заводится **только по явному запросу пользователя** (описать бинарник, сделать sidecar, метаданные к файлу и т.п.). Без такого запроса не создавать проактивно.

## Правило имени (канон)

Имя = **полное имя носителя** + `.metadata.md`, в **той же папке** что и носитель.

| Носитель | Sidecar |
|----------|---------|
| `Assets/photo.png` | `Assets/photo.png.metadata.md` |
| `Assets/2026-05-05-lecture.mp3` | `Assets/2026-05-05-lecture.mp3.metadata.md` |

## Обязательные поля шапки

```yaml
---
AWN-TYPE: "RECORD/METADATA"
AWN-OWNER: Assets/имя-файла.ext
AWN-STATUS: open
AWN-TITLE: Название файла
AWN-CREATED: YYYY-MM-DD
AWN-UPDATED: YYYY-MM-DD
TAGS: [тег1, тег2]
---
```

## Дополнительные поля (опционально)

| Ключ | Зачем |
|------|-------|
| `mediaKind` | Подсказка агенту: `image`, `audio`, `video`, `document` |
| `summary` | Коротко: что за носитель и зачем в vault |
| `relatedNode` | Если ассет явно относится к одной ноде — путь к `*.node.md` |
| `transcript` / `notes` | Расшифровка аудио/видео, таймкоды |

Тело после `---` — произвольный markdown: детали, ссылки, расшифровки.

## Минимальный пример

```yaml
---
AWN-TYPE: "RECORD/METADATA"
AWN-OWNER: Assets/error-screen.png
AWN-STATUS: open
AWN-TITLE: Скриншот ошибки
AWN-CREATED: 2026-05-05
AWN-UPDATED: 2026-05-05
TAGS: [bug, screenshot]
summary: "Скриншот экрана ошибки — для отчёта о баге."
---

# Скриншот ошибки

> Sidecar (`*.metadata.md`) к файлу `Assets/error-screen.png`.
```

## Пример с привязкой к ноде

```yaml
---
AWN-TYPE: "RECORD/METADATA"
AWN-OWNER: Assets/2026-05-05-past-simple.mp3
AWN-STATUS: open
AWN-TITLE: Лекция — Past Simple (занятие 3)
AWN-CREATED: 2026-05-05
AWN-UPDATED: 2026-05-05
TAGS: [english, grammar, audio]
mediaKind: audio
summary: "Запись лекции по Past Simple — занятие 3."
relatedNode: Domains/EnglishLearning/Index.node.md
transcript: "00:00 — введение, 05:30 — примеры, 18:00 — упражнения"
---

# Лекция — Past Simple (занятие 3)

> Sidecar (`*.metadata.md`) к файлу `Assets/2026-05-05-past-simple.mp3`.
```
