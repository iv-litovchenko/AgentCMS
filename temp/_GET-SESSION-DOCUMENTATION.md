# `get_session_documentation`

**MCP:** `get_session_documentation({ workspaceId, docs? })`  
**HTTP:** `GET /api/agent/session-documentation?agent=<workspaceId>&docs=`  
**Когда:** по запросу (не в стартовом пакете).

```
ответ
├── version: 1
├── model: "session-documentation"
├── hint
├── itemCount
├── availableDocs[] — README.md, GLOBAL-SKILL-4-MARKDOWN.md
└── items[]
    └── ref · label · displayPath · description
        entityKind: "session-documentation"
        content — полный текст файла
```

**Файлы (корень репо, если toggle platform включён):**

| Файл | settingKey |
| ---- | ---------- |
| README.md | always-context-platform-readme |
| GLOBAL-SKILL-4-MARKDOWN.md | always-context-global-markdown-showcase |

**Args:** `docs` — опционально один файл или список / через запятую.

**Не включает:** GLOBAL-MCP-INSTRUCTION, GLOBAL-RULES, GLOBAL-RESPONSE-STYLE, workspace alwaysContext.

Источник: `server.js` → `buildAgentSessionDocumentationRegistry()`.
