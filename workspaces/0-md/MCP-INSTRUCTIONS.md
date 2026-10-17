# Agent CMS — зачем это

Это наша совместная память: твоя (агента) и человека (1+1).

Человек складывает сюда заметки, задачи, идеи, ссылки и файлы. Ты читаешь и пополняешь их, поэтому контекст не теряется между сессиями и между разными агентами. Человек работает через UI, ты — через MCP; оба видите одно и то же.

Ведущая роль у человека. Его слова и структура важнее твоих догадок: сохраняй как есть, не переписывай и не удаляй по своей инициативе.

## Старт — только по запросу человека

Сам ничего не начинай: не вызывай tools и не читай хранилище, пока человек не попросил. Работа с Agent CMS начинается только с его запроса.

Когда человек попросил:

1. Только MCP tools этого сервера — никаких `curl`, прямого чтения файлов и сторонних tools.
2. `list_workspaces` → `get_session_context({ workspaceId })`.
3. Дальше во всех вызовах — тот же `workspaceId`.
4. Пути и типы не угадывай — бери из ответов tools.

## Как устроено

- **Платформа** — вся система целиком.
- **Хранилище (workspace)** — папка с md-файлами на компьютере или сервере.

Основное лежит в хабах:

- **Каналы** — входящие потоки (Telegram, GitHub, закладки): сырые идеи, ссылки, задачи на потом.
- **Темы** — разобранные знания по областям.
- **Базы** — структурированные данные: задачи, финансы, дневник, привычки.
- **Репозитории** — подключённые проекты.
- **Медиатеки** — файлы и картинки.

Сырое попадает в канал, потом разбирается в тему или базу.

Дополнительно: журнал, факты, глоссарий, справочник, крон и heartbeat, зависимости между записями (проверяй перед удалением или переносом), sidecar.

## Скиллы Agent CMS

Подробности — в 6 скиллах. Для работы они должны быть установлены в твоём клиенте.

**Где взять:** установи скиллы из GitHub-репозитория https://github.com/iv-litovchenko/AgentCMS (папка `workspaces/0-md`). Если установить не получается, прочитай нужный файл через `read_platform_doc({ path })` (список — `list_platform_docs`).

1. [`GLOBAL-SKILL-1-BASE.md`](https://github.com/iv-litovchenko/AgentCMS/blob/main/workspaces/0-md/GLOBAL-SKILL-1-BASE.md) — работа с инструментами (читать первым, если задача про хранилище).
2. [`GLOBAL-SKILL-2-RESPONSE-STYLE.md`](https://github.com/iv-litovchenko/AgentCMS/blob/main/workspaces/0-md/GLOBAL-SKILL-2-RESPONSE-STYLE.md) — как отвечать.
3. [`GLOBAL-SKILL-3-RULES.md`](https://github.com/iv-litovchenko/AgentCMS/blob/main/workspaces/0-md/GLOBAL-SKILL-3-RULES.md) — правила человека.
4. [`GLOBAL-SKILL-4-MARKDOWN.md`](https://github.com/iv-litovchenko/AgentCMS/blob/main/workspaces/0-md/GLOBAL-SKILL-4-MARKDOWN.md) — какую markdown-разметку использовать при записи (по необходимости).
5. [`GLOBAL-SKILL-5-SEARCH.md`](https://github.com/iv-litovchenko/AgentCMS/blob/main/workspaces/0-md/GLOBAL-SKILL-5-SEARCH.md) — как искать: поиск, индексы, DQL.
6. [`GLOBAL-SKILL-6-MODULES.md`](https://github.com/iv-litovchenko/AgentCMS/blob/main/workspaces/0-md/GLOBAL-SKILL-6-MODULES.md) — модули платформы (git и др.).
