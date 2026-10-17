# Рефакторинг — часть 11

**Задача (черновик):** зафиксировать, **что попадает в контекст сессии** (`get_session_context` / `GET /api/agent/session-context`), что грузится отдельно, и где возможное дробление «лёгкий / тяжёлый» пакет (см. [TODO.md](TODO.md)).

**MCP:** `list_workspaces` → `get_session_context({ workspaceId })` — старт чата.  
**Не путать:** persona **0-agent** / `get_agent_identity` — это тема в workspace, не id хранилища.

---

## 🌳 Что в `get_session_context` (дерево)

```
get_session_context
│
├── meta
│   ├── version, mcpVersion
│   ├── workspaceId / agentId, agentRootRel, kitFolder
│   ├── pathHints — подсказки путей (слоты, adopt, sidecar…)
│   └── hint — куда смотреть дальше (cron/docs отдельными tools)
│
├── menuSummary (без дерева меню)
│   ├── topicCount
│   └── flags: serviceTree · containerTree · sharedTree
│
├── topicRegistry — реестр тем (без тел manifest)
│   └── topics[]: manifestPath, label, displayPath, description, awnType
│
├── dataStoresSummary — каталог awn-databases (без body записей)
│   └── entries[]: path, kind, title, recordCount, …
│
├── alwaysContext — полные тексты «всегда грузить»
│   ├── awn-runtime-load-always
│   │   ├── topic manifest.md (флаг на теме)
│   │   └── content .md в слотах main/inbox/notes/… (флаг на записи)
│   ├── system .md из platform always-context-md-files (по умолчанию AGENTS.md в корне ws)
│   ├── GLOBAL-SKILL-3-RULES.md · GLOBAL-SKILL-2-RESPONSE-STYLE.md (если toggles platform включены)
│   └── ws-folder — рекурс .md из always-context-ws-folder
│       └── по умолчанию awn-topics/0-shared/0-context/awn-storage/
│
├── serviceDocs — manifest.md служебных preset-тем (полный текст)
│   └── 0-agent-kit: agent · user · agent.voice.tts · agent.voice.stt
│
├── awnSystem — облегчённый awn-system workspace
│   ├── typeSummary (число типов, domains)
│   └── registry.yml (текст)
│
└── settings (значения, не схема)
    ├── platformSettings — срез platform.yml
    └── workspaceSettings — срез workspace config
```

---

## 🚫 Не в session-context (отдельные вызовы)

```
вне get_session_context
│
├── get_session_documentation — README.md, GLOBAL-SKILL-4-MARKDOWN.md (toggles platform)
├── GLOBAL-MCP-INSTRUCTION.md — по skill / read_platform_doc (не автоматом в старт)
├── list_workspace_cron · list_workspace_heartbeat — индексы runtime по workspace
├── get_workspace_storage_info — stats, git, index status, counts
├── read_topic_index_toc · read_content_index_toc · read_workspace_map — оглавления
├── read_topic_body / read_content — любое содержимое по запросу
└── apiMap / полный REST-каталог — не отдаётся (агент → MCP tools)
```

---

## Связанные tools (дубли / подмножества)

| Tool | Связь |
| ---- | ----- |
| `list_workspace_always_context` | тот же блок, что `alwaysContext` в session-context |
| `get_session_documentation` | только platform docs по demand |
| `get_ui_focus` (legacy `get_user_active_context_now`) | фокус UI, не стартовый пакет |

---

## Идеи для REFACTOR-11 (❌ не решено)

- [ ] Явно разделить **light** (meta + registry + counts) и **heavy** (alwaysContext + serviceDocs).
- [ ] Лимит размера / предупреждение при переполнении always-context.
- [ ] Синхронизировать описание с [GLOBAL-MCP-INSTRUCTION.md](workspaces/0-md/GLOBAL-MCP-INSTRUCTION.md) и UI «Always context» count.
- [ ] Документировать toggles: `always-context-global-rules`, `always-context-md-files`, `always-context-ws-folder`, …

## Чат

`<!-- uuid при старте работы -->`
