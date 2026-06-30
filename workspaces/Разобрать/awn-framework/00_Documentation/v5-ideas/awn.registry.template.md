## Реестр типов  (НЕ АКТУАЛЬНО)

**Описание колонок**
## Реестр типов нод

Паттерн имени файла: `<name>.<type>.md`. Суффикс перед `.md` = тип ноды.
Агент по суффиксу однозначно определяет тип, не открывая файл.

| Слой        | `AWN-TYPE` (тип ноды) | Маска имени файла | Где живёт                  | Описание                                                   | Родитель                 | **Добавляется в реестр нод** |
| ----------- | --------------------- | ----------------- | -------------------------- | ---------------------------------------------------------- | ------------------------ | ---------------------------- |
| 0. Vault    | —                     | —                 | корень                     | Корень хранилища                                           | — (корень)               | —                            |
| 1. Space    | Space                 | `_index.node.md`  | `space-*/`                 | Самостоятельная область знаний (может вкладывать Space)    | Vault, Space             | Да                           |
| 2. Part     | Part                  | `*.node.md`       | внутри Space               | Атомарная самостоятельная сущность                         | Space                    | Да                           |
| 3. Memory   | Note                  | `*.note.md`       | `inbox/` или `notes/`      | Сырая входящая заметка (поток времени)                     | Space                    | Нет                          |
| 3. Memory   | Page                  | `*.page.md`       | `pages/`                   | Переработанное знание (страница книги)                     | Space                    | Нет                          |
| 3. Memory   | Row                   | `*.row.md`        | `databases/<type>/`        | Строка таблицы базы данных                                 | Space                    | Нет                          |
| 3. Memory   | Sidecar               | `*.sidecar.md`    | рядом с не-md файлом       | Описание не-md файла (медиа, документ, бинарь)             | Space (спутник external) | Нет                          |
| 3. Memory   | Volume                | `*.volume.md`     | рядом с родительской нодой | Приватная память ноды (грузится по запросу)                | Space, Part (спутник)    | Нет                          |
| 4. View     | View                  | `*.view.md`       | `views/<type>/`            | Проекция над слоями 1–3, 5 (list/kanban/dashboard/mindmap) | Space                    | Нет                          |
| 5. External | —                     | любые             | в любой области            | Не-ноды: медиа, бинари, скрипты, конфиги, `*.md` без типа  | Space                    | Нет                          |


### Пример путей

```
awn-spaces/space-life/_index.node.md
awn-spaces/space-life/space-health/_index.node.md
awn-spaces/space-life/space-health/inbox/
awn-spaces/space-life/space-health/pages/
awn-spaces/space-life/space-health/databases/default/
awn-spaces/space-life/space-health/views/tasks/
awn-spaces/space-work/_index.node.md
awn-spaces/space-work/notes/
```

