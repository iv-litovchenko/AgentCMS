# AGENT CMS (0.0.1-beta)

<p align="center">
  <a href="docs/deploy/DOCKER.md"><img src="docs/images/badges/badge-docker.svg" alt="Docker" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-установка--macos-gb-install--macos"><img src="docs/images/badges/badge-macos.svg" alt="macOS" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-установка--ubuntu-vps--сервер-gb-install--ubuntu-vps--server"><img src="docs/images/badges/badge-linux.svg" alt="Linux" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="docs/deploy/DOCKER.md" title="Windows (beta, WSL)"><img src="docs/images/badges/badge-windows-beta.svg" alt="Windows beta" height="28"></a>
</p>

<p align="center">
  <a href="#-подключение-скиллов-для-агента--claude-codex-и-другие-gb-agent-skills--claude-codex-and-others"><img src="docs/images/badges/badge-claude.svg" alt="Claude" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-подключение-скиллов-для-агента--claude-codex-и-другие-gb-agent-skills--claude-codex-and-others"><img src="docs/images/badges/badge-codex.svg" alt="Codex" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="mcp-server/README.md"><img src="docs/images/badges/badge-qwenpaw.svg" alt="QwenPaw" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-подключение-mcp-gb-mcp-connection"><img src="docs/images/badges/badge-mcp.svg" alt="MCP (Model Context Protocol)" height="28"></a>
</p>

<p align="center">
  <a href="#-стек-gb-stack"><img src="docs/images/badges/badge-nodejs.svg" alt="Node.js" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-стек-gb-stack"><img src="docs/images/badges/badge-express.svg" alt="Express" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-стек-gb-stack"><img src="docs/images/badges/badge-sqlite.svg" alt="SQLite" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-стек-gb-stack"><img src="docs/images/badges/badge-markdown.svg" alt="Markdown" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-стек-gb-stack"><img src="docs/images/badges/badge-electron.svg" alt="Electron" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-стек-gb-stack"><img src="docs/images/badges/badge-mermaid.svg" alt="Mermaid" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#-стек-gb-stack"><img src="docs/images/badges/badge-threejs.svg" alt="Three.js" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="docs/deploy/vps-caddy-letsencrypt.md"><img src="docs/images/badges/badge-caddy.svg" alt="Caddy" height="28"></a>
</p>

---

## 🇷🇺 Содержание (🇬🇧 Table of contents)

🇷🇺 **[ru]**

- [Кросс-платформенная цифровая память для человека и его ИИ-агентов](#-кросс-платформенная-цифровая-память-для-человека-и-его-ии-агентов-gb-cross-platform-digital-memory-for-you-and-your-ai-agents)
- [Приложения и клиенты](#-приложения-и-клиенты-gb-apps-and-clients)
- [Один workspace — три входа. UI, MCP и голос — разные интерфейсы, одно хранилище.](#-один-workspace-три-входа-ui-mcp-и-голос-разные-интерфейсы-одно-хранилище-gb-one-workspace-three-entry-points-ui-mcp-and-voice-are-different-interfaces-one-store)
- [Зачем](#-зачем-gb-why)
- [Для кого](#-для-кого-gb-who-its-for)
- [Как устроено — основные термины](#-как-устроено-основные-термины-gb-how-it-works-key-terms)
- [Принципы](#-принципы-gb-principles)
- [Стек](#-стек-gb-stack)
- [Рекомендуемые требования](#-рекомендуемые-требования-gb-recommended-requirements)
- [Установка — установщик (Mac / Windows / Linux)](#-установка--установщик-mac--windows--linux-gb-install--installer)
- [Установка — macOS (вручную)](#-установка--macos-gb-install--macos)
- [Установка — Ubuntu VPS / сервер (вручную)](#-установка--ubuntu-vps--сервер-gb-install--ubuntu-vps--server)
- [CLI `agent-cms-cli`](#-cli-agent-cms-cli-gb-cli-agent-cms-cli)
- [Electron — сборка `.app` и ярлыки](#-electron--сборка-app-и-ярлыки-gb-electron--build-app--shortcuts)
- [Настройка — `.env`](#-настройка--env-gb-configuration--env)
- [Подключение скиллов для агента — Claude, Codex и другие](#-подключение-скиллов-для-агента--claude-codex-и-другие-gb-agent-skills--claude-codex-and-others)
- [Подключение MCP](#-подключение-mcp-gb-mcp-connection)
- [Канон MCP user-agent-cms](#-канон-mcp-user-agent-cms-gb-mcp-tool-map-user-agent-cms)
- [Справочники для агентов и индексации — модельки и нейронки, обучайтесь 😀](#-справочники-для-агентов-и-индексации-модельки-и-нейронки-обучайтесь-gb-references-for-agents-and-indexing-models-go-learn)
- [Мечта](#-мечта-gb-vision)
- [Лицензия](#-лицензия-gb-license)
- [Ссылки](#-ссылки-gb-links)
- [С чего начать?](#-с-чего-начать-gb-where-to-start)

---

> 🇬🇧 **[en]**
>
> - [Cross-platform digital memory for you and your AI agents](#-кросс-платформенная-цифровая-память-для-человека-и-его-ии-агентов-gb-cross-platform-digital-memory-for-you-and-your-ai-agents)
> - [Apps and clients](#-приложения-и-клиенты-gb-apps-and-clients)
> - [One workspace — three entry points. UI, MCP, and voice are different interfaces, one store.](#-один-workspace-три-входа-ui-mcp-и-голос-разные-интерфейсы-одно-хранилище-gb-one-workspace-three-entry-points-ui-mcp-and-voice-are-different-interfaces-one-store)
> - [Why](#-зачем-gb-why)
> - [Who it’s for](#-для-кого-gb-who-its-for)
> - [How it works — key terms](#-как-устроено-основные-термины-gb-how-it-works-key-terms)
> - [Principles](#-принципы-gb-principles)
> - [Stack](#-стек-gb-stack)
> - [Recommended requirements](#-рекомендуемые-требования-gb-recommended-requirements)
> - [Install — installer (Mac / Windows / Linux)](#-установка--установщик-mac--windows--linux-gb-install--installer)
> - [Install — macOS (manual)](#-установка--macos-gb-install--macos)
> - [Install — Ubuntu VPS / server (manual)](#-установка--ubuntu-vps--сервер-gb-install--ubuntu-vps--server)
> - [CLI `agent-cms-cli`](#-cli-agent-cms-cli-gb-cli-agent-cms-cli)
> - [Electron — build `.app` & shortcuts](#-electron--сборка-app-и-ярлыки-gb-electron--build-app--shortcuts)
> - [Configuration — `.env`](#-настройка--env-gb-configuration--env)
> - [Agent skills — Claude, Codex, and others](#-подключение-скиллов-для-агента--claude-codex-и-другие-gb-agent-skills--claude-codex-and-others)
> - [MCP connection](#-подключение-mcp-gb-mcp-connection)
> - [MCP tool map `user-agent-cms`](#-канон-mcp-user-agent-cms-gb-mcp-tool-map-user-agent-cms)
> - [References for agents and indexing — models, go learn 😀](#-справочники-для-агентов-и-индексации-модельки-и-нейронки-обучайтесь-gb-references-for-agents-and-indexing-models-go-learn)
> - [Vision](#-мечта-gb-vision)
> - [License](#-лицензия-gb-license)
> - [Links](#-ссылки-gb-links)
> - [Where to start?](#-с-чего-начать-gb-where-to-start)

---

## 🇷🇺 Кросс-платформенная цифровая память для человека и его ИИ-агентов (🇬🇧 Cross-platform digital memory for you and your AI agents)

![Workspace map: Agent CMS and connected agents / Карта workspace: Agent CMS и связанные агенты](docs/images/1.png)

![Agent CMS — graph visualization and atlas / Agent CMS — граф связей и атлас](docs/images/0.png)

🇷🇺 **[ru]**

**Старт в MCP-чате:** «Привет — выбери `<тестовое хранилище>`, загрузи контекст хранилища (необязательно) и документацию (необязательно).»

> 🇬🇧 **[en]**
>
> **Start an MCP chat:** “Hi — pick a `<test workspace>`, load the workspace context (optional), and the documentation (optional).”

![Chat with an agent: test workspace and context overview / Чат с агентом: тестовое хранилище и краткий обзор контекста](docs/images/6.png)

🇷🇺 **[ru]**

**Agent CMS** — оболочка для хранения заметок, документов, медиа, мыслей, секретов и других данных вместе с ИИ-агентом — по определённым правилам (каналы, страницы, темы, области, инфоблоки, репозитории).

Обычная папка на рабочем столе становится «продвинутой версией папки» — **хранилищем (workspace)**, в котором свободно ориентируются ИИ-агенты и человек (который плюс-минус всегда помнит структуру её содержимого, а если не помнит, то спрашивает агента).

Всё лежит в обычных файлах на диске (текст, таблицы настроек), без отдельной базы данных. Вы работаете через **Claude Desktop**, **Codex Desktop** и окно в браузере (редактор Agent CMS) — агент подключается по **MCP**. Вы и агент видите одно и то же содержимое — **общий ящик**.

**CMS** — Content Management System (система управления контентом) · **Context** Management System (система управления контекстом).

Карта идей и элементов системы (workspace), Mermaid — в корне: [README.diagram.md](README.diagram.md). На главной CMS показывается эта диаграмма.

---

> 🇬🇧 **[en]**
>
> **Agent CMS** is a shell for storing notes, documents, media, thoughts, secrets, and other data together with an AI agent — under clear rules (channels, pages, themes, areas, infoblocks, repositories).
>
> A normal folder on your desktop becomes an “upgraded folder” — a **workspace** where AI agents and you can navigate freely (you mostly remember what’s inside; when you don’t, you ask the agent).
>
> Everything lives in ordinary files on disk (text, YAML settings tables), with no separate database. You work through **Claude Desktop**, **Codex Desktop**, and a browser window (Agent CMS editor); the agent connects via **MCP**. You and the agent see the same content — a **shared box**.
>
> **CMS** — Content Management System · **Context** Management System.
>
> A map of ideas and system pieces (workspace), Mermaid — in the repo root: [README.diagram.md](README.diagram.md). The CMS home page shows this diagram.

## 🇷🇺 Приложения и клиенты (🇬🇧 Apps and clients)

| App | 🇷🇺 | 🇬🇧 |
| --- | --- | --- |
| **Agent CMS Editor** | Основной редактор: дерево папок, темы и области, настройки, поиск по материалам, память и MCP | Main editor: folder tree, themes and areas, settings, search, memory, and MCP |
| **Agent CMS Voice** (Flow Window) | Голосовой диалог с агентом — те же данные, с компьютера, телефона или в браузере | Voice dialog with the agent — same data from desktop, phone, or browser |
| **Agent CMS Control** (Launcher) | Запуск сервера, сборка desktop-приложений, зависимости и ярлыки | Start the server, build desktop apps, dependencies, and shortcuts |
| **Agent CMS Toolbar** | Панель на любой странице в браузере: что открыто на вкладке, ссылки и медиа, вставка в поля ввода — не уходя с сайта | Panel on any browser tab: what’s open, links and media, paste into inputs — without leaving the site |
| **Google Chrome extension** | Боковая панель на вкладке с shell и голосом; ставится из папки [`browser-extension/`](browser-extension/) (см. [инструкцию](browser-extension/README.md)) | Side panel on a tab with shell and voice; install from [`browser-extension/`](browser-extension/) ([guide](browser-extension/README.md)) |
| **Agent CMS Voice App (iPhone)** | Чисто голосовой коннект к вашему Agent CMS: говорите с агентом с телефона, без редактора и дерева — только микрофон, ответ и озвучка; проект в [`mobile/iphone-shell/`](mobile/iphone-shell/) | Voice-only link to your Agent CMS: talk to the agent from your phone — mic, reply, and TTS; project in [`mobile/iphone-shell/`](mobile/iphone-shell/) |

## 🇷🇺 Один workspace — три входа. UI, MCP и голос — разные интерфейсы, одно хранилище. (🇬🇧 One workspace — three entry points. UI, MCP, and voice are different interfaces, one store.)

![Agent CMS — editor and theme tree / редактор и дерево тем](docs/images/2.png)

![Capture from the browser and Agent Shell / Захват из браузера и Agent Shell](docs/images/3.png)

<p align="center">
  <img src="docs/images/5.jpeg" alt="Agent CMS Voice — voice client / голосовой клиент" />
</p>

🇷🇺 **[ru]**

На скриншотах: **редактор** с деревом тем и областей, **браузер** (захват вкладки и Agent Shell), **голос** (Voice) — разные интерфейсы, одно и то же хранилище на диске.

---

> 🇬🇧 **[en]**
>
> Above: the **editor** with the theme tree, the **browser** (tab capture and Agent Shell), and **voice** (Voice) — different interfaces, the same workspace on disk.

## 🇷🇺 Зачем (🇬🇧 Why)

![Agent via MCP: feed, indexes, and workspace diagnostics / Агент через MCP: лента, индексы и диагностика хранилища](docs/images/7.png)

🇷🇺 **[ru]**

Заметки, файлы и ссылки часто разбросаны по разным программам. В обычном чате с ИИ контекст между сессиями не сохраняется. Здесь всё в одном **хранилище (workspace)** — **три входа** (редактор, MCP, голос) и дерево **область → тема → слот → запись**: и вы, и агент знаете, **где искать** и **куда класть** новое. Формат — **Markdown и YAML** на диске, без отдельной БД; когда файлов становится много, помогают **индексы** (слова, смысл, связи). Со временем накапливается память и связи между областями. Источник правды — **диск**, не переписка. Данные остаются у вас: копировать, бэкапить и версионировать как обычные файлы.

---

> 🇬🇧 **[en]**
>
> Notes, files, and links often sit in different apps. In a normal AI chat, context doesn’t survive between sessions. Here everything lives in one **workspace** — **three entry points** (editor, MCP, voice) and a tree **area → theme → slot → record**: you and the agent know **where to look** and **where to put** new material. Format is **Markdown and YAML** on disk, no separate DB; when files pile up, **indexes** help (words, meaning, links). Over time you build memory and ties across areas. Source of truth is **disk**, not the chat. Data stays with you: copy, back up, and version like any files.

## 🇷🇺 Для кого (🇬🇧 Who it’s for)

<p align="center">
  <img src="docs/images/8.jpg" alt="One system for all incoming chaos / Единая система для всего входящего хаоса" />
</p>

🇷🇺 **[ru]**

- **Лично** — заметки, дела, обучение, здоровье, медиа в одном дереве; голосом записал — агент разложил по местам.
- **Команда** — общая база знаний: области по проектам, единые правила для людей и ИИ, MCP для корпоративных агентов (роли, журнал, vault-слоты — по мере внедрения).

---

> 🇬🇧 **[en]**
>
> - **Personal** — notes, tasks, learning, health, media in one tree; speak a thought — the agent files it in the right place.
> - **Teams** — shared knowledge base: areas per project, one rule set for people and AI, MCP for corporate agents (roles, journal, vault slots — as you roll them out).

## 🇷🇺 Как устроено — основные термины (🇬🇧 How it works — key terms)

🇷🇺 **[ru]**

**Платформа** — общая часть программы: типы записей, справочники и настройки, которые действуют для всех хранилищ.

**Хранилище (workspace)** — папка вашего проекта: разделы меню, темы, файлы с текстом и вложениями. У каждого агента может быть своё хранилище.

**Дерево** — раздел → тема → полка (слот) → файл-запись. Пример: «Работа» → «Ремонт» → «Документы» → `смета.md`. Структуру выстраиваете вы; жёсткого шаблона нет.

**Накопители (инфоблоки)** — для таблиц и списков с одинаковыми полями (расходы, контакты, справочники). Для свободных заметок и текстов удобнее дерево.

**Репозитории** — в workspace отдельная зона для своих проектов с кодом (клон git, краткое описание для агента в `manifest.md`); исходники не смешиваются с деревом заметок.

**Сайдкар (sidecar)** — рядом с фото или PDF лежит `.sidecar.md`: описание, теги и связи, когда в сам файл текст не положить.

**Служебное** — пароли в `.env`; временные индексы и кэш поиска в скрытой папке `.agent-cms/`.

**Поиск по хранилищу** — индексы пересобираются из ваших файлов; в UI и у агента (MCP) доступны разные режимы:

- **по словам** — точный полнотекстовый поиск в текстах и свойствах записей;
- **по смыслу** — «похожие по идее» фрагменты (семантический индекс, RAG);
- **гибрид** — слова + смысл + отбор по полям frontmatter в одном запросе (удобно агенту);
- **по полям** — каталог записей по типу, тегам, статусу и другим YAML-полям (SQL-подобные запросы);
- **по связям** — граф: кто ссылается на файл, куда ведут `[[wikilinks]]` и relation-поля (это не текстовый поиск).

Поиск можно **ограничить одной темой или областью** (фокус ◎ в шапке редактора — то же ограничение у MCP через `pathPrefix`). Отдельно — **банк фактов** (`awn-facts/`) и вопросы к архиву целиком. Детали инструментов: [GLOBAL-SKILL-1-BASE.md](GLOBAL-SKILL-1-BASE.md).

Все перечисленные термины **подробнее на интерактивной карте** (Mermaid, кликабельные узлы): [README.diagram.md](README.diagram.md) — на главной CMS открывается та же диаграмма.

---

> 🇬🇧 **[en]**
>
> **Platform** — shared program layer: record types, catalogs, and settings for all workspaces.
>
> **Workspace** — your project folder: menu sections, themes, text files and attachments. Each agent can have its own workspace.
>
> **Tree** — section → theme → shelf (slot) → file record. Example: “Work” → “Renovation” → “Documents” → `estimate.md`. You shape the structure; there’s no fixed template.
>
> **Infoblocks** — for tables and lists with the same fields (expenses, contacts, directories). For free-form notes, the tree is usually easier.
>
> **Repositories** — a separate zone in the workspace for code projects (git clone, short `manifest.md` for the agent); source code stays out of the notes tree.
>
> **Sidecar** — next to a photo or PDF, a `.sidecar.md` holds description, tags, and links when you can’t put text in the file itself.
>
> **Internals** — passwords in `.env`; temporary indexes and search cache in `.agent-cms/`.
>
> **Workspace search** — indexes rebuild from your files; UI and agent (MCP) support several modes:
>
> - **by words** — full-text search in bodies and properties;
> - **by meaning** — “similar idea” chunks (semantic index, RAG);
> - **hybrid** — words + meaning + frontmatter filters in one query (handy for agents);
> - **by fields** — catalog by type, tags, status, and other YAML fields (SQL-like queries);
> - **by links** — graph: who links to a file, where `[[wikilinks]]` and relation fields point (not plain text search).
>
> You can **limit search to one theme or area** (focus ◎ in the editor header — same limit for MCP via `pathPrefix`). Separately — **fact bank** (`awn-facts/`) and questions over the whole archive. Tool details: [GLOBAL-SKILL-1-BASE.md](GLOBAL-SKILL-1-BASE.md).
>
> All terms above are **expanded on the interactive map** (Mermaid, clickable nodes): [README.diagram.md](README.diagram.md) — the same diagram opens on the CMS home page.

## 🇷🇺 Принципы (🇬🇧 Principles)

🇷🇺 **[ru]**

1. **Общий язык** — одни правила для человека и агента.
2. **Файлы вместо БД** — контент на диске; индексы (смысл, слова, связи) пересобираются из файлов.
3. **Синергия 1+1** — вы ведёте порядок, агент помнит контекст и действует в хранилище.

---

> 🇬🇧 **[en]**
>
> 1. **Shared language** — one rule set for human and agent.
> 2. **Files over DB** — content on disk; indexes (meaning, words, links) rebuild from files.
> 3. **1+1 synergy** — you keep order; the agent remembers context and acts in the workspace.

## 🇷🇺 Стек (🇬🇧 Stack)

- **Node.js** — сервер, MCP, индексация, API
- **Файловое хранилище** — Markdown, YAML, JSON
- **SQLite** — семантический, полнотекстовый и link-индексы
- **MCP** — Cursor, Claude и другие агенты
- **Веб-UI** — vanilla JS, Toast UI Editor, Mermaid
- **Electron** — опциональные окна над тем же URL ([сборка и ярлыки](#-electron--сборка-app-и-ярлыки-gb-electron--build-app--shortcuts))
- **Голос** — voice-server, TTS, 3D-shell (Three.js)
- **OCR и медиа** — Tesseract.js, Sharp; Office/PDF

## 🇷🇺 Рекомендуемые требования (🇬🇧 Recommended requirements)

🇷🇺 **[ru]**

| | **macOS (локально)** | **Ubuntu VPS / сервер** |
| --- | --- | --- |
| **ОС** | macOS (Apple Silicon / Intel) | Ubuntu 22.04+ / Debian 12+; не Alpine на первом заходе |
| **Docker** | **Docker Desktop** + [`docker-compose.mac.yml`](docker-compose.mac.yml) | **Engine + Compose plugin** + [`docker-compose.linux.yml`](docker-compose.linux.yml) |
| **RAM** | 8 GB+ комфортно | мин. **2 GB**; комфорт **4 GB** |
| **Диск** | место под репо и workspaces | **30 GB+** NVMe; код в **`/opt/agent-cms`** |
| **Сеть** | localhost / LAN | публичный IPv4; **22 / 80 / 443** — [установщик / Linux](#-установка--установщик-mac--windows--linux-gb-install--installer) |
| **Не на сервере** | — | Electron, Control desktop, GUI |

Prod (TLS, reverse proxy): [TODO.SERVER.md](TODO.SERVER.md).

---

> 🇬🇧 **[en]**
>
> Prefer the **installer** (below), then daily ops via **`agent-cms-cli`** (`agent-cms` alias). Manual clone + compose blocks remain as fallback. Config: **`.env` in the repo**. Details: [DOCKER.md](docs/deploy/DOCKER.md). Legacy npm/`install-deps.sh` — image dev only. Roadmap: [TODO-REFACTOR-15.md](TODO-REFACTOR-15.md) (Q9.1 / Q9.2).

## 🇷🇺 Установка — установщик (Mac / Windows / Linux) (🇬🇧 Install — installer)

![Agent CMS Control — server and desktop apps / сервер и desktop-приложения](docs/images/4.png)

🇷🇺 **[ru]**

**Канон:** один раз ставите платформу через **установщик** (без ручного `git clone`), дальше в терминале работаете через **[CLI `agent-cms-cli`](#-cli-agent-cms-cli-gb-cli-agent-cms-cli)** — `start`, `status`, `update` и т.д. (алиас **`agent-cms`**).

| ОС | Куда кладётся код | Compose |
| --- | --- | --- |
| **macOS** | `~/agent-cms` → `/Users/<you>/agent-cms` | [`docker-compose.mac.yml`](docker-compose.mac.yml) |
| **Linux** | `~/agent-cms` → `/home/<you>/agent-cms` | [`docker-compose.mac.yml`](docker-compose.mac.yml) (desktop) или [`linux.yml`](docker-compose.linux.yml) |
| **Linux VPS** | `/opt/agent-cms` (`curl … \| bash -s -- --vps` или `--dir /opt/agent-cms`) | [`docker-compose.linux.yml`](docker-compose.linux.yml) |
| **Windows** | `C:\Users\<you>\agent-cms` или **WSL2** `~/agent-cms` | [`docker-compose.windows.yml`](docker-compose.windows.yml) |

**На шаге `curl | bash`:** нужны **git** и сеть; **Docker не обязателен** — установщик клонирует репо и ставит **`agent-cms-cli`** в `~/.local/bin` (и алиас `agent-cms`). PATH дописывается в `~/.profile` / `/etc/profile.d` (root). Stack поднимаете сами, когда Docker готов.

**Перед первым запуском CMS:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac / Windows) или **Engine + Compose** (Linux). **`.env`** уже в репозитории.

```bash
# macOS / Linux — без npm: clone + CLI
curl -fsSL https://raw.githubusercontent.com/iv-litovchenko/AgentCMS/main/scripts/install.sh | bash

# опции: --dir PATH · --vps (Linux /opt/agent-cms) · --start (Docker Running)
# из уже клонированного репо: bash scripts/install.sh

# Windows PowerShell → WSL2 + тот же install.sh
irm https://raw.githubusercontent.com/iv-litovchenko/AgentCMS/main/scripts/install.ps1 | iex
```

**После установки (порядок):**

```bash
# PATH — обычно уже после install; иначе:
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# Docker Desktop / Engine — должен быть Running

cd ~/agent-cms   # Linux desktop: ~/agent-cms · VPS: /opt/agent-cms (agent-cms-cli paths)

agent-cms-cli doctor          # git, docker, .env
agent-cms-cli rebuild         # первый раз: docker compose up -d --build (10–30+ мин)
agent-cms-cli start           # следующие запуски (без --build)
agent-cms-cli status          # HTTP ✓ + контейнеры

# start / rebuild на Mac печатают URL в терминал — браузер сами не открываем
agent-cms-cli open control    # открыть Control в браузере, если нужно
# старый автозапуск Safari/Chrome после start:
# AGENT_CMS_OPEN_BROWSER=1 agent-cms-cli start
```

Опционально (macOS, не для работы CMS в Docker):

```bash
agent-cms-cli electron-app build pack all   # все четыре .app в dist/ (то же, что build без аргументов)
agent-cms-cli electron-app shortcuts        # ярлыки ACMS-* на Desktop
```

Chrome Companion: папка `browser-extension/` → URL CMS **`http://127.0.0.1:3000`** (без `/app-chat`).

Обновление кода: **`agent-cms-cli update`** (`git pull` только). Стек после этого: **`agent-cms-cli rebuild`**.  
**Не нужно** после install: `npm install` на хосте для CMS, `npm run build:editor` — в репо уже есть `public/editor/main.built.js`.

Дальше: [скиллы](#-подключение-скиллов-для-агента--claude-codex-и-другие-gb-agent-skills--claude-codex-and-others) → [MCP](#-подключение-mcp-gb-mcp-connection).

> **NOTE**
> - 💡 **Mac:** после **`start`** / **`rebuild`** — по умолчанию только URL; автобраузер — **`AGENT_CMS_OPEN_BROWSER=1`** в `.env` или на команду (см. [`.env.example`](.env.example)).
> - 💡 Доставка **без npm**: [`scripts/install.sh`](scripts/install.sh) + symlink [`scripts/agent-cms`](scripts/agent-cms) → `~/.local/bin/agent-cms-cli` (и `agent-cms`). Конфиг: `~/.config/agent-cms/home`.
> - ⚠️ `curl | bash` / `irm | iex` — только с **доверенного** URL (официальный GitHub). [Ручная установка](#-установка--macos-gb-install--macos) — запасной путь.

---

> 🇬🇧 **[en]**
>
> **Canonical flow:** [`install.sh`](scripts/install.sh) once (no manual clone), then **`agent-cms-cli`** for daily ops (`agent-cms` alias). No npm publish. Manual blocks below = fallback.
>
> **After install:** PATH from profile / `profile.d` (or `export PATH="$HOME/.local/bin:$PATH"`) → Docker **Running** → `agent-cms-cli doctor` → **`agent-cms-cli rebuild`** (first time) → **`agent-cms-cli start`** → **`agent-cms-cli status`** → `agent-cms-cli open control`. Optional on Mac: **`agent-cms-cli electron-app build`** + **`shortcuts`**. No host **`npm install`** for CMS. Then [skills](#-подключение-скиллов-для-агента--claude-codex-и-другие-gb-agent-skills--claude-codex-and-others) and [MCP](#-подключение-mcp-gb-mcp-connection).

## 🇷🇺 Установка — macOS (🇬🇧 Install — macOS)

🇷🇺 **[ru]**

**Шпаргалка — Mac (канон: [установщик](#-установка--установщик-mac--windows--linux-gb-install--installer) + [`agent-cms-cli`](#-cli-agent-cms-cli-gb-cli-agent-cms-cli)):**

```text
# Mac — Agent CMS (шпаргалка)

Каталог платформы: ~/agent-cms  (CLI: AGENT_CMS_HOME или ~/.config/agent-cms/home)
Хранилища по умолчанию: ~/agent-cms/workspaces  (или AGENT_CMS_WORKSPACES_DIR в .env)

1) Docker Desktop — установить, запустить (статус Running)
   Compose V2: docker compose version  (отдельный docker-compose на Mac не нужен)

2) Установка репо + CLI (нужны git и сеть; Docker на этом шаге ещё не обязателен):
   curl -fsSL https://raw.githubusercontent.com/iv-litovchenko/AgentCMS/main/scripts/install.sh | bash
   PATH: ~/.local/bin  (при необходимости: export PATH="$HOME/.local/bin:$PATH")
   алиас: agent-cms  (= agent-cms-cli)

3) Docker Running → проверка:
   cd ~/agent-cms
   agent-cms-cli doctor

4) .env в корне репо — сменить changeme до первого rebuild (шаг 5):
   APP_LOCK_LOGIN / APP_LOCK_PASSWORD
   AGENT_CMS_MCP_TOKEN
   AGENT_CMS_PUBLIC_URL=http://127.0.0.1:3000
   AGENT_CMS_PUBLIC_DOMAIN=localhost
   опционально: AGENT_CMS_OPEN_BROWSER=1, AGENT_CMS_WORKSPACES_DIR=/Users/…/…

5) Первый подъём стека (10–30+ мин):
   agent-cms-cli rebuild
   agent-cms-cli status
   agent-cms-cli open control   # http://127.0.0.1:3000/app-control/

6) Доп. папки хранилищ (Desktop и т.д.):
   Control → «Папки хранилищ (Docker)» или MCP platform_workspace_mounts_*
   затем: agent-cms-cli restart  (или rebuild после смены mount/секретов)

7) MCP в Cursor / Claude (HTTP, не stdio):
   url: http://127.0.0.1:3000/app-mcp
   Authorization: Bearer <AGENT_CMS_MCP_TOKEN из .env>
   готовый JSON — Control → «MCP к агенту»

8) Скиллы — после MCP:
   в чат: «установи скиллы Agent CMS из GitHub» (GLOBAL-SKILL-*.md)
   минимум: agent-cms; желательно: agent-cms-rules, agent-cms-response-style

9) Дальше: agent-cms-cli start | stop | restart | update (+ rebuild после update)
   npm install / npm run build:editor на хосте для CMS не нужен (editor уже в репо)

10) Опционально (Mac, CMS в Docker не зависит от этого):
    Electron: agent-cms-cli electron-app build  (+ electron-app shortcuts — ярлыки на Desktop)
    Chrome Companion: browser-extension/ → URL CMS http://127.0.0.1:3000 (без /app-chat)

Порты (localhost, одна дверь :3000):
  Editor: http://127.0.0.1:3000/  ·  Control: …/app-control/  ·  MCP: …/app-mcp
  AGENT_CMS_EDITOR_HTTP_PORT по умолчанию 3000

Подробнее: DOCKER.md · скиллы и MCP — секции ниже в README
```

**Ручной путь** (если [установщик](#-установка--установщик-mac--windows--linux-gb-install--installer) ещё не используете). **Docker Compose V2** — `docker compose` (с пробелом). **`.env`** уже в репозитории.

```bash
# 1) Docker Desktop — https://www.docker.com/products/docker-desktop/
#    Установить, запустить, дождаться Running в меню. Compose V2 уже внутри Desktop.

git clone https://github.com/iv-litovchenko/AgentCMS.git
cd AgentCMS
docker compose version

# 2) Mac: cms-start.command (up) · cms-rebuild.command (первый раз / после server.js)
# ./cms-start.command

docker compose -f docker-compose.mac.yml up -d --build
# npm run docker:mac · npm run docker:down
# Control: http://127.0.0.1:3000/app-control/ · Editor: тот же хост (AGENT_CMS_PUBLIC_URL)
# Первый rebuild часто 10–30+ мин. Legacy npm: AGENT_CMS_WELCOME_LEGACY=1 cms-start.command
```

---

> 🇬🇧 **[en]**
>
> [Docker Desktop](https://www.docker.com/products/docker-desktop/) → clone → **`cms-rebuild.command`** then **`cms-start.command`**. Then [skills](#-подключение-скиллов-для-агента--claude-codex-и-другие-gb-agent-skills--claude-codex-and-others) and [MCP](#-подключение-mcp-gb-mcp-connection).

## 🇷🇺 Установка — Ubuntu VPS / сервер (🇬🇧 Install — Ubuntu VPS / server)

🇷🇺 **[ru]**

**Prod — Docker** ([`docker-compose.linux.yml`](docker-compose.linux.yml), Caddy **80/443**), [DOCKER.md](docs/deploy/DOCKER.md). На VPS код в **`/opt/agent-cms`** (`--vps`). **`.env` в git** — на VPS задайте домен, **`APP_LOCK_*`**, **`AGENT_CMS_MCP_TOKEN`** (см. [настройку `.env`](#-настройка--env-gb-configuration--env)).

**Канон:** сначала Docker + firewall, затем [установщик](#-установка--установщик-mac--windows--linux-gb-install--installer) (без ручного `git clone`) и дальше **[`agent-cms-cli`](#-cli-agent-cms-cli-gb-cli-agent-cms-cli)**. Наружу только **22, 80, 443** (Editor/Control/MCP через Caddy на **443**).

```bash
# === 1) Ubuntu VPS — Docker Engine ===
ssh root@ВАШ_IP
apt update && apt upgrade -y
apt install -y git curl ca-certificates

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker compose version

# === 2) Порты (панель хостинга + UFW) ===
apt install -y ufw
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Caddy'
ufw allow 443/tcp comment 'HTTPS Caddy'
ufw status numbered
ufw enable
# swap 2G на 1–2 GB RAM (опц.): fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile

# === 3) Agent CMS — установщик + CLI (Docker позже) ===
curl -fsSL https://raw.githubusercontent.com/iv-litovchenko/AgentCMS/main/scripts/install.sh | bash -s -- --vps
# PATH: install дописывает /etc/profile.d/agent-cms-cli.sh (root); иначе:
export PATH="$HOME/.local/bin:$PATH"
agent-cms-cli doctor
agent-cms-cli paths          # AGENT_CMS_HOME=/opt/agent-cms
# когда Docker Running:
agent-cms-cli rebuild        # первый up -d --build (10–30+ мин)
agent-cms-cli start          # следующие запуски
agent-cms-cli ps

# дальше: правки .env → agent-cms-cli restart или agent-cms-cli rebuild
# обновление кода: agent-cms-cli update  (только git pull --ff-only)
# затем стек: agent-cms-cli rebuild
# prod «Обновить» в Control — отдельно, git pull + rebuild (см. DOCKER.md)
# https://ваш-домен/ · https://ваш-домен/app-control/ · https://ваш-домен/app-mcp (Bearer token)
```

<details>
<summary>Ручной путь (git clone + compose)</summary>

```bash
mkdir -p /opt/agent-cms && cd /opt/agent-cms
git clone https://github.com/iv-litovchenko/AgentCMS.git .
docker compose -f docker-compose.linux.yml -f docker-compose.workspace-mounts.yml up -d --build
docker compose -f docker-compose.linux.yml ps
# или: npm run docker:linux · npm run docker:down:linux
```

</details>

---

> 🇬🇧 **[en]**
>
> VPS: Docker CE + **ufw 22/80/443**, then **`curl …/install.sh | bash`** (target **`/opt/agent-cms`**) and **`agent-cms-cli rebuild`**. Manual clone in the collapsible block. [DOCKER.md](docs/deploy/DOCKER.md).

## 🇷🇺 CLI `agent-cms-cli` (🇬🇧 CLI `agent-cms-cli`)

🇷🇺 **[ru]**

Утилита в **PATH** вместо длинных `docker compose -f …` и `.command`-файлов. Имя команды: **`agent-cms-cli`**; алиас **`agent-cms`** (тот же [`scripts/agent-cms`](scripts/agent-cms)).

**Конфиг:** каталог установки из [установщика](#-установка--установщик-mac--windows--linux-gb-install--installer) или env **`AGENT_CMS_HOME`**; compose-файл выбирается по ОС; URL — из `.env` (`AGENT_CMS_PUBLIC_URL`).

```bash
agent-cms-cli --version
agent-cms-cli doctor          # Docker, compose, каталог, порты
agent-cms-cli paths           # HOME, CLI, public URL + список workspace bind-mount (host → container)
agent-cms-cli status          # HTTP ping + docker compose ps (стек жив?)
agent-cms-cli maintenance status   # on | off (platform.yml maintenance-mode)
agent-cms-cli maintenance on       # 503 для Editor / Voice / Commander; Control открыт
agent-cms-cli maintenance off        # обычная работа (то же, что переключатель в Control)

agent-cms-cli start           # up -d (Mac: URL в терминал, без автобраузера)
agent-cms-cli stop
agent-cms-cli restart
agent-cms-cli down            # compose down (как npm run docker:down)
agent-cms-cli ps
agent-cms-cli logs            # поток (-f): cms, mcp, control, caddy (Linux)
agent-cms-cli logs snap       # снимок логов для чата (без -f, ~200 строк/сервис)
agent-cms-cli logs snap --tail 400

agent-cms-cli backup_zzz      # WIP: tar.gz workspaces → .backups/workspaces-*.tar.gz
agent-cms-cli backup_zzz /path/to/snap.tar.gz
agent-cms-cli restore_zzz .backups/workspaces-20261026.tar.gz
agent-cms-cli restore_zzz ARCHIVE --force

agent-cms-cli rebuild         # up -d --build (первый раз / после server.js)
agent-cms-cli update          # только git pull --ff-only (стек: rebuild)

agent-cms-cli env show        # ключи из .env.example; секреты → ***
agent-cms-cli env show --reveal KEY
agent-cms-cli env set KEY=VALUE   # whitelist .env.example; нужен Node.js

agent-cms-cli open editor
agent-cms-cli open control
agent-cms-cli open chat
agent-cms-cli open commander
agent-cms-cli open mcp-url    # URL + напоминание про Bearer token

agent-cms-cli electron-app build pack all     # все .app в dist/ (канон после update)
agent-cms-cli electron-app build              # то же (pack + all по умолчанию)
agent-cms-cli electron-app build dist         # dmg/zip …
agent-cms-cli electron-app build pack editor  # одно приложение
agent-cms-cli electron-app shortcuts          # ярлыки ACMS-* на Desktop (macOS)
# короче: agent-cms-cli electron build …

agent-cms-cli install         # делегат установщика (Q9.1)
agent-cms-cli uninstall       # symlink + ~/.config/agent-cms/home
agent-cms-cli uninstall --purge   # + compose down (каталог репо не удаляет)
```

| Группа | Команды | Сейчас без CLI |
| --- | --- | --- |
| **info** | `version`, `doctor`, `paths`, `status` | ручной curl/ping |
| **maintenance** | `maintenance status`, `maintenance on`, `maintenance off` (`enable`/`disable`) | Control → «Режим обслуживания» |
| **electron-app** | `electron-app build`, `electron-app shortcuts` | Control → «Собрать» / «Ярлыки» |
| **lifecycle** | `start`, `stop`, `restart`, `down`, `logs`, `ps` | `cms-start.command`, `npm run docker:*` |
| **backup_zzz** | `backup_zzz`, `restore_zzz` (WIP) | tar.gz `AGENT_CMS_WORKSPACES_DIR` (без `.agent-cms`) |
| **build** | `rebuild` | `cms-rebuild.command`, `--build` |
| **update** | `update` | Control → «Обновить» / `deploy-update` |
| **open** | `open editor\|chat\|control\|commander\|mcp-url` | копировать URL из README |
| **config** | `env show`, `env set` | MCP `platform_env_key_*` / Control |
| **install** | `install`, `uninstall` | [установщик](#-установка--установщик-mac--windows--linux-gb-install--installer) |

> **NOTE**
> - 💡 Локально без установщика: `export AGENT_CMS_HOME=/path/to/AgentCMS` или `./scripts/agent-cms …` из корня репо.
> - 💡 **`agent-cms-cli update`** = только `git pull --ff-only`. Пересборка стека — отдельно **`rebuild`**. Кнопка Control «Обновить» по-прежнему pull + rebuild.
> - 📌 Fallback: **`cms-start.command`**, **`npm run docker:mac`** / **`docker:linux`** ([package.json](package.json)).
> - 💡 Разработчикам в клоне: **`npm run cms:status`** = **`agent-cms-cli status`** при `AGENT_CMS_HOME=$PWD`.

---

> 🇬🇧 **[en]**
>
> **`agent-cms-cli`** ([`scripts/agent-cms`](scripts/agent-cms)) wraps compose/git — no npm package required for daily ops. Alias **`agent-cms`**. Electron .app: **`agent-cms-cli electron-app build`** (alias: **`electron build`**).

## 🇷🇺 Electron — сборка `.app` и ярлыки (🇬🇧 Electron — build `.app` & shortcuts)

🇷🇺 **[ru]**

**Канон:** сервер — **Docker** (или dev `npm start`); Electron **не поднимает CMS**, только открывает **`AGENT_CMS_PUBLIC_URL`** + path (`/`, `/app-chat/`, `/app-control/`, `/app-commander/`). Подробнее: [`desktop/README.md`](desktop/README.md). Legacy (встроенный сервер): **`AGENT_CMS_ELECTRON_LEGACY=1`**.

**Порядок:** `start` → `status` → **`electron-app build`** → **`electron-app shortcuts`**. Только **macOS**, **Node на хосте**; CLI — каталог **`AGENT_CMS_HOME`** (dev: клон `YamlCMS`, иначе `~/agent-cms`).

**Схема:** `agent-cms-cli electron-app build [pack|dist] [all|editor|chat|control|commander]` · короче: **`electron build …`**. Без аргументов = **pack + все 4**. **`pack`** / **`dist`** и имя app — в любом порядке.

```bash
agent-cms-cli start          # Docker: CMS + MCP + Control
agent-cms-cli status         # HTTP + docker ps

# --- pack (по умолчанию): только .app в dist/ — себе, ярлыки, двойной клик ---
agent-cms-cli electron-app build pack all
# (короче: agent-cms-cli electron-app build)
# → dist/agent-cms/Agent CMS.app
# → dist/agent-shell/Agent Shell.app
# → dist/agent-control/Agent CMS Control.app
# → dist/agent-commander/Agent CMS Commander.app

agent-cms-cli electron-app build editor      # одно: Editor
agent-cms-cli electron-app build chat        # одно: Chat (Shell)
agent-cms-cli electron-app build control
agent-cms-cli electron-app build commander

# --- dist: .app + установщик (.dmg / .zip) — другому Mac; Docker CMS не ставит ---
agent-cms-cli electron-app build dist                    # все четыре + dmg каждому
agent-cms-cli electron-app build dist chat               # Chat → dist/agent-shell/*.dmg

# --- ярлыки на Рабочий стол (симлинки; нужна сборка) ---
agent-cms-cli electron-app shortcuts
# ACMS-Editor, ACMS-Chat, ACMS-Control, ACMS-Commander, ACMS-Browser-Extension (папка chrome)
agent-cms-cli electron shortcuts

# типично: start → status → electron-app build pack all → electron-app shortcuts
# один модуль: electron-app build pack editor
```

Control в браузере: «Приложения» → «Собрать» / «Ярлыки Desktop». **`agent-cms-cli electron-app help`**

<details>
<summary>Разработчикам (npm в корне репо)</summary>

```bash
npm run cms:electron-build
npm run cms:electron-build:dist
npm run cms:desktop   # dev-окно без сборки
```

</details>

---

> 🇬🇧 **[en]**
>
> **`electron-app build [pack|dist] [all|editor|chat|control|commander]`** — shortcuts: **ACMS-Editor**, **ACMS-Chat**, **ACMS-Control**, **ACMS-Commander**. See [`desktop/README.md`](desktop/README.md).

## 🇷🇺 Настройка — `.env` (🇬🇧 Configuration — `.env`)

🇷🇺 **[ru]**

Рабочий файл — **`.env` в корне репозитория** (шаблон — [`.env.example`](.env.example)). Его читают **Docker Compose**, **CMS / Control / MCP** и клиенты (публичный URL, токены). На **VPS** обязательно задайте **`AGENT_CMS_PUBLIC_URL`**, **`AGENT_CMS_PUBLIC_DOMAIN`**, **`APP_LOCK_*`**, **`AGENT_CMS_MCP_TOKEN`**. На **Mac** чаще достаточно пароля и MCP-токена; остальное — по умолчанию из example.

После правок: `docker compose … up -d` (пересоздать контейнеры, если меняли mount или секреты). В **Control** — редактор `.env` / `.env.example`; через MCP — **`platform_env_keys_list`**, **`platform_env_key_read`**, **`platform_env_key_write`** (запись — app-lock). Краткий справочник: [docs/env-reference.md](docs/env-reference.md).

**Несколько папок с хранилищами (Docker):** по умолчанию один корень **`./workspaces`** (или **`AGENT_CMS_WORKSPACES_DIR`** в `.env`). Дополнительные каталоги на Mac/VPS — секция **«Папки хранилищ (Docker)»** в Control или MCP **`platform_workspace_mounts_list`** / **`platform_workspace_mounts_write`** (запись — app-lock). CMS пишет **`.agent-cms-global/workspace-mounts.json`** и обновляет **`docker-compose.workspace-mounts.yml`** (в git, один файл на Mac и VPS); после сохранения — **рестарт stack** (`docker compose -f … -f docker-compose.workspace-mounts.yml up -d`). Подробнее: [docs/deploy/DOCKER.md](docs/deploy/DOCKER.md#docker-workspace-mounts).

**Ключи из `.env.example`** (whitelist платформы):

| Ключ | 🇷🇺 Назначение | 🇬🇧 Purpose | Пример / Example |
| --- | --- | --- | --- |
| **`APP_LOCK_LOGIN`** | Логин app-lock (Control, ops, запись `.env` через MCP) | App-lock login | `admin` |
| **`APP_LOCK_PASSWORD`** | Пароль app-lock | App-lock password | смените с `changeme` |
| **`APP_LOCK_APPS`** | UI-приложения под паролем (через запятую) | Password-gated apps | `editor,chat,commander,control` |
| **`AGENT_CMS_HTTP_TO_HTTPS`** | `1` — редирект HTTP→HTTPS **внутри CMS**; на VPS с **Caddy** оставьте **`0`** | In-CMS HTTP→HTTPS redirect | `0` |
| **`AGENT_CMS_WORKSPACES_DIR`** | Основной каталог на **хосте** → `/app/workspaces` (workspace = **подпапки**). Доп. корни — **workspace-mounts** (Control / MCP), не правка базового compose | Primary host workspaces mount | `./workspaces` или `/Users/…/AgentCMS-workspaces` |
| **`AGENT_CMS_PUBLIC_URL`** | Публичный базовый URL (**Editor, `/app-control`, `/app-mcp`, Electron**) | Public base URL | Mac: `http://127.0.0.1:3000` · VPS: `https://ваш-домен` |
| **`AGENT_CMS_SINGLE_HTTP_DOOR`** | `1` — одна HTTP-дверь, пути `/app-*` на CMS; `0` — legacy dev с отдельными портами | Single HTTP door + path routes | `1` |
| **`AGENT_CMS_EXPOSE_INTERNAL_PORTS`** | `1` — проброс отдельных портов (legacy **npm start**); в Docker обычно не нужно | Expose legacy dev ports | закомментирован / `0` |
| **`AGENT_CMS_SITE_TITLE`** | Заголовок сайта в UI | Site title | `Agent CMS` |
| **`AGENT_CMS_PUBLIC_DOMAIN`** | Домен для **Caddy** (VPS) | Caddy site domain | `example.com` |
| **`AGENT_CMS_CADDY_EMAIL`** | Email для **Let's Encrypt** (Caddy) | ACME email | `admin@example.com` |
| **`AGENT_CMS_MCP_TOKEN`** | Bearer-токен для **`/app-mcp`** и MCP-клиентов | MCP Bearer token | длинный секрет |
| **`AGENT_CMS_MCP_ICON_URL`** | *(опц.)* Своя иконка для Claude/Cursor; иначе **`{AGENT_CMS_PUBLIC_URL}/app-mcp/icon`** (PNG) | MCP connector icon URL | `https://ваш-домен/app-mcp/icon` |
| **`AGENT_CMS_MCP_ALLOWED_HOSTS`** | Разрешённые `Host` для MCP (через запятую) | MCP Host allowlist | `localhost,127.0.0.1` (+ ваш домен на VPS) |
| **`AGENT_CMS_MCP_BASE64_MAX_BYTES`** | Макс. **декодированный** размер для MCP base64 (`content_binary_write`, `content_write` `data=…`); больше — `content_binary_upload_*` | MCP base64 upload cap (decoded bytes) | `1048576` (1 MiB; можно меньше) |
| **`AGENT_CMS_LIST_DEFAULT_LIMIT`** | Размер страницы по умолчанию для MCP **`contents_list_*`** (max 100) | Default MCP list page size | `20` |
| **`AGENT_CMS_LIST_DEFAULT_MAX_DEPTH`** | Default **`maxDepth`** для **`contents_list_tree`** | Default list tree depth | `3` |
| **`AGENT_CMS_LIST_ALLOW_PREVIEW`** | `0` — отключить body snippets в list preview | Disable list body snippets | `1` |
| **`AGENT_CMS_DEPLOY_UPDATE_ENABLED`** | `1` — кнопка «Обновить» в Control (**git pull + rebuild**) | Control deploy update button | `0` / `1` на VPS по желанию |
| **`AGENT_CMS_DEPLOY_PLATFORM`** | Подпись платформы в Control: **`mac`** \| **`linux`** \| **`windows`** | Control platform chip | в compose часто уже задано |
| **`WEB_SEARCH_MODE`** | Режим веб-поиска в MCP | Web search mode | `direct` |
| **`GOOGLE_SEARCH_API_KEY`** | Google Custom Search API key (если используете) | Google CSE API key | пусто / ключ |
| **`GOOGLE_SEARCH_ENGINE_ID`** | ID поисковой машины (cx) | Google CSE engine ID | пусто / id |
| **`GOOGLE_SEARCH_LANG`** | Язык запросов | Query language | `ru` |
| **`GOOGLE_SEARCH_COUNTRY`** | Страна (регион) | Country bias | `RU` |
| **`GOOGLE_SEARCH_GL`** | Параметр `gl` | Google `gl` | `ru` |
| **`GOOGLE_SEARCH_SAFE`** | SafeSearch | SafeSearch level | `active` |

**Дополнительно в Compose** (можно задать в `.env`, в `.env.example` не дублируются):

| Ключ | 🇷🇺 · 🇬🇧 | Пример |
| --- | --- | --- |
| **`AGENT_CMS_EDITOR_HTTP_PORT`** | Порт CMS на localhost (Mac) · CMS host port | `3000` |
| **`AGENT_CMS_HOST_PROJECT`** | Путь к репо на хосте (mount `.env`, compose) · Repo path on host | `.` |
| **`AGENT_CMS_IMAGE_TAG`** | Тег образа · Image tag | `local` |
| **`VOICE_AUTOSTART`** | Автостарт Voice в контейнере cms · Voice autostart in cms | `1` |
| **`AGENT_CMS_MCP_BEHIND_PROXY`** | MCP за reverse-proxy (Mac `0`, Linux `1`) · MCP behind proxy | Mac `0` |
| **`MCP_LEGACY_ALIASES`** | `1` — deprecated MCP names (aliases + `get_topic_map`, `get_content_map`); по умолчанию **выкл.** (~270 канон.) · Deprecated MCP tool names | пусто / `0` |
| **`MCP_LEGACY_TOOLS`** | `1` — legacy FS/path tools (`read_file`, `upload_file`, `read_content_body`, …); по умолчанию **выкл.** · Legacy MCP FS tools | пусто / `0` |

**Хост / CLI (часть — в [`.env.example`](.env.example), не в whitelist MCP):**

| Переменная | 🇷🇺 | 🇬🇧 | Пример |
| --- | --- | --- | --- |
| **`AGENT_CMS_OPEN_BROWSER`** | **Mac:** `1` — после **`start`** / **`rebuild`** открыть Control в браузере; `0` — только URL | Mac auto-open Control after start | в `.env` или `AGENT_CMS_OPEN_BROWSER=1 agent-cms-cli start` |
| **`AGENT_CMS_ELECTRON_LEGACY`** | Electron `.app` со встроенным сервером (не URL-shell) | Electron embedded server mode | `1` |
| **`AGENT_CMS_HOME`** | Каталог репо для CLI (иначе `~/.config/agent-cms/home`) | CLI repo root | `~/agent-cms` |

> **NOTE**
> - 💡 Не используйте устаревшие **`PORT` / `TLS_PORT` / `MAPTEX_DOMAIN`** как главный URL — канон **`AGENT_CMS_PUBLIC_URL`** ([docs/env-reference.md](docs/env-reference.md)).
> - ⚠️ Секреты (**`APP_LOCK_PASSWORD`**, **`AGENT_CMS_MCP_TOKEN`**, **`GOOGLE_SEARCH_API_KEY`**) не коммитьте; на VPS — уникальные значения.

---

> 🇬🇧 **[en]**
>
> Edit **`.env`** at the repo root ([`.env.example`](.env.example)). Table above lists every **whitelist** key; use **`AGENT_CMS_PUBLIC_URL`**, domain, app-lock, and MCP token on production. Optional Compose / MCP-process keys in the second table (**`MCP_LEGACY_*`** — [mcp-server/README.md](mcp-server/README.md)). MCP: **`platform_env_keys_list`**. Details: [docs/env-reference.md](docs/env-reference.md).

## 🇷🇺 Подключение скиллов для агента — Claude, Codex и другие (🇬🇧 Agent skills — Claude, Codex, and others)

Исходники — **`GLOBAL-SKILL-*.md`** в [корне репозитория на GitHub](https://github.com/iv-litovchenko/AgentCMS). Каждый файл — markdown с YAML frontmatter (`name`, `description`).

| 🇷🇺 Файл · 🇬🇧 File | 🇷🇺 Скилл · 🇬🇧 Skill | 🇷🇺 Зачем · 🇬🇧 Purpose |
| --- | --- | --- |
| [GLOBAL-SKILL-0-MCP-WELCOME.md](GLOBAL-SKILL-0-MCP-WELCOME.md) | `agent-cms-welcome` | 🇷🇺 Ввод, старт MCP, карта скиллов<br>🇬🇧 Intro, MCP start, skill map |
| [GLOBAL-SKILL-1-BASE.md](GLOBAL-SKILL-1-BASE.md) | `agent-cms` | 🇷🇺 Хранилище и MCP tools<br>🇬🇧 Workspace and MCP tools |
| [GLOBAL-SKILL-2-RESPONSE-STYLE.md](GLOBAL-SKILL-2-RESPONSE-STYLE.md) | `agent-cms-response-style` | 🇷🇺 Стиль ответов (🗄️ / 🌐 / 💭)<br>🇬🇧 Reply style (🗄️ / 🌐 / 💭) |
| [GLOBAL-SKILL-3-RULES.md](GLOBAL-SKILL-3-RULES.md) | `agent-cms-rules` | 🇷🇺 Глобальные правила<br>🇬🇧 Global rules |
| [GLOBAL-SKILL-4-MARKDOWN.md](GLOBAL-SKILL-4-MARKDOWN.md) | `agent-cms-markdown` | 🇷🇺 Разметка в md<br>🇬🇧 Markdown in records |
| [GLOBAL-SKILL-5-SEARCH.md](GLOBAL-SKILL-5-SEARCH.md) | `agent-cms-search` | 🇷🇺 Поиск, индексы, DQL<br>🇬🇧 Search, indexes, DQL |
| [GLOBAL-SKILL-6-MODULES.md](GLOBAL-SKILL-6-MODULES.md) | `agent-cms-modules` | 🇷🇺 Git и модули<br>🇬🇧 Git and modules |
| [GLOBAL-SKILL-7-VIZ-MAPS.md](GLOBAL-SKILL-7-VIZ-MAPS.md) | `agent-cms-viz` | 🇷🇺 Карты `*.viz.md`, «Атлас», `viz_map_*`<br>🇬🇧 Viz maps `*.viz.md`, Atlas, `viz_map_*` |

**Как установить**

1. Сначала [подключите MCP](#-подключение-mcp-gb-mcp-connection).
2. **Cursor / Codex / Claude Code** — для каждого скилла: `.cursor/skills/<name>/SKILL.md` с **полным** текстом `GLOBAL-SKILL-*.md` (имя папки = поле `name`) или попросите агента поставить скиллы из GitHub.
3. **Claude Desktop** — **Settings → Capabilities → Skills**: файлы из корня репо. Минимум **`agent-cms`**; **`agent-cms-welcome`** — по желанию.
4. Рекомендуется также **`agent-cms-response-style`** и **`agent-cms-rules`** — они **не** входят в `get_session_context`.
5. **Без установки:** `list_platform_docs` → `read_platform_doc({ path: "GLOBAL-SKILL-1-BASE.md" })`.

После `git pull` обновите копии в клиенте и перезапустите MCP.

---

> 🇬🇧 **[en]**
>
> **Install:** [MCP](#-подключение-mcp-gb-mcp-connection) first; copy into `.cursor/skills/<name>/SKILL.md` or ask the agent to install from GitHub. Minimum **`agent-cms`**; add **response-style** and **rules**. Fallback: `read_platform_doc`. Refresh after `git pull`.

## 🇷🇺 Подключение MCP (🇬🇧 MCP connection)

🇷🇺 **[ru]**

Сначала запущен CMS (Mac или VPS). Подробнее: [docs/connectors/README.md](docs/connectors/README.md) · инстансы: [TODO.MCP-INSTANCES.md](TODO.MCP-INSTANCES.md).

**Cursor · Claude Desktop · другие MCP-клиенты (канон — HTTP):**

```json
{
  "mcpServers": {
    "agent-cms": {
      "url": "http://127.0.0.1:3000/app-mcp",
      "headers": {
        "Authorization": "Bearer ВАШ_AGENT_CMS_MCP_TOKEN"
      }
    }
  }
}
```

Подставьте **`AGENT_CMS_MCP_TOKEN`** из `.env`. Mac/Docker: **`AGENT_CMS_PUBLIC_URL`** (часто `http://127.0.0.1:3000`) — тот же хост в `url`. VPS: `https://ваш-домен/app-mcp` (наружу только **80/443**, не порт MCP). Готовый JSON — **Control** → шаг «MCP к агенту» или **`/app-control/`**.

> ⚠️ **`node mcp-server/index.js` (stdio)** — legacy dev без Docker; в prod и в доке **не используем**.

**Большие файлы (фото, pdf):** без base64 в чате — `content_binary_upload_begin` → **PUT** `putUrl` → `content_binary_upload_complete` (подробнее: [GLOBAL-SKILL-1-BASE.md](GLOBAL-SKILL-1-BASE.md) §5).

Legacy MCP: **`MCP_LEGACY_ALIASES`**, **`MCP_LEGACY_TOOLS`** — см. [таблицу `.env`](#-настройка--env-gb-configuration--env) (блок «Дополнительно в Compose»).

---

> 🇬🇧 **[en]**
>
> **HTTP only:** `{PUBLIC_URL}/app-mcp` + Bearer **`AGENT_CMS_MCP_TOKEN`**. Set **`AGENT_CMS_PUBLIC_URL`** for upload `putUrl` and MCP icons. Control guide copies the JSON. Large files: `content_binary_upload_begin` → PUT → `content_binary_upload_complete`. See [docs/connectors/README.md](docs/connectors/README.md). Legacy MCP env: [Configuration — `.env`](#-настройка--env-gb-configuration--env). Stdio `node mcp-server` — dev-only, not documented as equal.

## 🇷🇺 Канон MCP `user-agent-cms` (🇬🇧 MCP tool map `user-agent-cms`)

**🟢** канон · **⚪** на тестировании · **🟡** stub / идея · **🔴** на проверке · **🔵** черновик (REST есть, MCP — в работе) · **Итого 🟢: 227** · **⚪** 4 · **🟡** 34 · **🔴** 0 · **🔵** 8

```
user-agent-cms
│
├── ⚙️ Платформа (Platform) · 10
│   ├── 🟢 platform_info_get
│   ├── 🟢 platform_health_get
│   ├── 🟢 platform_docs_list
│   ├── 🟢 platform_doc_read
│   ├── 🟢 platform_config_list
│   ├── 🟢 platform_apps_list
│   ├── 🟢 platform_env_keys_list
│   ├── 🟢 platform_env_key_read
│   ├── 🟢 platform_env_key_write
│   ├── 🟢 platform_workspace_mounts_list
│   ├── 🟢 platform_workspace_mounts_write
│   ├── 🟢 platform_types_list
│   └── 🟢 platform_type_get
│
├── 🎛 Настройки (Settings) · 3
│   ├── 🟢 settings_list
│   ├── 🟢 setting_read
│   └── 🟢 setting_write
│
├── 🚀 Старт и workspace (Start & workspace) · 20
│   ├── 🟢 workspaces_list
│   ├── 🟢 workspaces_scan
│   ├── 🟢 workspace_create
│   ├── 🟢 workspace_register
│   ├── 🟢 workspace_update
│   ├── 🟢 workspace_default_set
│   ├── 🟢 workspace_orchestrator_set
│   ├── 🟢 workspace_groups_list
│   ├── 🟢 workspace_group_create
│   ├── 🟢 workspace_group_update
│   ├── 🟢 workspace_group_delete
│   ├── 🟢 workspace_group_assign
│   ├── 🟢 workspace_group_unassign
│   ├── 🟢 workspace_groups_reorder
│   ├── 🟢 workspace_dependencies_read
│   ├── 🟢 workspace_dependencies_write
│   ├── 🟢 workspace_summary_get
│   ├── 🟢 workspace_activity_list
│   ├── 🟢 workspace_feed_list
│   └── 🟢 workspace_memory_audit
│
├── 🎬 Сессия (Session) · 22
│   ├── 🟢 session_context_get
│   ├── 🟢 session_context_get_user_open_url_location_in_ui
│   ├── Профили agent-kit (session_profile_*) · 3
│   │   ├── 🟢 session_profile_agent_get
│   │   ├── 🟢 session_profile_user_get
│   │   └── 🟢 session_profile_organization_get
│   ├── 🟢 session_list_always_context
│   ├── 🟢 session_list_cron
│   ├── 🟢 session_list_heartbeat
│   ├── 🟢 session_list_in_focus
│   ├── 🟢 session_list_on_main
│   ├── Заметка (Note) · 2
│   │   ├── 🟢 session_note_read
│   │   └── 🟢 session_note_write
│   ├── Todo (Todo) · 2
│   │   ├── 🟢 session_todo_read
│   │   └── 🟢 session_todo_write
│   ├── Буфер контекста (Context buffer) · 6
│   │   ├── 🟢 session_context_buffer_items_read
│   │   ├── 🟢 session_context_buffer_items_append
│   │   ├── 🟢 session_context_buffer_items_remove
│   │   ├── 🟢 session_context_buffer_items_clear
│   │   ├── 🟢 session_context_buffer_text_read
│   │   └── 🟢 session_context_buffer_text_write
│   ├── Буфер обмена (Clipboard) · 5
│   │   ├── 🟡 session_clipboard_copy_zzz — идея: положить запись/файл в буфер
│   │   ├── 🟡 session_clipboard_cut_zzz — идея: как copy, при вставке переносит
│   │   ├── 🟡 session_clipboard_paste_zzz — идея: вставить в target placement
│   │   ├── 🟡 session_clipboard_read_zzz — идея: что сейчас в буфере
│   │   └── 🟡 session_clipboard_clear_zzz — идея: очистить
│
├── ⏱ Time tracker (Трекер времени) · 4
│   ├── 🟡 time_tracker_activity_start_zzz — идея: старт (workspace, тема, «зал», таймер)
│   ├── 🟡 time_tracker_activity_stop_zzz — идея: стоп текущей активности
│   ├── 🟡 time_tracker_entry_log_zzz — идея: запись задним числом или длительностью
│   └── 🟡 time_tracker_summary_zzz — идея: отчёт за период (workspace, category, label)
│
├── 🔗 Record links (Ссылки записи) · 2
│   ├── 🟡 record_links_outgoing_get_zzz — идея: на кого/что ссылается (wikilinks, md, assets)
│   └── 🟡 record_links_incoming_get_zzz — идея: кто ссылается на эту запись
│
├── 🔀 Transfer (Между хранилищами) · 4
│   ├── 🟡 transfer_record_zzz — идея: одна запись (.md, manifest, sidecar) A → B
│   ├── 🟡 transfer_record_binary_zzz — идея: один бинарник (media, awn-storage) A → B
│   ├── 🟡 transfer_record_plan_zzz — идея: plan зависимых записей/бинарников + конфликты
│   └── 🟡 transfer_record_plan_execute_zzz — идея: выполнить plan (серия transfer_*)
│
├── 📋 Запросы реестра (Registry queries) · 2
│   ├── 🟢 registry_queries_list
│   └── 🟢 registry_query_run
│
├── 🧭 Навигация (Navigation) · 14
│   ├── 🟢 nav_map_workspace_read
│   ├── 🟢 nav_map_workspace_refresh
│   ├── 🟢 nav_index_toc_topics_read
│   ├── 🟢 nav_index_toc_topics_refresh
│   ├── 🟢 nav_index_toc_contents_read
│   ├── 🟢 nav_index_toc_contents_refresh
│   ├── 🟢 nav_index_toc_databases_read
│   ├── 🟢 nav_index_toc_databases_refresh
│   ├── 🟢 nav_index_toc_channels_read
│   ├── 🟢 nav_index_toc_channels_refresh
│   ├── 🟢 nav_index_toc_repositories_read
│   ├── 🟢 nav_index_toc_repositories_refresh
│   ├── 🟢 nav_index_toc_media_libraries_read
│   └── 🟢 nav_index_toc_media_libraries_refresh
│
├── 🎨 Визуализация — карты `*.viz.md` (Viz maps) · 6
│   ├── 🟢 viz_map_types_list — реестр видов (mindmap, roadmap…; `awn-system/types/viz/`)
│   ├── 🟢 viz_maps_all_list — все карты workspace (фильтр kind / recordPath / section; UI «Атлас»)
│   ├── 🟢 viz_maps_for_record — карты по записи (ожидаемый путь + есть ли файл)
│   ├── 🟢 viz_map_read — прочитать карту (mapPath или recordPath + kind)
│   ├── 🟢 viz_map_write — создать/обновить (`recordPath`, `kind`, `content`; `{stem}.{kind}.viz.md`)
│   └── 🟢 viz_map_delete — удалить карту
│
├── 📚 Темы (Topics) · 23
│   ├── 🟢 topics_list
│   ├── 🟢 topic_get
│   ├── 🟢 topic_meta_get
│   ├── 🟢 topic_exists
│   ├── 🟢 topic_slots_template_get
│   ├── 🟢 topic_slots_template_set
│   ├── 🟢 topic_body_read
│   ├── 🟢 topic_body_write
│   ├── 🟢 topic_properties_read
│   ├── 🟢 topic_properties_write
│   ├── 🟢 topic_property_read
│   ├── 🟢 topic_property_write
│   ├── 🟢 topic_schema_read
│   ├── 🟢 topic_schema_write
│   ├── 🟢 topic_config_read
│   ├── 🟢 topic_config_write
│   ├── 🟢 topic_env_read
│   ├── 🟢 topic_env_write
│   ├── 🟢 topic_create
│   ├── 🟢 topic_update
│   ├── 🟢 topic_delete
│   ├── 🟢 topic_rename
│   └── 🟢 topic_move
│
├── 📄 Контент (Content) · 27
│   ├── 🟢 contents_list — entries одного уровня (limit/cursor, parent)
│   ├── 🟢 contents_count — число файлов в слоте (те же placement/filters, без списка)
│   ├── 🟢 contents_list_sections — только разделы (sections)
│   ├── 🟢 contents_list_tree — скелет дерева (maxDepth)
│   ├── 🟢 contents_list_preview — entries + snippet тела (.md)
│   ├── 🟢 contents_list_full — legacy: весь список без пагинации
│   ├── 🟢 content_read
│   ├── 🟢 content_write
│   ├── 🟢 content_binary_read
│   ├── 🟢 content_binary_write
│   ├── 🟢 content_binary_write_from_url
│   ├── 🟢 content_binary_upload_begin
│   ├── 🟢 content_binary_upload_complete
│   ├── 🟢 content_binary_upload_abort
│   ├── 🟢 content_binary_upload_status
│   ├── 🟢 content_binary_metadata_get
│   ├── 🟢 content_exists
│   ├── 🟢 content_meta_get
│   ├── 🟢 content_property_read
│   ├── 🟢 content_property_write
│   ├── 🟢 content_create
│   ├── 🟢 content_delete
│   ├── 🟢 content_rename
│   ├── 🟢 content_move
│   ├── 🟢 content_split
│   ├── 🟢 content_merge
│   ├── 🟢 contents_slots_list
│   └── 🔵 contents_list_reconcile — сверка списка id/path из памяти агента с диском (`POST /api/content/reconcile`; краткий diff + meta)
│
├── 🗃 Базы (Databases) · 13
│   ├── 🟢 databases_list
│   ├── 🟢 database_get — slim hub (без records/schema blob)
│   ├── 🟢 database_get_full — legacy полный store с API
│   ├── 🟢 database_register
│   ├── 🟢 database_update
│   ├── 🟢 database_delete
│   ├── 🟢 database_rename
│   ├── 🟢 database_schema_read
│   ├── 🟢 database_schema_write
│   ├── 🟢 database_properties_read
│   ├── 🟢 database_properties_write
│   ├── 🟢 database_property_read
│   └── 🟢 database_property_write
│
├── 📡 Каналы (Channels) · 6
│   ├── 🟢 channels_list
│   ├── 🟢 channel_get
│   ├── 🟢 channel_register
│   ├── 🟢 channel_update
│   ├── 🟢 channel_delete
│   └── 🟢 channel_rename
│
├── 🖼 Медиатеки (Media libraries) · 6
│   ├── 🟢 media_libraries_list
│   ├── 🟢 media_library_get
│   ├── 🟢 media_library_register
│   ├── 🟢 media_library_update
│   ├── 🟢 media_library_delete
│   └── 🟢 media_library_rename
│
├── 📦 Репозитории (Repositories) · 6
│   ├── 🟢 repositories_list
│   ├── 🟢 repository_get
│   ├── 🟢 repository_register
│   ├── 🟢 repository_update
│   ├── 🟢 repository_delete
│   └── 🟢 repository_rename
│
├── 🔍 Поиск и индексы (Search & indexes) · 27
│   ├── 0. Запрос (Query) · 2
│   │   ├── 🟢 query_workspace_ask — архив + always-context (сейчас)
│   │   └── 🟡 search_workspace_zzz — идея: один поиск, mode hybrid|fulltext|links|storage
│   ├── 1. OCR (OCR) · 1
│   │   └── 🟡 index_1_ocr_run_zzz
│   ├── 2. Слова (Fulltext) · 2
│   │   ├── 🟢 index_2_fulltext_search_query
│   │   └── 🟢 index_2_fulltext_rebuild
│   ├── 3. Смысл (Semantic) · 3
│   │   ├── 🟢 index_3_semantic_search_query
│   │   ├── 🟢 index_3_hybrid_search_query
│   │   └── 🟢 index_3_semantic_rebuild
│   ├── 4. Поля (Storage) · 2
│   │   ├── 🟢 index_4_storage_query
│   │   └── 🟢 index_4_storage_rebuild
│   ├── 5. Связи (Links) · 2
│   │   ├── 🟢 index_5_link_search_query
│   │   └── 🟢 index_5_link_rebuild
│   ├── 6. Сущности (Entities) · 10
│   │   ├── 🟡 index_6_entity_query_zzz
│   │   ├── 🟡 index_6_entity_catalog_list_zzz
│   │   ├── 🟡 index_6_entity_query_explain_zzz
│   │   ├── 🟡 index_6_entity_rebuild_zzz
│   │   ├── 🟡 index_6_entity_registry_get_zzz
│   │   ├── 🟡 index_6_entity_registry_put_zzz
│   │   ├── 🟡 index_6_entity_type_upsert_zzz
│   │   ├── 🟡 index_6_entity_alias_merge_zzz
│   │   ├── 🟡 index_6_entity_reject_zzz
│   │   └── 🟡 index_6_entity_seed_zzz
│   ├── Мониторинг (Monitoring) · 2
│   │   ├── 🟢 index_status_get
│   │   └── 🟢 index_monitor_get
│   └── Операции (Ops) · 3
│       ├── 🟢 index_rebuild_all
│       ├── 🟢 index_record_sync
│       └── 🟢 index_search_query_batch
│
├── 🆔 Запись (Record) · 9
│   ├── 🔑 ID (ID) · 3
│   │   ├── 🟢 record_id_resolve
│   │   ├── 🟢 record_id_exists
│   │   └── 🟢 record_id_assign
│   ├── 🏷 Slug (Slug) · 2
│   │   ├── 🟢 record_slug_generate
│   │   └── 🟢 record_slug_exists
│   └── 🧭 Путь и URL (Path & URL) · 4
│       ├── 🟢 record_path_resolve
│       ├── 🟢 record_url_get
│       ├── 🟢 record_binary_url_get
│       └── 🟢 record_preview_get
│
├── 🧠 Факты, глоссарий, справочник, внешняя память (Facts, glossary, reference & external memory) · 16
│   ├── Факты (Facts) · 4
│   │   ├── 🟢 fact_create
│   │   ├── 🟢 fact_update
│   │   ├── 🟢 facts_list
│   │   └── 🟢 facts_search
│   ├── Глоссарий (Glossary) · 4
│   │   ├── 🟢 glossary_term_create
│   │   ├── 🟢 glossary_term_update
│   │   ├── 🟢 glossary_terms_list
│   │   └── 🟢 glossary_terms_search
│   ├── Справочник (Reference) · 4
│   │   ├── 🟢 reference_entry_create
│   │   ├── 🟢 reference_entry_update
│   │   ├── 🟢 reference_entries_list
│   │   └── 🟢 reference_entries_search
│   └── Внешняя память (External memory) · 4 · `0-contents/0-external-memory/`
│       ├── ⚪ external_memory_list — `platform` опционален (фильтр раздела)
│       ├── ⚪ external_memory_upsert — `platform` обязателен: slug клиента (не модель), агент сам: `cursor`, `claude-code`, `codex`, `claude-cli`, `chatgpt`, `claude`… → раздел `data/{platform}/`
│       ├── ⚪ external_memory_sync — то же `platform`; pull/push, `exports/{platform}.md`
│       └── ⚪ external_memory_sync_status — `sync-state.json` (map `platforms`)
│
├── 📝 Аннотации (Annotations) · 11
│   ├── Комментарии (Comments) · 6
│   │   ├── 🟢 annotation_comments_list
│   │   ├── 🟢 annotation_comment_append
│   │   ├── 🟢 annotation_comment_read
│   │   ├── 🟢 annotation_comment_update
│   │   ├── 🟢 annotation_comment_delete
│   │   └── 🟢 annotation_comment_reaction_toggle
│   └── Сайдкар (Sidecar) · 5
│       ├── 🟢 annotation_sidecar_path_resolve
│       ├── 🟢 annotation_sidecar_read
│       ├── 🟢 annotation_sidecar_create
│       ├── 🟢 annotation_sidecar_update
│       └── 🟢 annotation_sidecar_delete
│
├── 🧰 Модули (Modules) · 23
│   ├── 🟢 module_git_status
│   ├── 🟢 module_git_diff
│   ├── 🟢 module_git_commit
│   ├── 🟢 module_git_push
│   ├── 🟢 module_git_pull
│   ├── 🟢 module_git_remote
│   ├── 🟢 module_git_init
│   ├── 🟢 module_short_link_create
│   ├── 🟢 module_short_link_get
│   ├── 🟢 module_short_link_list
│   ├── 🟢 module_short_link_delete
│   ├── 🟢 module_media_cloud_providers_list
│   ├── 🟢 module_media_cloud_status
│   ├── 🟢 module_media_cloud_sync
│   ├── 🟢 module_media_cloud_links_repair
│   ├── 🟢 module_media_cloud_upload
│   ├── 🟢 module_media_cloud_url
│   ├── 🟢 module_file_hub_outbound_list
│   ├── 🟢 module_file_hub_outbound_enqueue
│   ├── 🟢 module_file_hub_outbound_remove
│   ├── 🟢 module_file_hub_outbound_clear
│   ├── 🟡 module_file_hub_inbound_list_zzz
│   └── 🟡 module_file_hub_inbound_upload_zzz
│
├── 🛠 Утилиты (Utilities) · 9
│   ├── 🟢 utility_mcp_ping
│   ├── 🟢 utility_web_search
│   ├── 🟢 utility_web_images_search
│   ├── 🟢 utility_web_page_read
│   ├── 🟢 utility_web_page_preview
│   ├── 🟢 utility_document_text_extract
│   ├── 🟢 utility_script_run
│   ├── 🟢 utility_command_exec
│   └── 🟢 utility_shell_exec
│
├── 📥 Входящие (Inbox) · 2
│   ├── 🟢 inbox_items_list
│   └── 🟢 inbox_item_triage
│
├── 🗨️ Чаты (Chats · awn-dialogs/) · 5
│   ├── 🟡 chat_runtimes_list_zzz — идея: runtime-папки (claude, codex, qwenpaw…); не `discussion_*`
│   ├── 🟡 chat_sessions_list_zzz — идея: сессии (uuid) внутри runtime
│   ├── 🟡 chat_history_zzz — идея: переписка; опора `readShellDialogHistory`, HTTP `GET /api/shell/dialogs/history`
│   ├── 🟡 chat_archive_summary_zzz — идея: сводка архива (файлы, даты, объём; блок «Диалоги (чаты) с ИИ»)
│   └── 🟡 chat_import_zzz — идея: выгрузка Claude Desktop / Codex → `awn-dialogs/<runtime>/<session>/`
│
├── 💬 Обсуждение (Discussion) · 2
│   ├── 🟢 discussion_read
│   └── 🟢 discussion_append
│
├── 📓 Журнал (Journal) · 2
│   ├── 🟢 journal_entry_append
│   └── 🟢 journal_entries_list
│
├── 🔔 Уведомления (Notifications) · 2
│   ├── 🟢 user_notifications_list
│   └── 🟢 user_notification_send
│
└── ⚡ Специальные (Special) · 1
    └── 🟢 batch_tools_invoke
```

## 🇷🇺 Справочники для агентов и индексации — модельки и нейронки, обучайтесь 😀 (🇬🇧 References for agents and indexing — models, go learn 😀)

🇷🇺 **[ru]**

Файлы **`GLOBAL-SKILL-*.md`**, [README.diagram.md](README.diagram.md) (схема workspace — **на главной CMS**), полный **README** — в [репозитории](https://github.com/iv-litovchenko/AgentCMS). Для RAG и always-context. Скиллы — [раздел выше](#-подключение-скиллов-для-агента--claude-codex-и-другие-gb-agent-skills--claude-codex-and-others).

См. также: [TODO.md](TODO.md) · [TODO-file.md](TODO-file.md) · [TODO.TimeTracker.md](TODO.TimeTracker.md) · [TODO.Transfer.md](TODO.Transfer.md)

---

> 🇬🇧 **[en]**
>
> **`GLOBAL-SKILL-*.md`**, [README.diagram.md](README.diagram.md) (CMS home), full README on [GitHub](https://github.com/iv-litovchenko/AgentCMS). [Agent skills](#-подключение-скиллов-для-агента--claude-codex-и-другие-gb-agent-skills--claude-codex-and-others) above.
>
> See also: [TODO.md](TODO.md) · [TODO-file.md](TODO-file.md) · [TODO.TimeTracker.md](TODO.TimeTracker.md) · [TODO.Transfer.md](TODO.Transfer.md)

## 🇷🇺 Мечта (🇬🇧 Vision)

🇷🇺 **[ru]**

Вырваться за рамки «ещё одного редактора с MCP»: **универсальная память** — слой ОС для человека и нейросетей. Одно хранилище, с которым можно общаться естественным голосом, структурировать мысли и факты, связывать области и темы и не терять контекст между сессиями. Не диалог с чистого листа, а совместная память на диске: вы и ИИ пополняете её изо дня в день — живая, накапливаемая из ваших цифровых данных и знаний в едином месте.

Чтобы у каждого человека был свой цифровой помощник: он помнит вашу цифровую жизнь — с вашего разрешения и на вашем диске — и рядом в учёбе, делах и увлечениях, когда вы спрашиваете, когда вместе раскладываете материалы по местам и снова возвращаетесь к ним, когда это снова становится актуальным для вас.

В книгах и фильмах это уже рисовали: у Дамблдора — котёл воспоминаний, у Тони Старка — Джарвис. Не декорация, а желание иметь своё: память, в которую можно вернуться, и помощника, который её понимает. Agent CMS — шаг к такой платформе на вашем диске; впереди — интерфейсы посмелее экрана и клавиатуры: голос, движение, присутствие — чтобы связь человека и машины была без лишних барьеров.

**Мечта в одной задаче.** Собрать **идеальную цифровую память** — не папку с хаосом, а то, к чему можно вернуться через месяц и сразу продолжить. Живой пример: вы открываете **канал или архив на 1000 сообщений** (Telegram, переписка, лента) и говорите агенту: *«Собери то, что важно для анализа — факты, решения, договорённости, ссылки»*. Агент не «пересказывает чат в ответе», а **складывает результат в хранилище**: во входящие, по темам и слотам, с полями и связями. Дальше включаются **индексы** (слова, смысл, поля, граф ссылок) — можно искать, сравнивать, дособирать выжимки и задавать новые вопросы уже **по диску**, а не по сырому экспорту. Один раз разложили — память остаётся вашей, на вашем компьютере, и растёт вместе с новыми каналами и проектами.

---

> 🇬🇧 **[en]**
>
> Go beyond “another editor with MCP”: a **universal memory** — an OS layer for people and models. One workspace you can speak to naturally, structure thoughts and facts, link areas and themes, and keep context across sessions. Not a blank-slate chat, but shared memory on disk: you and AI add to it day by day — living, growing from your digital data and knowledge in one place.
>
> So everyone can have a digital assistant that remembers your digital life — with your permission, on your disk — beside you in study, work, and hobbies when you ask, when you sort materials together, and when you return to them again.
>
> Books and films already showed it: Dumbledore’s Pensieve, Tony Stark’s JARVIS. Not decoration — the wish for your own memory you can return to and a helper that understands it. Agent CMS is a step toward that platform on your disk; ahead are bolder interfaces than screen and keyboard: voice, movement, presence — so the link between human and machine has fewer barriers.
>
> **The vision in one task.** Build an **ideal digital memory** — not a chaos folder, but something you can reopen a month later and continue right away. A live example: you open a **channel or archive with 1000 messages** (Telegram, mail, feed) and tell the agent: *“Collect what matters for analysis — facts, decisions, agreements, links.”* The agent doesn’t “summarize the chat in the reply”; it **puts the result in the workspace**: inbox, themes and slots, fields and links. Then **indexes** kick in (words, meaning, fields, link graph) — search, compare, refine extracts, ask new questions **from disk**, not from a raw export. File it once — memory stays yours, on your machine, and grows with new channels and projects.

## 🇷🇺 Лицензия (🇬🇧 License)

Copyright © 2026 Agent CMS

Исходный код распространяется под [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-or-later).

## 🇷🇺 Ссылки (🇬🇧 Links)

- Сайт: [https://agent-cms.ru/](https://agent-cms.ru/)
- GitHub: [https://github.com/iv-litovchenko/AgentCMS](https://github.com/iv-litovchenko/AgentCMS)
- Telegram: [https://t.me/AgentCMS](https://t.me/AgentCMS) (@AgentCMS — про жизнь с ИИ и технологиями)
- Почта: [iv-litovchenko@mail.ru](mailto:iv-litovchenko@mail.ru)

## 🇷🇺 С чего начать? (🇬🇧 Where to start?)

🇷🇺 **[ru]**

Общайтесь — знакомтесь! 👋

Буду рад всем, кому близка тема цифровой памяти и агентов на своих файлах — пишите в [Telegram](https://t.me/AgentCMS) или на [почту](mailto:iv-litovchenko@mail.ru).

---

> 🇬🇧 **[en]**
>
> Say hi — get to know the project! 👋
>
> Glad to hear from anyone into digital memory and agents on their own files — write on [Telegram](https://t.me/AgentCMS) or [email](mailto:iv-litovchenko@mail.ru).