---
AWN-TYPE: "NODE/SOLO"
AWN-TITLE: MemoryFiles — контракт *.main.md
AWN-DESC: "Контракт файлов *.main.md: что это, обязательные поля шапки, как создавать и обновлять."
AWN-LOAD: start
AWN-PRIORITY: 20
AWN-TRIGGERS: [main.md, файл памяти, внешняя память, memory record]
AWN-STATUS: active
AWN-MEMORY: none
AWN-AUTOMATIZATION: false
AWN-CRON: "0 9 * * *"
AWN-CATEGORY: system
AWN-VERSION: 1.1.0
AWN-CREATED: 2026-05-05
AWN-UPDATED: 2026-05-05
---

# Файлы памяти (`*.main.md`)

> [!info] О файле
> Нода (`*.node.md`, `NODE/SOLO`): полный контракт файлов `*.main.md`. Загружается при старте — агент всегда знает как работать с внешней памятью нод.

## Что такое `*.main.md`

Файл внешней памяти — лог событий, сессий, прогресса или фактов, принадлежащий конкретной ноде (`*.node.md`). Это **не** нода и **не** sidecar — в реестр `AGENTS.NODES.md` не попадает.

**Чем не является:**
- Не `*.node.md` — нет AWN-контракта поведения агента
- Не `*.metadata.md` — не описывает бинарный файл

## Обязательные поля шапки

```yaml
---
AWN-TYPE: "RECORD/MEMORY"
AWN-OWNER: Путь/К/Ноде.node.md
AWN-STATUS: open
AWN-TITLE: Название записи
AWN-CREATED: YYYY-MM-DD
AWN-UPDATED: YYYY-MM-DD
TAGS: [тег1, тег2]
---
```

| Поле | Значения | Назначение |
|------|----------|------------|
| `AWN-TYPE` | `"RECORD/MEMORY"` | Тип файла — всегда первым |
| `AWN-OWNER` | путь к `*.node.md` | Нода-владелец этой записи |
| `AWN-STATUS` | `open` / `close` | Активна ли запись |
| `AWN-TITLE` | строка | Человекочитаемое название |
| `AWN-CREATED` | `YYYY-MM-DD` | Дата создания |
| `AWN-UPDATED` | `YYYY-MM-DD` | Дата последнего обновления |
| `TAGS` | список | Теги для поиска |

## Правило имени

Формат: `YYYY-MM-DD.main.md` — один файл на дату или сессию. Лежит в папке `Memory/` домена или рядом с нодой-владельцем.

## Как создавать и обновлять

- Агент создаёт файл по явному запросу пользователя («запиши», «зафиксируй», «сохрани»)
- Тело после `---` — произвольный markdown: факты, таблицы, списки
- При обновлении — обновить `AWN-UPDATED`
- Если запись закрыта — `AWN-STATUS: close`, не удалять
