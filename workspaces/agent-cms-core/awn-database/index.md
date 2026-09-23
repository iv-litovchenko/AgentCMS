# Оглавление инфоблоков

| ID | Тип | Путь | Название | Описание | Размер | Строк* | Важность* | Конфигурации |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| — | группа | `agent-registry` | [Реестр агентов](awn-database/agent-registry/manifest.md) | Реестр агентов | 547 B | 16 | 0 | 2 влож. |
| — | коллекция | `agent-registry/agent-groups` | [Группы агентов](awn-database/agent-registry/agent-groups/manifest.md) | Группы агентов | 687 B | 19 | 0 | MD · 6 зап. |
| — | коллекция | `agent-registry/agents` | [Агенты](awn-database/agent-registry/agents/manifest.md) | Агенты | 744 B | 20 | 0 | MD · 8 зап. |
| — | коллекция | `tasks` | [Задачи](awn-database/tasks/manifest.md) | Задачи | 322 B | 13 | 0 | MD · 6 зап. |
| — | группа | `taxonomies` | [Таксономии (справочники)](awn-database/taxonomies/manifest.md) | Таксономии (справочники) | 728 B | 18 | 0 | 6 влож. |
| — | коллекция | `taxonomies/categories` | [Категории](awn-database/taxonomies/categories/manifest.md) | Категории | 319 B | 13 | 0 | CSV · 34 зап. |
| — | коллекция | `taxonomies/colors` | [Палитра](awn-database/taxonomies/colors/manifest.md) | Палитра | 298 B | 13 | 0 | CSV · 6 зап. |
| — | коллекция | `taxonomies/priorities` | [Приоритеты](awn-database/taxonomies/priorities/manifest.md) | Приоритеты | 304 B | 13 | 0 | CSV · 16 зап. |
| — | коллекция | `taxonomies/statuses` | [Статусы](awn-database/taxonomies/statuses/manifest.md) | Статусы | 305 B | 13 | 0 | CSV · 12 зап. |
| — | коллекция | `taxonomies/tags` | [Теги](awn-database/taxonomies/tags/manifest.md) | Теги | 326 B | 13 | 0 | CSV · 205 зап. |
| — | коллекция | `taxonomies/users` | [Пользователи](awn-database/taxonomies/users/manifest.md) | Пользователи | 304 B | 13 | 0 | CSV · 5 зап. |
| — | группа | `ui` | [UI (интерфейс)](awn-database/ui/manifest.md) | UI (интерфейс) | 537 B | 14 | 0 | 2 влож. |
| — | коллекция | `ui/home-titles` | [Заголовки «Главная»](awn-database/ui/home-titles/manifest.md) | Заголовки «Главная» | 310 B | 13 | 0 | MD · 12 зап. |
| — | коллекция | `ui/slogans` | [Слоганы шапки](awn-database/ui/slogans/manifest.md) | Слоганы шапки | 380 B | 13 | 0 | MD · 24 зап. |

* **Важность** — личная важность для пользователя по шкале 0–10. При абстрактных вопросах агент начинает с более приоритетных тем (финансы, здоровье, напоминания, образование, спорт). 0 — не отмечено или низкий приоритет (например, коллекция фильмов); 10 — критично важно.
* **Строк** — число строк в теле документа (manifest.md). Если больше 0 — есть инструкция/промпт для агента: как работать с этой темой, что важно знать, договорённости. Пустое тело — 0.
