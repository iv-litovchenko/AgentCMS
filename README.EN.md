# AGENT CMS (0.0.1-beta)

<p align="center">
  <strong>English</strong> <em>(current)</em> | <a href="README.md"><strong>Русский</strong></a>
</p>

<p align="center">
  <a href="docs/deploy/DOCKER.md"><img src="docs/images/badges/badge-docker.svg" alt="Docker" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#install-macos"><img src="docs/images/badges/badge-macos.svg" alt="macOS" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#install-ubuntu-vps-server"><img src="docs/images/badges/badge-linux.svg" alt="Linux" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="docs/deploy/DOCKER.md" title="Windows (beta, WSL)"><img src="docs/images/badges/badge-windows-beta.svg" alt="Windows beta" height="28"></a>
</p>

<p align="center">
  <a href="#agent-skills-claude-codex-and-others"><img src="docs/images/badges/badge-claude.svg" alt="Claude" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#agent-skills-claude-codex-and-others"><img src="docs/images/badges/badge-codex.svg" alt="Codex" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="mcp-server/README.md"><img src="docs/images/badges/badge-qwenpaw.svg" alt="QwenPaw" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#mcp-connection"><img src="docs/images/badges/badge-mcp.svg" alt="MCP (Model Context Protocol)" height="28"></a>
</p>

<p align="center">
  <a href="#stack"><img src="docs/images/badges/badge-nodejs.svg" alt="Node.js" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#stack"><img src="docs/images/badges/badge-express.svg" alt="Express" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#stack"><img src="docs/images/badges/badge-sqlite.svg" alt="SQLite" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#stack"><img src="docs/images/badges/badge-markdown.svg" alt="Markdown" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#stack"><img src="docs/images/badges/badge-electron.svg" alt="Electron" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#stack"><img src="docs/images/badges/badge-mermaid.svg" alt="Mermaid" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="#stack"><img src="docs/images/badges/badge-threejs.svg" alt="Three.js" height="28"></a>&nbsp;&nbsp;&nbsp;
  <a href="docs/deploy/vps-caddy-letsencrypt.md"><img src="docs/images/badges/badge-caddy.svg" alt="Caddy" height="28"></a>
</p>

---

## Table of contents

- [Cross-platform digital memory for you and your AI agents](#cross-platform-digital-memory-for-you-and-your-ai-agents)
- [Apps and clients](#apps-and-clients)
- [One workspace — three entry points. UI, MCP, and voice are different interfaces, one store.](#one-workspace-three-entry-points-ui-mcp-and-voice-are-different-interfaces-one-store)
- [Why](#why)
- [Who it’s for](#who-its-for)
- [How it works — key terms](#how-it-works-key-terms)
- [Principles](#principles)
- [Stack](#stack)
- [Recommended requirements](#recommended-requirements)
- [Install — installer](#install-installer)
- [Install — macOS](#install-macos)
- [Install — Ubuntu VPS / server](#install-ubuntu-vps-server)
- [CLI `agent-cms-cli`](#cli-agent-cms-cli)
- [Electron — build `.app` & shortcuts](#electron-build-app-shortcuts)
- [Configuration — `.env`](#configuration-env)
- [Agent skills — Claude, Codex, and others](#agent-skills-claude-codex-and-others)
- [MCP connection](#mcp-connection)
- [MCP tool map `user-agent-cms`](#mcp-tool-map-user-agent-cms)
- [References for agents and indexing — models, go learn 😀](#references-for-agents-and-indexing-models-go-learn)
- [Vision](#vision)
- [License](#license)
- [Links](#links)
- [Where to start?](#where-to-start)

---

## Cross-platform digital memory for you and your AI agents


![Workspace map: Agent CMS and connected agents / Карта workspace: Agent CMS и связанные агенты](docs/images/1.png)

![Agent CMS — graph visualization and atlas / Agent CMS — граф связей и атлас](docs/images/0.png)


**Start an MCP chat:** “Hi — pick a `<test workspace>`, load the workspace context (optional), and the documentation (optional).”

![Chat with an agent: test workspace and context overview / Чат с агентом: тестовое хранилище и краткий обзор контекста](docs/images/6.png)


**Agent CMS** is a shell for storing notes, documents, media, thoughts, secrets, and other data together with an AI agent — under clear rules (channels, pages, themes, areas, infoblocks, repositories).

A normal folder on your desktop becomes an “upgraded folder” — a **workspace** where AI agents and you can navigate freely (you mostly remember what’s inside; when you don’t, you ask the agent).

Everything lives in ordinary files on disk (text, YAML settings tables), with no separate database. You work through **Claude Desktop**, **Codex Desktop**, and a browser window (Agent CMS editor); the agent connects via **MCP**. You and the agent see the same content — a **shared box**.

**CMS** — Content Management System · **Context** Management System.

A map of ideas and system pieces (workspace), Mermaid — in the repo root: [README.diagram.md](README.diagram.md). The CMS home page shows this diagram.


## Apps and clients


| App | Description |
| --- | --- |
| **Agent CMS Editor** | Main editor: folder tree, themes and areas, settings, search, memory, and MCP |
| **Agent CMS Voice** (Flow Window) | Voice dialog with the agent — same data from desktop, phone, or browser |
| **Agent CMS Control** (Launcher) | Start the server, build desktop apps, dependencies, and shortcuts |
| **Agent CMS Toolbar** | Panel on any browser tab: what’s open, links and media, paste into inputs — without leaving the site |
| **Google Chrome extension** | Side panel on a tab with shell and voice; install from [`browser-extension/`](browser-extension/) ([guide](browser-extension/README.md)) |
| **Agent CMS Voice App (iPhone)** | Voice-only link to your Agent CMS: talk to the agent from your phone — mic, reply, and TTS; project in [`mobile/iphone-shell/`](mobile/iphone-shell/) |


## One workspace — three entry points. UI, MCP, and voice are different interfaces, one store.


![Agent CMS — editor and theme tree / редактор и дерево тем](docs/images/2.png)

![Capture from the browser and Agent Shell / Захват из браузера и Agent Shell](docs/images/3.png)

<p align="center">
  <img src="docs/images/5.jpeg" alt="Agent CMS Voice — voice client / голосовой клиент" />
</p>


Above: the **editor** with the theme tree, the **browser** (tab capture and Agent Shell), and **voice** (Voice) — different interfaces, the same workspace on disk.


## Why


![Agent via MCP: feed, indexes, and workspace diagnostics / Агент через MCP: лента, индексы и диагностика хранилища](docs/images/7.png)


Notes, files, and links often sit in different apps. In a normal AI chat, context doesn’t survive between sessions. Here everything lives in one **workspace** — **three entry points** (editor, MCP, voice) and a tree **area → theme → slot → record**: you and the agent know **where to look** and **where to put** new material. Format is **Markdown and YAML** on disk, no separate DB; when files pile up, **indexes** help (words, meaning, links). Over time you build memory and ties across areas. Source of truth is **disk**, not the chat. Data stays with you: copy, back up, and version like any files.


## Who it’s for


<p align="center">
  <img src="docs/images/8.jpg" alt="One system for all incoming chaos / Единая система для всего входящего хаоса" />
</p>


- **Personal** — notes, tasks, learning, health, media in one tree; speak a thought — the agent files it in the right place.
- **Teams** — shared knowledge base: areas per project, one rule set for people and AI, MCP for corporate agents (roles, journal, vault slots — as you roll them out).


## How it works — key terms


**Platform** — shared program layer: record types, catalogs, and settings for all workspaces.

**Workspace** — your project folder: menu sections, themes, text files and attachments. Each agent can have its own workspace.

**Tree** — section → theme → shelf (slot) → file record. Example: “Work” → “Renovation” → “Documents” → `estimate.md`. You shape the structure; there’s no fixed template.

**Infoblocks** — for tables and lists with the same fields (expenses, contacts, directories). For free-form notes, the tree is usually easier.

**Repositories** — a separate zone in the workspace for code projects (git clone, short `manifest.md` for the agent); source code stays out of the notes tree.

**Sidecar** — next to a photo or PDF, a `.sidecar.md` holds description, tags, and links when you can’t put text in the file itself.

**Internals** — passwords in `.env`; temporary indexes and search cache in `.agent-cms/`.

**Workspace search** — indexes rebuild from your files; UI and agent (MCP) support several modes:

- **by words** — full-text search in bodies and properties;
- **by meaning** — “similar idea” chunks (semantic index, RAG);
- **hybrid** — words + meaning + frontmatter filters in one query (handy for agents);
- **by fields** — catalog by type, tags, status, and other YAML fields (SQL-like queries);
- **by links** — graph: who links to a file, where `[[wikilinks]]` and relation fields point (not plain text search).

You can **limit search to one theme or area** (focus ◎ in the editor header — same limit for MCP via `pathPrefix`). Separately — **fact bank** (`awn-facts/`) and questions over the whole archive. Tool details: [GLOBAL-SKILL-1-BASE.md](_skills_/GLOBAL-SKILL-1-BASE.md).

All terms above are **expanded on the interactive map** (Mermaid, clickable nodes): [README.diagram.md](README.diagram.md) — the same diagram opens on the CMS home page.


## Principles


1. **Shared language** — one rule set for human and agent.
2. **Files over DB** — content on disk; indexes (meaning, words, links) rebuild from files.
3. **1+1 synergy** — you keep order; the agent remembers context and acts in the workspace.


## Stack


- **Node.js** — server, MCP, indexing, API
- **File storage** — Markdown, YAML, JSON
- **SQLite** — semantic, full-text, and link indexes
- **MCP** — Cursor, Claude, and other agents
- **Web UI** — vanilla JS, Toast UI Editor, Mermaid
- **Electron** — optional windows over the same URL ([build and shortcuts](#electron-build-app-shortcuts))
- **Voice** — voice-server, TTS, 3D shell (Three.js)
- **OCR & media** — Tesseract.js, Sharp; Office/PDF


## Recommended requirements


Prefer the **installer** (below), then daily ops via **`agent-cms-cli`** (`agent-cms` alias). Manual clone + compose blocks remain as fallback. Config: **`.env` in the repo**. Details: [DOCKER.md](docs/deploy/DOCKER.md). Legacy npm/`install-deps.sh` — image dev only. Roadmap: [_todo_/TODO-REFACTOR-15.md](_todo_/TODO-REFACTOR-15.md) (Q9.1 / Q9.2).


## Install — installer


![Agent CMS Control — server and desktop apps / сервер и desktop-приложения](docs/images/4.png)


**Canonical flow:** [`install.sh`](scripts/install.sh) once (no manual clone), then **`agent-cms-cli`** for daily ops (`agent-cms` alias). No npm publish. Manual blocks below = fallback.

**After install:** PATH from profile / `profile.d` (or `export PATH="$HOME/.local/bin:$PATH"`) → Docker **Running** → `agent-cms-cli doctor` → **`agent-cms-cli rebuild`** (first time) → **`agent-cms-cli start`** → **`agent-cms-cli status`** → `agent-cms-cli open control`. Optional on Mac: **`agent-cms-cli electron-app build`** + **`shortcuts`**. No host **`npm install`** for CMS. Then [skills](#agent-skills-claude-codex-and-others) and [MCP](#mcp-connection).


## Install — macOS


[Docker Desktop](https://www.docker.com/products/docker-desktop/) → clone → **`cms-rebuild.command`** then **`cms-start.command`**. Then [skills](#agent-skills-claude-codex-and-others) and [MCP](#mcp-connection).


## Install — Ubuntu VPS / server


VPS: Docker CE + **ufw 22/80/443**, then **`curl …/install.sh | bash`** (target **`/opt/agent-cms`**) and **`agent-cms-cli rebuild`**. Manual clone in the collapsible block. [DOCKER.md](docs/deploy/DOCKER.md).


## CLI `agent-cms-cli`


**`agent-cms-cli`** ([`scripts/agent-cms`](scripts/agent-cms)) wraps compose/git — no npm package required for daily ops. Alias **`agent-cms`**. Electron .app: **`agent-cms-cli electron-app build`** (alias: **`electron build`**).


## Electron — build `.app` & shortcuts


**`electron-app build [pack|dist] [all|editor|chat|control|commander]`** — shortcuts: **ACMS-Editor**, **ACMS-Chat**, **ACMS-Control**, **ACMS-Commander**. See [`desktop/README.md`](desktop/README.md).


## Configuration — `.env`


Edit **`.env`** at the repo root ([`.env.example`](.env.example)). Read by **Docker Compose**, **CMS / Control / MCP**, and clients. On **VPS**, set **`AGENT_CMS_PUBLIC_URL`**, **`AGENT_CMS_PUBLIC_DOMAIN`**, **`APP_LOCK_*`**, **`AGENT_CMS_MCP_TOKEN`**. On **Mac**, password and MCP token are often enough; the rest defaults from the example file.

> **Edge services / `AGENT_CMS_EDGE_SERVICES_ENABLED`:** not `/app-*` routes — **separate containers** on subdomains. CMS on apex; **Linux** — Caddy by `Host`, **Mac** — CMS `:3000`. On-disk data: **`workspaces/0-services-data/<service-id>/`**.

After **`.env`** changes: **recreate** containers, **not** `rebuild`. MCP: **`platform_env_keys_list`**, **`platform_env_key_read`**, **`platform_env_key_write`**. See [docs/env-reference.md](docs/env-reference.md).

**Multiple workspace folders (Docker):** default **`./workspaces`** or **`AGENT_CMS_WORKSPACES_DIR`**; extra dirs via Control or **`platform_workspace_mounts_*`**. [DOCKER.md](docs/deploy/DOCKER.md#docker-workspace-mounts).

**Keys from `.env.example`** (platform whitelist):

| Key | Purpose | Example |
| --- | --- | --- |
| Ключ | 🇬🇧 Purpose | Пример / Example |
| **`APP_LOCK_LOGIN`** | App-lock login | `admin` |
| **`APP_LOCK_PASSWORD`** | App-lock password | смените с `changeme` |
| **`APP_LOCK_APPS`** | Password-gated apps | `editor,chat,commander,control` |
| **`AGENT_CMS_HTTP_TO_HTTPS`** | In-CMS HTTP→HTTPS redirect | `0` |
| **`AGENT_CMS_WORKSPACES_DIR`** | Primary host workspaces mount | `./workspaces` или `/Users/…/AgentCMS-workspaces` |
| **`AGENT_CMS_PUBLIC_URL`** | Public base URL | Mac Docker: `https://127.0.0.1:3443` · VPS: `https://ваш-домен` |
| **`AGENT_CMS_SINGLE_HTTP_DOOR`** | Single HTTP door + path routes | `1` |
| **`AGENT_CMS_EXPOSE_INTERNAL_PORTS`** | Expose legacy dev ports | закомментирован / `0` |
| **`AGENT_CMS_SITE_TITLE`** | Site title | `Agent CMS` |
| **`AGENT_CMS_PUBLIC_DOMAIN`** | Public apex / Caddy domain | VPS: `maptex.ru` · Mac: `localhost` |
| **`AGENT_CMS_CADDY_EMAIL`** | ACME email | `admin@example.com` |
| **`AGENT_CMS_EDGE_SERVICES_ENABLED`** | Subdomain edge services | **`1`** |
| **`AGENT_CMS_EDGE_HTTP_GATE`** | CMS Host gateway without Caddy | Mac: auto |
| **`AGENT_CMS_SERVICES_DATA_DIR`** | Edge services data root | `0-services-data` |
| **`AGENT_CMS_MCP_TOKEN`** | MCP Bearer token | длинный секрет |
| **`AGENT_CMS_MCP_ICON_URL`** | MCP connector icon URL | `https://ваш-домен/app-mcp/icon` |
| **`AGENT_CMS_MCP_ALLOWED_HOSTS`** | MCP Host allowlist | `localhost,127.0.0.1` (+ ваш домен на VPS) |
| **`AGENT_CMS_MCP_BASE64_MAX_BYTES`** | MCP base64 upload cap (decoded bytes) | `1048576` (1 MiB; можно меньше) |
| **`AGENT_CMS_LIST_DEFAULT_LIMIT`** | Default MCP list page size | `20` |
| **`AGENT_CMS_LIST_DEFAULT_MAX_DEPTH`** | Default list tree depth | `3` |
| **`AGENT_CMS_LIST_ALLOW_PREVIEW`** | Disable list body snippets | `1` |
| **`AGENT_CMS_DEPLOY_UPDATE_ENABLED`** | Control deploy update button | `0` / `1` на VPS по желанию |
| **`AGENT_CMS_DEPLOY_PLATFORM`** | **`linux`** \ | **`windows`** |
| **`WEB_SEARCH_MODE`** | Web search mode | `direct` |
| **`GOOGLE_SEARCH_API_KEY`** | Google CSE API key | пусто / ключ |
| **`GOOGLE_SEARCH_ENGINE_ID`** | Google CSE engine ID | пусто / id |
| **`GOOGLE_SEARCH_LANG`** | Query language | `ru` |
| **`GOOGLE_SEARCH_COUNTRY`** | Country bias | `RU` |
| **`GOOGLE_SEARCH_GL`** | Google `gl` | `ru` |
| **`GOOGLE_SEARCH_SAFE`** | SafeSearch level | `active` |

**Additional Compose-only** (may live in `.env`, not duplicated in `.env.example`):

| Key | Description | Example |
| --- | --- | --- |
| **`AGENT_CMS_EDITOR_HTTP_PORT`** | CMS host port | `3000` |
| **`AGENT_CMS_HOST_PROJECT`** | Repo path on host | `.` |
| **`AGENT_CMS_IMAGE_TAG`** | Image tag | `local` |
| **`VOICE_AUTOSTART`** | Voice autostart in cms | `1` |
| **`AGENT_CMS_MCP_BEHIND_PROXY`** | MCP behind proxy | Mac `0` |
| **`MCP_LEGACY_ALIASES`** | Deprecated MCP tool names | пусто / `0` |
| **`MCP_LEGACY_TOOLS`** | Legacy MCP FS tools | пусто / `0` |

**Host / CLI** (some in [`.env.example`](.env.example), not in MCP whitelist):

| Variable | Description | Example |
| --- | --- | --- |
| **`AGENT_CMS_OPEN_BROWSER`** | Mac auto-open Control after start | в `.env` или `AGENT_CMS_OPEN_BROWSER=1 agent-cms-cli start` |
| **`AGENT_CMS_ELECTRON_LEGACY`** | Electron embedded server mode | `1` |
| **`AGENT_CMS_HOME`** | CLI repo root | `~/agent-cms` |

> **NOTE**
> - 💡 Do not use legacy **`PORT` / `TLS_PORT` / `MAPTEX_DOMAIN`** as the main URL — canonical **`AGENT_CMS_PUBLIC_URL`** ([docs/env-reference.md](docs/env-reference.md)).
> - ⚠️ Do not commit secrets (**`APP_LOCK_PASSWORD`**, **`AGENT_CMS_MCP_TOKEN`**, **`GOOGLE_SEARCH_API_KEY`**); use unique values on VPS.


## Agent skills — Claude, Codex, and others


Исходники — **`_skills_/GLOBAL-SKILL-*.md`** в [репозитории на GitHub](https://github.com/iv-litovchenko/AgentCMS/tree/main/_skills_). Каждый файл — markdown с YAML frontmatter (`name`, `description`).

| File | Skill | Purpose |
| --- | --- | --- |
| [GLOBAL-SKILL-0-MCP-WELCOME.md](_skills_/GLOBAL-SKILL-0-MCP-WELCOME.md) | `agent-cms-welcome` | Intro, MCP start, skill map |
| [GLOBAL-SKILL-1-BASE.md](_skills_/GLOBAL-SKILL-1-BASE.md) | `agent-cms` | Workspace and MCP tools |
| [GLOBAL-SKILL-2-RESPONSE-STYLE.md](_skills_/GLOBAL-SKILL-2-RESPONSE-STYLE.md) | `agent-cms-response-style` | Reply style (🗄️ / 🌐 / 💭) |
| [GLOBAL-SKILL-3-RULES.md](_skills_/GLOBAL-SKILL-3-RULES.md) | `agent-cms-rules` | Global rules |
| [GLOBAL-SKILL-4-MARKDOWN.md](_skills_/GLOBAL-SKILL-4-MARKDOWN.md) | `agent-cms-markdown` | Markdown in records |
| [GLOBAL-SKILL-5-SEARCH.md](_skills_/GLOBAL-SKILL-5-SEARCH.md) | `agent-cms-search` | Search, indexes, DQL |
| [GLOBAL-SKILL-6-MODULES.md](_skills_/GLOBAL-SKILL-6-MODULES.md) | `agent-cms-modules` | Git and modules |
| [GLOBAL-SKILL-7-VIZ-MAPS.md](_skills_/GLOBAL-SKILL-7-VIZ-MAPS.md) | `agent-cms-viz` | Viz maps `*.viz.md`, Atlas, `viz_map_*` |
| [GLOBAL-SKILL-8-SLOTS-LEGACY.md](_skills_/GLOBAL-SKILL-8-SLOTS-LEGACY.md) | `agent-cms-slots-legacy` | Legacy slot/kind |

**Как установить**

1. Сначала [подключите MCP](#mcp-connection).
2. **Cursor / Codex / Claude Code** — для каждого скилла: `.cursor/skills/<name>/SKILL.md` с **полным** текстом `GLOBAL-SKILL-*.md` (имя папки = поле `name`) или попросите агента поставить скиллы из GitHub.
3. **Claude Desktop** — **Settings → Capabilities → Skills**: файлы из корня репо. Минимум **`agent-cms`**; **`agent-cms-welcome`** — по желанию.
4. Рекомендуется также **`agent-cms-response-style`** и **`agent-cms-rules`** — они **не** входят в `get_session_context`.
5. **Без установки:** `platform_skills_list` → `platform_skill_read({ path: "GLOBAL-SKILL-1-BASE.md" })`.

После `git pull` обновите копии в клиенте и перезапустите MCP.

---


**Install:** [MCP](#mcp-connection) first; copy into `.cursor/skills/<name>/SKILL.md` or ask the agent to install from GitHub (`_skills_/`). Minimum **`agent-cms`**; add **response-style** and **rules**. Fallback: `platform_skills_list` / `platform_skill_read`. Refresh after `git pull`.


## MCP connection


**HTTP only:** `{PUBLIC_URL}/app-mcp` + Bearer **`AGENT_CMS_MCP_TOKEN`**. Set **`AGENT_CMS_PUBLIC_URL`** for upload `putUrl` and MCP icons. Control guide copies the JSON. Large files: `upload_begin` + `sourceUrl`, or PUT, or `upload_chunk` → `complete`. See [docs/connectors/README.md](docs/connectors/README.md). Legacy MCP env: [Configuration — `.env`](#configuration-env). Stdio `node mcp-server` — dev-only, not documented as equal.


## MCP tool map `user-agent-cms`


**🟢** canonical · **⚪** testing · **🟡** stub / idea · **🔴** under review · **🔵** draft (REST exists, MCP in progress) · **Итого 🟢: 232** · **⚪** 4 · **🟡** 34 · **🔴** 0 · **🔵** 8

```
user-agent-cms
│
├── ⚙️ Платформа (Platform) · 13
│   ├── 🟢 platform_info_get
│   ├── 🟢 platform_health_get
│   ├── 🟢 platform_skills_list
│   ├── 🟢 platform_skill_read
│   ├── 🟢 platform_docs_list
│   ├── 🟢 platform_doc_read
│   ├── 🟢 platform_doc_write
│   ├── 🟢 platform_config_list
│   ├── 🟢 platform_apps_list
│   ├── 🟢 platform_services_list
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
│   ├── 🟣 workspace_activity_count_zzz — stub: `{ total }` по activity.jsonl (без ленты; опц. since, pathPrefix)
│   ├── 🟣 workspace_activity_get_zzz — stub: одно событие журнала по `id`
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
├── 📄 Контент (Content) · 36
│   ├── 🟢 contents_list — entries одного уровня (limit/cursor, parent)
│   ├── 🟢 contents_outside_slots_list — «вне слотов» (корень контейнера + awn-storage/, без slot)
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
│   ├── 🟢 content_binary_upload_begin — PUT/chunk или sourceUrl (CMS качает URL)
│   ├── 🟢 content_binary_upload_chunk — base64 куски (облако без PUT)
│   ├── 🟢 content_binary_upload_complete
│   ├── 🟢 content_binary_upload_abort
│   ├── 🟢 content_binary_upload_status
│   ├── 🟢 content_binary_url_get — HTTPS URL превью (картинка в браузере)
│   ├── 🟢 content_binary_metadata_get
│   ├── 🟢 content_exists
│   ├── 🟢 content_meta_get — stat + sizeBytes/mimeType
│   ├── 🟢 content_size_get — только размер файла/заметки
│   ├── 🟢 content_property_read
│   ├── 🟢 content_property_write
│   ├── 🟢 content_create
│   ├── 🟢 content_delete
│   ├── 🟢 content_rename
│   ├── 🟢 content_move
│   ├── 🟢 content_split
│   ├── 🟢 content_merge
│   ├── 🟢 contents_slots_list
│   ├── 🔵 contents_list_reconcile — сверка списка id/path из памяти агента с диском (`POST /api/content/reconcile`; краткий diff + meta)
│   ├── 🟢 content_history_version_count — число .mdback версий у ref
│   ├── 🟢 content_history_version_list
│   ├── 🟢 content_history_version_read
│   ├── 🟢 content_history_version_diff
│   ├── 🟢 content_history_version_restore — откат содержимого (write); alias: content_history_restore
│   ├── 🟢 workspace_activity_list · 🔵 workspace_feed_list — журнал activity.jsonl
│   ├── 🟣 workspace_activity_count_zzz — stub: число событий без выгрузки ленты
│   └── 🟣 workspace_activity_get_zzz — stub: одно событие по id
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


## References for agents and indexing — models, go learn 😀


**`_skills_/GLOBAL-SKILL-*.md`**, [README.diagram.md](README.diagram.md) (CMS home), full README on [GitHub](https://github.com/iv-litovchenko/AgentCMS). [Agent skills](#agent-skills-claude-codex-and-others) above.

See also: [TODO.md](_todo_/TODO.md) · [TODO-file.md](_todo_/TODO-file.md) · [TODO.TimeTracker.md](_todo_/TODO.TimeTracker.md) · [TODO.Transfer.md](_todo_/TODO.Transfer.md)


## Vision


Go beyond “another editor with MCP”: a **universal memory** — an OS layer for people and models. One workspace you can speak to naturally, structure thoughts and facts, link areas and themes, and keep context across sessions. Not a blank-slate chat, but shared memory on disk: you and AI add to it day by day — living, growing from your digital data and knowledge in one place.

So everyone can have a digital assistant that remembers your digital life — with your permission, on your disk — beside you in study, work, and hobbies when you ask, when you sort materials together, and when you return to them again.

Books and films already showed it: Dumbledore’s Pensieve, Tony Stark’s JARVIS. Not decoration — the wish for your own memory you can return to and a helper that understands it. Agent CMS is a step toward that platform on your disk; ahead are bolder interfaces than screen and keyboard: voice, movement, presence — so the link between human and machine has fewer barriers.

**The vision in one task.** Build an **ideal digital memory** — not a chaos folder, but something you can reopen a month later and continue right away. A live example: you open a **channel or archive with 1000 messages** (Telegram, mail, feed) and tell the agent: *“Collect what matters for analysis — facts, decisions, agreements, links.”* The agent doesn’t “summarize the chat in the reply”; it **puts the result in the workspace**: inbox, themes and slots, fields and links. Then **indexes** kick in (words, meaning, fields, link graph) — search, compare, refine extracts, ask new questions **from disk**, not from a raw export. File it once — memory stays yours, on your machine, and grows with new channels and projects.


## License


Copyright © 2026 Agent CMS

Source code is licensed under [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-or-later).


## Links


- Website: [https://agent-cms.ru/](https://agent-cms.ru/)
- GitHub: [https://github.com/iv-litovchenko/AgentCMS](https://github.com/iv-litovchenko/AgentCMS)
- Telegram: [https://t.me/AgentCMS](https://t.me/AgentCMS) (@AgentCMS — AI and tech)
- Email: [iv-litovchenko@mail.ru](mailto:iv-litovchenko@mail.ru)


## Where to start?


Say hi — get to know the project! 👋

Glad to hear from anyone into digital memory and agents on their own files — write on [Telegram](https://t.me/AgentCMS) or [email](mailto:iv-litovchenko@mail.ru).
