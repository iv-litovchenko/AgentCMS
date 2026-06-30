# Установка и обновление AWN Framework

Инструкция для **агента**: как скопировать базовые файлы AWN в корень проекта пользователя и при необходимости добавить стартовый md под конкретную IDE/CLI.

Человеку: попросите агента выполнить установку, **прикрепив этот файл** или открыв его в workspace, чтобы агент прочитал блок ниже.

Контекст проекта и философия AWN — в корневом [`README.md`](README.md). Полный контракт правил — в [`AGENTS.md`](01%20Sketchbook/v2/AGENTS.md).

**Полный каркас vault** (чтобы совпадало с типичным `AGENTS.NODES.md` из репозитория): каталоги **`Assistant.Ai/`**, **`Templates/`**, плюс **`Inbox/Area.node.md`**, **`Tests/Area.node.md`**, **`Domains/Index.node.md`**, **`Domains/Categories.node.md`**, при необходимости **`AwnFramework/Area.node.md`** (область в таблице «Области»). В **полной** сессии корневой `AGENTS.md` отсылает к **`AGENTS.FULL.md`** — его тоже нужно копировать, иначе протокол неполный. Каталог **`Assistant.Ai/Cron/Memory/`** (пустой или с `.gitkeep`) — куда по ноде `DailyHealthCheck` пишутся `*.main.md`.

---

## INSTALL / UPDATE (инструкция для агента)

> [!TIP]
> **Как подключить (установить) фреймворк для своего агента**
>
> Попросите своего агента установить данный фреймворк, передав ему инструкцию, описанную ниже.
>
> Важно: при установке может выполняться перезапись соответствующих файлов, если они уже существуют.

### Инструкция для агента (промт на установку AWN-Framework)

Контекст задачи:
Ты выполняешь установку (обновление) AWN Framework в текущий проект пользователя.
Ожидаемый результат: в проекте пользователя лежат все файлы из списка шага 1 (те же относительные пути, что в репозитории AWN-Framework); при необходимости для среды пользователя — стартовый md из шага 2 и `AGENTS.LLM_BOOTSTRAP_PRESET.md` (если стартер на него ссылается). Если среда читает только `AGENTS.md`, стартовый файл может не понадобиться — это нормально.

Общие правила:
1) Если файлы уже существуют, предложи замену и запроси подтверждение перед перезаписью.
2) После завершения установки попроси пользователя перезапустить сессию (или приложение).
3) После успешной установки предложи ноды на удаление не нужных и доменов на удаление и редактирвоание не нужных)

Шаг 1. Загрузка базовых файлов

Источник — репозиторий **AWN-Framework** (`iv-litovchenko/AWN-Framework`, ветка `main`). Скопируй в проект пользователя **с теми же относительными путями** от корня проекта.

**Предпочтительно:** скопировать **целиком каталоги** из репозитория (Finder, `cp -R`, архив репозитория): `Assistant.Ai/`, `Templates/`, при необходимости создать `Inbox/`, `Tests/`, `Domains/` и положить туда перечисленные ниже файлы, если не скопировал всё дерево.

Если копируешь **по HTTP** с GitHub — только **raw**-URL, иначе придёт HTML; шаблон: `https://raw.githubusercontent.com/iv-litovchenko/AWN-Framework/main/<путь/к/файлу>`.
- Assistant.Ai/Area.node.md
- Assistant.Ai/Assistant.node.md
- Assistant.Ai/User.node.md
- Assistant.Ai/Users.node.md
- Assistant.Ai/Rules.node.md
- Assistant.Ai/Core/Area.node.md
- Assistant.Ai/Chats/Area.node.md
- Assistant.Ai/Logs/Area.node.md
- Assistant.Ai/Nodes/Area.node.md
- Assistant.Ai/Nodes/MemoryFiles.node.md
- Assistant.Ai/Nodes/MetadataFiles.node.md
- Assistant.Ai/Nodes/RandomAnecdote.node.md
- Assistant.Ai/Nodes/Context.Greeting.node.md
- Assistant.Ai/Nodes/Context.SmartTriggering.node.md
- Assistant.Ai/Cron/Area.node.md
- Assistant.Ai/Cron/DailyHealthCheck.node.md
- Assistant.Ai/Cron/Memory/.gitkeep
- Domains/Index.node.md
- Domains/Categories.node.md
- Inbox/Area.node.md
- Tests/Area.node.md
- Templates/Nodes/Area.template.md
- Templates/Nodes/Index.template.md
- Templates/Nodes/Solo.template.md
- Templates/Records/Memory.template.md
- Templates/Records/Metadata.template.md
- Templates/Records/Note.template.md
- AGENTS.md
- AGENTS.FULL.md
- AGENTS.NODES.md
- AGENTS.NODES.CATALOG.md
- AGENTS.SETTINGS.md
- AGENTS.LLM_BOOTSTRAP_PRESET.md
- AGENTS.LLM_TEMPLATE_PRESET.md
- HEARTBEAT.md
- INSTALL.md
- README.md
- docker-compose.yml
- .env.example


Шаг 2. Стартовый md-файл для твоей IDE/CLI (не путать с AGENTS.md)

`AGENTS.md` — это **единый контракт правил и протокола AWN для агента** (полная/чистая сессия, ноды, реестр). Имя **фиксировано**: всегда `AGENTS.md` в корне проекта.

Отдельно нужен **стартовый файл под конкретную систему** — короткий указатель, который клиент подмешивает в контекст. Имя файла **зависит от продукта**; это **не** замена `AGENTS.md`. Типичные имена:

| Система / контекст | Имя стартового файла в корне проекта |
|--------------------|--------------------------------------|
| Claude Code, Cursor (правила под Claude) и т.п. | `CLAUDE.md` |
| Google Gemini CLI | `GEMINI.md` |
| Qwen / совместимые оболочки | `QWEN.md` |
| OpenAI Codex CLI | `CODEX.md` |
| DeepSeek | `DEEPSEEK.md` |
| Mistral | `MISTRAL.md` |

Готовые стартеры из AWN обычно ссылаются на `AGENTS.LLM_BOOTSTRAP_PRESET.md` (полная/чистая сессия, чтение `AGENTS.md` и `AGENTS.NODES.md`). Если копируешь такой стартер — **`AGENTS.LLM_BOOTSTRAP_PRESET.md` должен лежать в корне** (его добавили в шаге 1).

Уточни у пользователя или по документации среды, **какое имя файла** ожидается в корне workspace, и скачай **один** подходящий файл под это имя:

- https://github.com/iv-litovchenko/AWN-Framework/CLAUDE.md → `CLAUDE.md`
- https://github.com/iv-litovchenko/AWN-Framework/CODEX.md → `CODEX.md`
- https://github.com/iv-litovchenko/AWN-Framework/DEEPSEEK.md → `DEEPSEEK.md`
- https://github.com/iv-litovchenko/AWN-Framework/GEMINI.md → `GEMINI.md`
- https://github.com/iv-litovchenko/AWN-Framework/MISTRAL.md → `MISTRAL.md`
- https://github.com/iv-litovchenko/AWN-Framework/QWEN.md → `QWEN.md`
- https://github.com/iv-litovchenko/AWN-Framework/README.fix.md → `README.md`

Для OpenClaw-подобных систем, которые читают `AGENTS.md` **напрямую**, копирование `CLAUDE.md` / `GEMINI.md` и т.д. можно пропустить — пользователь должен убедиться, что среда подхватывает `AGENTS.md`.

Если готового стартера нет, создай файл с именем, которое требует среда, по шаблону https://github.com/iv-litovchenko/AWN-Framework/AGENTS.LLM_TEMPLATE_PRESET.md — содержимое должно вести к `./AGENTS.LLM_BOOTSTRAP_PRESET.md` или к тем же правилам чтения `./AGENTS.md`.


Шаг 3. Проверка и перезапуск

1) В проекте на месте файлы шага 1: `AGENTS.md`, `AGENTS.NODES.md`, `INSTALL.md`, каталоги `Assistant.Ai/` и `Templates/`, файлы `Domains/Index.node.md`, `Domains/Categories.node.md`, `Inbox/Area.node.md`, `Tests/Area.node.md` (если ставился полный каркас).  
2) Если использовал шаг 2 — стартовый файл **под ожидаемым именем** и при необходимости `AGENTS.LLM_BOOTSTRAP_PRESET.md`.  
3) Если копировал `docker-compose.yml` — есть локальный `.env` (из `.env.example`), без коммита `.env` в git.  
4) Попроси пользователя перезапустить сессию или приложение.  
5) По желанию: в project rules среды — короткая отсылка к `AGENTS.md` или пресету, без длинного дублирования текста контракта.  
6) Обрати внимание: в реестре указаны ноды-примеры (`RandomAnecdote`, `MetadataFiles`, при необходимости `DailyHealthCheck`) и контракты памяти/метаданных — пути к файлам должны существовать, иначе поправь `AGENTS.NODES.md` под фактическую структуру.

После копирования `Domains/Index.node.md`: приведи таблицу **«Реестр доменов»** в соответствие с реальными папками в `Domains/` пользователя (удали или замени чужие примеры из репозитория).

