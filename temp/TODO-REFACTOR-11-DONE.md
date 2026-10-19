# Рефакторинг — часть 11 (DONE)

**Сделано:** `get_session_context` / `GET /api/agent/session-context` сведён к лёгкому пакету: карта workspace + always-context файлы. Platform toggles описаны в `GLOBAL-SKILL-1-BASE.md` §11.

**MCP:** `list_workspaces` → `get_session_context({ agentId })` — старт чата.  
**Не путать:** persona **0-agent** / `get_agent_identity` — это тема в workspace, не id хранилища.

---

## 🌳 Что в `get_session_context` (v0.0.5)

```
get_session_context
│
├── meta: version, mcpVersion, workspaceId, agentRootRel, hint
│
├── wsMap — WS-MAP, собирается на лету (на диск не пишется)
│   ├── markdown        — корень ws (без awn-*) + реестр ВСЕХ manifest.md
│   │                     (темы, базы, медиа, каналы…: id, тип, путь, название, описание)
│   ├── entryCount
│   └── rootEntryCount
│
└── alwaysContext — полные тексты «всегда грузить»
    ├── awn-runtime-load-always (manifest темы / content-запись)
    ├── system .md из platform always-context-md-files (по умолчанию AGENTS.md)
    └── ws-folder — рекурс .md/.yml/.yaml/.txt из always-context-ws-folder
        (GLOBAL-SKILL-* сюда не входят — скиллы клиента / read_platform_doc)
```

Карта заменяет отдельные `topicRegistry` / `dataStoresSummary` / `menuSummary` и вызовы `list_databases`-подобных tools.

## ❌ Убрано из session-context (грузится отдельно по запросу)

| Было | Где теперь |
| ---- | ---------- |
| `topicRegistry`, `dataStoresSummary`, `menuSummary` | `wsMap` |
| `serviceDocs` (manifest 0-agent / 0-user / voice) | `read_topic_body` |
| `awnSystem` (registry.yml, typeSummary) | `read_system_file` / `list_types` |
| `platformSettings`, `workspaceSettings` | `list_settings` / `read_setting` |
| `pathHints`, `kitFolder`, дубли `agentId`, `*Count` | документация: `read_platform_doc` |

## Отдельные вызовы

```
вне get_session_context
│
├── list_platform_docs · read_platform_doc — README, GLOBAL-SKILL-*.md
├── get_workspace_cron_registry · get_workspace_heartbeat_registry
├── workspace_summary_get — stats, git, index status
├── read_topic_index_toc · read_content_index_toc · read_workspace_map
└── read_topic_body / read_content — содержимое по запросу
```

## Чат

`<!-- uuid при старте работы -->`
