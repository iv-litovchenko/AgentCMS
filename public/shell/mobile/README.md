# Mobile web Shell

Облегчённый клиент Agent Shell для iPhone Safari и «На экран Домой».

## URL

```
http://<IP-Mac>:3000/shell/mobile/
```

Пример: `http://192.168.0.102:3000/shell/mobile/index.html`

## Общий код с iOS

| Файл | Назначение |
|------|------------|
| `public/shell/shell-contract.js` | константы API, фазы, SSE |
| `public/shell/shell-client.js` | HTTP + SSE клиент (web) |
| `mobile/SHELL-API.md` | контракт для Swift |

iOS: `mobile/iphone-shell/AgentShell/Services/` — те же endpoints.

## Возможности

- Hold-to-talk, текст, TTS, стоп озвучки
- SSE с auto-reconnect
- Выбор agent из `/api/agents`
- Chip маршрута (QwenPaw / CMS)
- PWA manifest (`manifest.webmanifest`)

## Mac

```bash
HOST=0.0.0.0 npm start
```

После изменений в JS/CSS — обновите страницу на iPhone (pull-to-refresh).
