# Оглавление инфоблоков

| ID | Тип | Путь | Название | Описание | Размер | Строк* | Важность* | Записей | Конфигурации |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| — | group | `awn-databases/agent-registry` | [Реестр агентов](awn-databases/agent-registry/manifest.md) | Реестр агентов | 547 B | 16 | 0 | 14 | 2 влож. |
| — | collection | `awn-databases/agent-registry/agent-groups` | [Группы агентов](awn-databases/agent-registry/agent-groups/manifest.md) | Группы агентов | 687 B | 19 | 0 | 6 | MD |
| — | collection | `awn-databases/agent-registry/agents` | [Агенты](awn-databases/agent-registry/agents/manifest.md) | Агенты | 744 B | 20 | 0 | 8 | MD |
| — | collection | `awn-databases/tasks` | [Задачи](awn-databases/tasks/manifest.md) | Задачи | 322 B | 13 | 0 | 6 | MD |
| — | group | `awn-databases/taxonomies` | [Таксономии (справочники)](awn-databases/taxonomies/manifest.md) | Таксономии (справочники) | 728 B | 18 | 0 | 266 | 5 влож. |
| — | collection | `awn-databases/taxonomies/categories` | [Категории](awn-databases/taxonomies/categories/manifest.md) | Категории | 319 B | 13 | 0 | 34 | CSV |
| — | collection | `awn-databases/taxonomies/colors` | [Палитра](awn-databases/taxonomies/colors/manifest.md) | Палитра | 298 B | 13 | 0 | 6 | CSV |
| — | collection | `awn-databases/taxonomies/priorities` | [Приоритеты](awn-databases/taxonomies/priorities/manifest.md) | Приоритеты | 304 B | 13 | 0 | 16 | CSV |
| — | collection | `awn-databases/taxonomies/tags` | [Теги](awn-databases/taxonomies/tags/manifest.md) | Теги | 326 B | 13 | 0 | 205 | CSV |
| — | group | `awn-databases/ui` | [UI (интерфейс)](awn-databases/ui/manifest.md) | UI (интерфейс) | 537 B | 14 | 0 | 36 | 2 влож. |
| — | collection | `awn-databases/ui/home-titles` | [Заголовки «Главная»](awn-databases/ui/home-titles/manifest.md) | Заголовки «Главная» | 310 B | 13 | 0 | 12 | MD |
| — | collection | `awn-databases/ui/slogans` | [Слоганы шапки](awn-databases/ui/slogans/manifest.md) | Слоганы шапки | 380 B | 13 | 0 | 24 | MD |

* **Важность** — личная важность для пользователя по шкале 0–10. При абстрактных вопросах агент начинает с более приоритетных тем (финансы, здоровье, напоминания, образование, спорт). 0 — не отмечено или низкий приоритет (например, коллекция фильмов); 10 — критично важно.
* **Строк** — число строк в теле документа (manifest.md). Если больше 0 — есть инструкция/промпт для агента: как работать с этой темой, что важно знать, договорённости. Пустое тело — 0.
