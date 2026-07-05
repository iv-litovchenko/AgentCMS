# Agent Shell API · контракт клиентов

Один backend (`agent-shell/`), два клиента:

| Клиент | Путь |
|--------|------|
| Web mobile | `public/shell/mobile/` + `shell-client.js` |
| iOS | `mobile/iphone-shell/AgentShell/Services/` |

Web-константы: `public/shell/shell-contract.js`.

## REST

| Метод | Путь | Query | Body |
|-------|------|-------|------|
| GET | `/api/shell/status` | `agent` | — |
| GET | `/api/shell/settings` | `agent` | — |
| POST | `/api/shell/message` | `agent` | `{ "body", "author": "shell", "voice": bool }` |
| POST | `/api/shell/stop-tts` | `agent` | `{}` |
| GET | `/api/agents` | — | список агентов для picker |

## SSE `GET /api/shell/stream?agent=`

| event | payload |
|-------|---------|
| `status` | полный status (как GET status) |
| `state` | `{ phase, phrase, lastShellReply?, ... }` или `{ payload: {...} }` |
| `assistant_message` | `{ message: { id, body, role, ... } }` |
| `assistant_delta` | `{ delta?, body?, streamId? }` |

## Фазы (`phase`)

`waiting` · `listening` · `thinking` · `speaking` · `disabled`

## iOS ↔ web parity

При добавлении feature в mobile web — дублировать в Swift:

- `ShellAPIClient.swift` — REST
- `ShellEventStream.swift` — SSE events (те же имена)
- `ShellViewModel.swift` — фазы, reply, TTS
