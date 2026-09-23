# Оглавление инфоблоков

| ID | Тип | Путь | Название | Описание | Размер | Строк* | Важность* | Записей | Конфигурации |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| — | group | `awn-database/agent-registry` | [Реестр агентов](awn-database/agent-registry/manifest.md) | Реестр агентов | 547 B | 16 | 0 | 14 | 2 влож. |
| — | collection | `awn-database/agent-registry/agent-groups` | [Группы агентов](awn-database/agent-registry/agent-groups/manifest.md) | Группы агентов | 687 B | 19 | 0 | 6 | MD |
| — | collection | `awn-database/agent-registry/agents` | [Агенты](awn-database/agent-registry/agents/manifest.md) | Агенты | 744 B | 20 | 0 | 8 | MD |
| — | collection | `awn-database/tasks` | [Задачи](awn-database/tasks/manifest.md) | Задачи | 322 B | 13 | 0 | 6 | MD |
| — | group | `awn-database/taxonomies` | [Таксономии (справочники)](awn-database/taxonomies/manifest.md) | Таксономии (справочники) | 728 B | 18 | 0 | 278 | 6 влож. |
| — | collection | `awn-database/taxonomies/categories` | [Категории](awn-database/taxonomies/categories/manifest.md) | Категории | 319 B | 13 | 0 | 34 | CSV |
| — | collection | `awn-database/taxonomies/colors` | [Палитра](awn-database/taxonomies/colors/manifest.md) | Палитра | 298 B | 13 | 0 | 6 | CSV |
| — | collection | `awn-database/taxonomies/priorities` | [Приоритеты](awn-database/taxonomies/priorities/manifest.md) | Приоритеты | 304 B | 13 | 0 | 16 | CSV |
| — | collection | `awn-database/taxonomies/statuses` | [Статусы](awn-database/taxonomies/statuses/manifest.md) | Статусы | 305 B | 13 | 0 | 12 | CSV |
| — | collection | `awn-database/taxonomies/tags` | [Теги](awn-database/taxonomies/tags/manifest.md) | Теги | 326 B | 13 | 0 | 205 | CSV |
| — | collection | `awn-database/taxonomies/users` | [Пользователи](awn-database/taxonomies/users/manifest.md) | Пользователи | 304 B | 13 | 0 | 5 | CSV |
| — | group | `awn-database/ui` | [UI (интерфейс)](awn-database/ui/manifest.md) | UI (интерфейс) | 537 B | 14 | 0 | 36 | 2 влож. |
| — | collection | `awn-database/ui/home-titles` | [Заголовки «Главная»](awn-database/ui/home-titles/manifest.md) | Заголовки «Главная» | 310 B | 13 | 0 | 12 | MD |
| — | collection | `awn-database/ui/slogans` | [Слоганы шапки](awn-database/ui/slogans/manifest.md) | Слоганы шапки | 380 B | 13 | 0 | 24 | MD |

* **Важность** — личная важность для пользователя по шкале 0–10. При абстрактных вопросах агент начинает с более приоритетных тем (финансы, здоровье, напоминания, образование, спорт). 0 — не отмечено или низкий приоритет (например, коллекция фильмов); 10 — критично важно.
* **Строк** — число строк в теле документа (manifest.md). Если больше 0 — есть инструкция/промпт для агента: как работать с этой темой, что важно знать, договорённости. Пустое тело — 0.
