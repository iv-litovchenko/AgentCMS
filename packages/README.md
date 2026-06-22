# packages/

Монорепо Agent CMS: **workspace (данные)** отдельно от **пакетов (код)**.

| Пакет | Назначение |
|-------|------------|
| [`awn-core/`](awn-core/) | Движок: loaders, manifest, schema, handlers |
| *(корень репо)* | `server.js`, `public/`, `electron/`, `mcp-server/` — приложение пока здесь |

Спека и эталон схем — `workspaces/agent-cms-core/`.  
Документация пакета — топик [runtime/packages-layout.md](../workspaces/agent-cms-core/runtime/packages-layout.md).
