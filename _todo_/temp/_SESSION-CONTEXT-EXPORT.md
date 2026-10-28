# Выгрузка `get_session_context` (live)

**Дата:** 2026-10-17  
**HTTP:** `GET /api/agent/session-context?agent=<workspaceId>` (CMS на портах из `.env`, сработал **3002/3001**)

## Файлы

| Workspace | JSON | Размер (raw) | ~tokens (÷4) | topics | always items |
| --------- | ---- | ------------ | ------------ | ------ | ------------- |
| `0-ws-test` | [_session-context-0-ws-test.json](./_session-context-0-ws-test.json) | ~47 KB | ~10k | 44 | 4 |
| `0-ws-core` | [_session-context-0-ws-core.json](./_session-context-0-ws-core.json) | ~27 KB | ~7k | 4 | 3 |

Повторить:

```bash
curl -sk "https://localhost:3002/api/agent/session-context?agent=0-ws-test" -o _todo_/temp/_session-context-0-ws-test.json
```

(или `http://localhost:3001/…` без `-k`)
