# `get_session_context`

**MCP:** `get_session_context({ workspaceId })`  
**HTTP:** `GET /api/agent/session-context?agent=<workspaceId>`  
**Когда:** старт чата после `list_workspaces`.

```
ответ
├── version · mcpVersion
├── workspaceId · agentId · agentRootRel · kitFolder
├── pathHints — слоты, adopt, sidecar (шпаргалка путей)
├── menuSummary — topicCount, serviceTree/containerTree/sharedTree (без дерева)
├── topicRegistry — все темы: path, label, awnType (без тел manifest)
├── dataStoresSummary — awn-databases: path, kind, recordCount (без записей)
├── alwaysContext — полные .md «always load»
│   ├── runtime-load-always (темы + записи в слотах)
│   ├── AGENTS.md (platform list always-context-md-files)
│   ├── GLOBAL-RULES · GLOBAL-RESPONSE-STYLE (toggles)
│   └── папка 0-context/… (always-context-ws-folder)
├── serviceDocs — manifest 0-agent-kit: agent, user, voice tts/stt (полный текст)
├── awnSystem — typeSummary + registry.yml
├── platformSettings · workspaceSettings — значения настроек
├── topicCount · dataStoreCount · dataRecordCount · alwaysContextCount
└── hint
```

**Не включает:** README, GLOBAL-DOC-MARKDOWN, GLOBAL-DOC-MCP-INSTRUCTION, cron/heartbeat, тела произвольных тем.

**Дубль:** `list_workspace_always_context` = только блок `alwaysContext`.

Источник: `server.js` → `buildAgentSessionContext()`.
