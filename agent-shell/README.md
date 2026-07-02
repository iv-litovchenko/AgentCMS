# Agent Shell

Компактная оболочка для Agent CMS: отправка сообщений агенту и озвучка ответов.
Агенты (Cursor, QwenPaw, OpenClaw, Agent Zero…) подключаются к **Agent CMS по MCP** —
shell только пишет в thread/inbox и слушает ответы.

## Desktop (отдельное приложение)

```bash
# Dev — своё окно + своя иконка в Dock
npm run shell:desktop

# Собрать Agent Shell.app
npm run shell:dist
open "dist/shell/mac/Agent Shell.app"
```

Или двойной клик: **`Start-Agent-Shell-App.command`**

Подробнее: `agent-shell-desktop/README.md`

## Быстрый старт (браузер)

```bash
# 1. CMS
npm start

# 2. Shell UI
open "http://localhost:3000/shell/index.html?agent=agent-cms-test"

# 3. (опционально) TTS sidecar для macOS say
AGENT_CMS_AGENT=agent-cms-test npm run shell:sidecar
```

## API

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/shell/status?agent=` | Статус, настройки, последний ответ |
| GET | `/api/shell/settings?agent=` | Настройки shell |
| POST | `/api/shell/settings?agent=` | Сохранить настройки |
| POST | `/api/shell/state?agent=` | Обновить phase/phrase (sidecar) |
| POST | `/api/shell/message?agent=` | `{ "body": "…" }` → thread/inbox |
| POST | `/api/shell/stop-tts?agent=` | Остановить озвучку |
| GET | `/api/shell/stream?agent=` | SSE: status, assistant_message, stop_tts |

Настройки хранятся в workspace агента: `.agent-shell/settings.json`.

## Поток

### Agent CMS (по умолчанию)

1. Shell отправляет текст в thread (`awn-agent-kit/agent/manifest.md` по умолчанию).
2. MCP-агент читает thread и отвечает (`append_thread`, role agent).
3. Shell получает ответ по SSE и озвучивает (Web Speech API или sidecar).

### QwenPaw

1. В UI выберите **Куда отправлять → QwenPaw**.
2. Shell шлёт текст на `POST http://127.0.0.1:8088/api/console/chat` (заголовок `X-Agent-Id`).
3. Ответ парсится из SSE, озвучивается в Shell.
4. Режим **QwenPaw + лог в CMS** дополнительно пишет диалог в thread CMS.

Настройки QwenPaw: `qwenpawBaseUrl`, `qwenpawAgentId`, `qwenpawSessionId` в `.agent-shell/settings.json`.

## Desktop

В Electron: **Tray → Agent Shell** или `npm run desktop` и меню.

## Переменные sidecar

| Переменная | По умолчанию |
|------------|--------------|
| `AGENT_CMS_BASE_URL` | `http://127.0.0.1:3000` |
| `AGENT_CMS_AGENT` | default из `awn-agents.json` |
| `SHELL_SAY_VOICE` | `Milena` (ru на macOS) |

В UI выберите **TTS engine: sidecar** (сохраняется как `ttsEngine: sidecar`) и запустите sidecar.
