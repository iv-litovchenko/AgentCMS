# Agent CMS — выжимка проекта для NotebookLM

> **Назначение файла:** компактный, самодостаточный обзор репозитория `YamlCMS` (npm-пакет `agent-cms`). Подходит как источник для NotebookLM, onboarding и контекста для LLM-агентов.
>
> **Пользовательская версия (без технических деталей):** [`README.NOTEBOOK-LM.USER.md`](README.NOTEBOOK-LM.USER.md)
>
> **Дата сборки:** 2026-09-20  
> **Версия CMS:** 0.1.0 (прототип)

---

## 1. Что это за проект

**Agent CMS** — file-based CMS без базы данных для совместной работы **человека и LLM-агентов** над одной памятью.

Короткая формула:

> **Google Drive + Notion + память AI** — в одном общем пространстве, на диске, без отдельной БД.

Ключевая идея: **нет двух миров** («файлы человека» и «файлы агента»). Человек редактирует через UI, агент — через MCP tools. Оба видят одно дерево страниц, слотов и записей.

Репозиторий исторически назывался **YamlCMS**; продуктовое имя — **Agent CMS**.

---

## 2. Какую проблему решает

Сейчас информация человека разбросана:

Telegram → заметки → Google Drive → Obsidian → файлы → браузер → голова → задачи.

AI при этом часто живёт отдельно и каждый раз «не знает», где лежат реальные данные.

Agent CMS даёт **единое workspace-хранилище**, где:

- человек → информация → AI → действия связаны между собой;
- агент может читать, искать, дополнять и автоматизировать работу с тем же контентом;
- структура гибкая: от свободных markdown-заметок до табличных реестров со схемой.

---

## 3. Три главные сильные стороны

1. **Одна память для человека и AI** — не чат с нулевым контекстом, а общий «цифровой шкаф».
2. **Гибкая структура** — у каждой темы свои поля, слоты, правила, cron/heartbeat.
3. **Не просто хранилище** — индексы поиска, inbox/triage, журнал, факты, голосовой shell, MCP API, desktop/mobile клиенты.

---

## 4. Модель данных (главное)

### 4.1. Иерархия «шкафа»

| Уровень | Аналогия | Файловая форма |
|---------|----------|----------------|
| **Workspace** | Весь шкаф | Папка `workspaces/<agent-id>/` + корневой `manifest.md` |
| **Area** | Большой отдел | Папка с `_registration.md` или `manifest.md` типа area |
| **Topic** | Полка / папка | Папка с `manifest.md` типа topic |
| **Slot** | Ящик на полке | Подпапка в `awn-storage/` (`main/`, `inbox/`, `media/`…) |
| **Content** | Лист / файл | `.md`, `.csv`, медиа, код внутри слота |

### 4.2. Три канонические сущности MCP

| Сущность | Что это | Ключ MCP |
|----------|---------|----------|
| **Page** | Узел дерева меню | `path` → `…/manifest.md` |
| **Slot** | Место хранения на странице | `slot` → `main`, `inbox`, `media`, `notebooklm`… |
| **Content** | Файл внутри слота | `path` + `slot` + `ref` |

**Page ≠ Content.** Слот — не файл; контент живёт *в* слоте.

Тело `manifest.md` темы — это **бриф**: контекст, инструкции, договорённости с агентом.

### 4.3. Два слоя памяти (не смешивать без причины)

| | **Page · Slot · Content** | **awn-data (инфоблоки)** |
|---|---------------------------|---------------------------|
| Тип данных | Неструктурированная / полуструктурированная | Структурированная |
| Где | Дерево WS → Area → Topic; `awn-storage/` | Папка `awn-data/` вне дерева страниц |
| Форма | Markdown, медиа, код, wikilinks | Коллекции `{id}.md`, CSV, `schema.yml` |
| Когда | Документы, заметки, обсуждения, контекст | Справочники, задачи с полями, реестры, CRUD |
| MCP | `read_content_*`, `create_content` | `iblock_*`, `iblock_content_*` |

**Правило выбора:** одинаковый набор полей + фильтрация по колонкам → **awn-data**. Свободный текст и связи между файлами → **Page · Slot · Content**.

### 4.4. Служебные зоны workspace

| Папка / файл | Назначение |
|--------------|------------|
| `awn-agent-kit/` | Служебные темы агента (persona, rules, voice…) |
| `awn-shared/` | Общие ресурсы между темами |
| `awn-container/` | Пользовательский контент (обычные области/темы) |
| `awn-data/` | Инфоблоки, taxonomies, system presets |
| `awn-system/` | Типы полей, слотов, схем платформы |
| `awn-facts/` | Банк коротких фактов (решения, предпочтения) |
| `awn-dialogs/` | Полные Q/A Shell/Voice |
| `awn-temp/` | Временные файлы |
| `awn-recycle/` | Корзина (мягкое удаление) |
| `.agent-cms/journal/` | Журнал событий workspace (ISO-недели) |
| `NOTE.md`, `TODO.md` | Общая доска человек ↔ агент |
| `AGENTS.md`, `SKILL.md` | Инструкции агента (always-context) |
| `GLOBAL_MCP_DOC.md` | Глобальная шпаргалка MCP (always-context) |

### 4.5. Глобальный ID (`awn-id`)

У новых записей в frontmatter — **`awn-id`**: целое из `id-autoincrement.json` в корне workspace. Нужен для стабильных ссылок и поиска по полям.

---

## 5. Слоты (основные)

### Многофайловые (external)

| slot | Папка | Зачем |
|------|-------|-------|
| `main` | `main/` | Основная память темы |
| `inbox` | `inbox/` | Входящие (triage) |
| `notes` | `notes/` | Заметки |
| `references` | `references/` | Источники |
| `media` | `media/` | Медиатека темы |
| `assets` | `assets/` | Вложения записей (preview, pasted, attachments) |
| `repository` | `repository/` | Код / репозитории |
| `scripts` | `scripts/` | Скрипты |
| `notebooklm` | `notebooklm/` | Материалы для Google NotebookLM |
| `discussion` | `discussion/` | Дискуссия темы |
| `comments` | `comments/` | Discuss-комментарии |

**`media` ≠ `assets`:** media — самостоятельные файлы темы; assets — ресурсы конкретных записей.

### Однофайловые (internal)

| slot | Файл |
|------|------|
| `main-single` | `main.md` |
| `main-single-csv` | `main.csv` |
| `todo-single` | `todo.md` |

### Гибкий слот

Если у темы `awn-slots-flexible: true` — вся многофайловая память = произвольная FS-структура в `awn-storage/` без типовых слотов inbox/media/…

---

## 6. Типовая структура пути

```
{область}/{тема}/awn-storage/{слот}/{файл}
```

Пример:

```
awn-container/finansy/budget-2026/awn-storage/main/plan.md
```

Конвенция резолва: MCP tool `resolve_workspace_path({ path })` поднимается вверх по дереву и собирает breadcrumbs (workspace → area → topic → slot → file).

---

## 7. Архитектура приложения

### 7.1. Компоненты

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent CMS (монорепо)                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  server.js   │  public/     │  desktop/    │  mcp-server/   │
│  HTTP API    │  Web UI      │  Electron    │  MCP stdio     │
│  :3000/:3443 │  редактор    │  3 приложения│  для Cursor/   │
│              │              │              │  Claude Desktop│
├──────────────┴──────────────┴──────────────┴────────────────┤
│  agent-shell/ + voice-server.js + public/shell/              │
│  Голосовой клиент, SSE, TTS/STT, камера, экран               │
├──────────────────────────────────────────────────────────────┤
│  mobile/iphone-shell/  ·  browser-extension/  ·  workspaces/│
└─────────────────────────────────────────────────────────────┘
```

### 7.2. Desktop-приложения (Electron)

| Приложение | Назначение | Dev-команда |
|------------|------------|-------------|
| **Agent CMS** | Редактор CMS | `npm run cms:desktop` |
| **Agent Shell** | Голосовой клиент | `npm run shell:desktop` |
| **Agent CMS Control** | Пульт: сервер, сборки | `npm run control:desktop` |

Сборки: `dist/agent-cms/`, `dist/agent-shell/`, `dist/agent-control/`.

### 7.3. Порты (локально)

| Сервис | HTTP | HTTPS (mkcert) |
|--------|------|----------------|
| CMS API + UI | `:3000` | `:3443` |
| Voice / Shell UI | `:3088` | `:3488` |

HTTPS без предупреждений: `brew install mkcert && mkcert -install && npm run setup:certs`.

### 7.4. Workspaces (хранилища)

Реестр в `awn-agents.json`. Каждый workspace — отдельная папка с данными.

Встроенные в репо:

- `workspaces/agent-cms-core` — эталон, документация, типы, system presets
- `workspaces/agent-cms-test` — демо, тесты UI, CRM-studio, большие фикстуры

Внешние (на машине разработчика): `agent-focus`, `agent-medcenter`, `moikomp` и др.

**Синонимы MCP:** workspace · agent · vault · хранилище → поле **`agentId`**.

---

## 8. MCP — интерфейс для агентов

MCP-сервер: `mcp-server/` (v0.4.0, ~78 tools).

### Старт нового чата

```
1. list_workspaces
2. get_session_context({ agentId: "…" })
3. Все workspace-tools — с тем же agentId
```

**Правило:** работать с CMS **только через MCP tools**. Не curl к API, не прямое чтение/запись файлов workspace в обход MCP.

### Группы tools (сокращённо)

| Группа | Примеры |
|--------|---------|
| Старт / контекст | `get_session_context`, `get_user_active_context_now`, `list_workspace_always_context` |
| Навигация | `get_page_map`, `get_content_index`, `resolve_workspace_path`, `get_page_url` |
| Страницы | `read/write_page_*`, `create_page`, `delete_page`, `rename_page` |
| Контент | `read/write_content_*`, `create_content`, `import_content_from_url` |
| Инфоблоки | `iblock_*`, `iblock_content_*` |
| Поиск | `search_workspace_content`, `search_workspace_semantic`, `search_workspace_hybrid`, `search_workspace_links` |
| Факты | `retain_workspace_fact`, `recall_workspace_facts` |
| Журнал | `append_journal_entry`, `list_journal_entries` |
| FS | `read_file`, `write_file`, `upload_file`, `list_folder`, `batch_invoke` |
| Exec | `run_script`, `exec_command`, `exec_shell` |
| Web | `search_web`, `read_web_page`, `extract_document_text` |
| Inbox / общение | `list_inbox`, `triage_inbox_item`, `read_discussion`, `append_discussion` |

Документация:

- `workspaces/agent-cms-core/GLOBAL_MCP_DOC.md` — always-context шпаргалка
- `mcp-server/README.md` — установка и конфиг
- `GET /api/mcp-docs` — HTTP JSON-карта tools

---

## 9. Поиск и индексы

Workspace индексируется несколькими слоями:

| Индекс | Назначение | Сервис |
|--------|------------|--------|
| **Fulltext** | Поиск по тексту | `fulltext-index/` |
| **Semantic** | Поиск по смыслу (offline embeddings) | `semantic-search/` |
| **Storage** | SQL-подобные запросы по полям frontmatter | `storage-index/` |
| **Links** | Wikilinks, markdown-ссылки, relation | `link-index/` |
| **OCR** | Текст из изображений/PDF | `ocr-index/` (tesseract.js) |
| **Workspace page index** | Оглавление страниц | `workspace-index/` |

Цепочка пересборки: OCR → fulltext → semantic → storage → links.  
Всё разом: `rebuild_workspace_indexes`.  
UI: sidebar → «Индексирование workspace».

**Hybrid search:** `search_workspace_hybrid` — один вопрос по нескольким индексам.  
**Links отдельно:** `search_workspace_links` (backlinks / outbound / neighbors).

---

## 10. Agent Shell (голос и companion)

**Agent Shell** — компактная оболочка: отправка сообщений агенту + озвучка ответов.

Агенты (Cursor, QwenPaw, Codex…) подключаются к CMS **по MCP**; shell пишет в thread/inbox и слушает ответы по SSE.

### Клиенты Shell

| Клиент | Путь |
|--------|------|
| Web / PWA | `public/shell/index.html` |
| Electron | `desktop/agent-shell/` |
| iOS (SwiftUI) | `mobile/iphone-shell/` |
| Chrome Extension | `browser-extension/` (Side Panel + Companion toolbar) |

### API Shell (основное)

- `POST /api/shell/message?agent=` — сообщение в thread
- `GET /api/shell/stream?agent=` — SSE (status, assistant_message, deltas)
- Камера / экран — snapshot для MCP (`shell_camera_snapshot`, `shell_screenshot`)

Настройки: `.agent-shell/settings.json` в workspace.

TTS: Web Speech API или Python sidecar (`npm run shell:sidecar`, macOS `say`).

---

## 11. Технологический стек

### Backend / runtime

- **Node.js 18+**, без ORM — файловая система + JSON/YAML/Markdown
- **`server.js`** — монолитный HTTP/HTTPS сервер (~27k строк), главная точка API
- **`better-sqlite3`** — локальные индексы (не основное хранилище контента)
- Зависимости: `markdown-it`, `mermaid`, `@toast-ui/editor`, `sharp`, `pdf-parse`, `tesseract.js`, `xlsx`, `mammoth`, `edge-tts-universal`

### Frontend

- Vanilla JS в `public/` (редактор, меню, dashboards, shell)
- Vditor, Toast UI Editor, Three.js (3D в shell), highlight.js, Fancybox

### Desktop

- **Electron 35** + electron-builder
- electron-updater (generic provider)

### Mobile

- SwiftUI iPhone app
- Общий контракт: `mobile/SHELL-API.md`, `public/shell/shell-contract.js`

### AI integration

- MCP stdio server
- Optional: `@anthropic-ai/claude-code`, `@openai/codex`
- WebAuthn passkey (`@simplewebauthn/server`) для app lock

---

## 12. Типовая структура репозитория (корень)

```
YamlCMS/
├── server.js              # Главный HTTP-сервер CMS
├── voice-server.js        # Voice/Shell на отдельном порту
├── agent-registry.js      # Реестр workspaces
├── awn-agents.json        # Список подключённых хранилищ
├── awn-canonical-model.js # Канон типов Page/Slot/Content
├── manifest-paths.js      # Пути manifest, storage, слотов
├── public/                # Web UI
├── desktop/               # Electron: cms, shell, control
├── mcp-server/            # MCP для Cursor/Claude
├── agent-shell/           # Backend shell (handlers, sidecar)
├── semantic-search/       # Semantic index
├── fulltext-index/        # Fulltext index
├── storage-index/         # Storage/query index
├── link-index/            # Link graph
├── ocr-index/             # OCR index
├── workspace-index/       # Page index
├── lib/                   # Shared utilities
├── scripts/               # Миграции, certs, shortcuts
├── documentation/examples/ # 12 серий UI-прототипов
├── workspaces/            # Данные workspace
│   ├── agent-cms-core/    # Эталон + GLOBAL_MCP_DOC
│   └── agent-cms-test/    # Демо + CRM-studio
├── mobile/                # iOS shell
├── browser-extension/     # Chrome companion
└── packages/awn-core/     # Выносимый движок (в процессе)
```

---

## 13. Быстрый старт

```bash
npm install
npm run start:https          # CMS https://localhost:3443
npm run mcp                  # MCP stdio (нужен запущенный CMS)
npm run cms:desktop          # Electron-редактор
npm run shell:desktop        # Electron Shell
```

MCP в Cursor/Claude Desktop:

```bash
cd mcp-server && npm install
# AGENT_CMS_BASE_URL=https://localhost:3443
node mcp-server/index.js
```

---

## 14. Ключевые пользовательские сценарии

### Inbox → triage

Входящие попадают в `slot: inbox` со `status: new`. MCP: `list_inbox`, `triage_inbox_item`.

### Дискуссии и комментарии

- Дискуссия темы: `read_discussion` / `append_discussion` (не `create_content`)
- Discuss: `list_comments` / `append_comment`

### Sidecar

Мета к файлу: `{name}.sidecar.md` рядом с исходником. Создание только через `create_sidecar`.

### Доп. материалы записи

У записи может быть личная папка `awn-materials-{slug}/` — черновики и вложения только для неё.

### Cron / heartbeat

Темы могут «оживать» по расписанию (`awn-runtime-cron`, `awn-runtime-heartbeat`) — платформа для автономных агентных процессов.

### NotebookLM

Слот `notebooklm/` — материалы, подготовленные для загрузки в Google NotebookLM (конспекты, выжимки). Этот файл — пример такого материала на уровне всего проекта.

---

## 15. Банк фактов и журнал

### `awn-facts/`

Короткие выжимки: решения, предпочтения, сущности. Не архив переписки.

- `retain_workspace_fact` — записать
- `recall_workspace_facts` — найти по вопросу

### `.agent-cms/journal/`

Единый журнал событий (life / action / ui / system). Файл на ISO-неделю (`2026-W38.md`). Питает 🔔 уведомления.

---

## 16. Демо-кейсы в workspace

| Workspace | Что показывает |
|-----------|----------------|
| `agent-cms-core` | Документация, типы, system presets, задачи, идеи |
| `agent-cms-test/crm-studio` | «Боевой» кейс: CRM салона (мастера, услуги, записи) |
| `agent-cms-test/awn-container/` | Разные темы, inbox, 1000 сообщений, PHP-справочник |
| `documentation/examples/` | 12 серий UI-макетов (sidebar, properties, breadcrumbs…) |

---

## 17. Текущие направления разработки (2026-09)

По файлу `optimizatsiya.md` и недавним изменениям:

1. **Оптимизация журнала и колокольчика** — убрать полный парсинг `.md` при poll; инкрементальный `since`, серверный кэш, пагинация списка.
2. **Menu cache** — `menu-cache/store.js` для ускорения меню.
3. **Вынос движка** — `packages/awn-core/` (loaders, manifest, schema).
4. **Companion / Extension** — контекст со страницы браузера в Shell.
5. **Passkey / Touch ID** — блокировка приложения.
6. **Semantic + hybrid search** — основной способ навигации по большим workspace.

---

## 18. Глоссарий

| Термин | Значение |
|--------|----------|
| **AWN** | Agent Workspace Notation — модель Page/Slot/Content + типы |
| **CHPU** | Человекопонятные URL (slug-пути в UI) |
| **MCP** | Model Context Protocol — API для Cursor/Claude |
| **Iblock** | Инфоблок = structured store в `awn-data/` |
| **Sidecar** | `.sidecar.md` — метаданные рядом с файлом |
| **Always-context** | Файлы, автоматически попадающие в контекст агента |
| **Triage** | Разбор inbox: куда отправить входящую запись |
| **Orchestrator** | Workspace с флагом `orchestrator: true` в `awn-agents.json` |

---

## 19. Антипаттерны (важно для агентов)

- Писать в `discussion/` / `comments/` через `create_content` — **нельзя**
- Путать `media/` и `assets/`
- Класть табличный реестр в `main/` темы вместо `awn-data/`
- Читать/писать workspace файлами в обход MCP
- Сохранять каждую реплику чата в `awn-facts/` — только решения и итоги
- Использовать `read_system_file` — **удалён**; только `read_file` / `list_system_files`

---

## 20. Ссылки на первоисточники в репо

| Документ | Путь |
|----------|------|
| Краткий README | `README.md` |
| MCP шпаргалка | `workspaces/agent-cms-core/GLOBAL_MCP_DOC.md` |
| Описание системы (простым языком) | `workspaces/agent-cms-core/dokumentatsii/awn-storage/main/opisanie-sistemy-agent-cms.md` |
| MCP server | `mcp-server/README.md` |
| Desktop apps | `desktop/README.md` |
| Agent Shell | `agent-shell/README.md` |
| Mobile | `mobile/README.md` |
| Chrome Extension | `browser-extension/README.md` |
| User docs (в CMS) | `workspaces/agent-cms-core/dokumentatsii/awn-storage/main/user-docs*.md` |
| UI examples | `documentation/examples/` |
| Property types demo | `documentation/examples/6/` |

---

## 21. Одна фраза для презентации

**Agent CMS — это общая файловая память человека и AI-агента с единой моделью данных, полнотекстовым и семантическим поиском, MCP API, голосовым shell и desktop/mobile клиентами — без отдельной базы данных, с полным контролем над данными на диске.**
