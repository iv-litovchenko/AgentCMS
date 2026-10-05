# CLI sandbox (Agent CMS Shell)

Песочницы для **Claude Code** и **Codex CLI** — отдельная папка на каждый runtime и агента CMS:

```
workspaces/cli-sandbox/
├── claude/
│   ├── agent-cms-test/
│   └── …
└── codex/
    ├── agent-cms-test/
    └── …
```

Shell запускает CLI с `cwd` в `cli-sandbox/<runtime>/<agent-id>/`, не в корне workspace и не в `awn-container/`.
Доступ к хранилищу CMS — через **MCP Agent CMS**.
