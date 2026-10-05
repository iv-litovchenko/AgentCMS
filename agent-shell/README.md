# Agent Shell

Компактная оболочка для Agent CMS: отправка сообщений агенту и озвучка ответов.
Агенты (Cursor, QwenPaw, OpenClaw, Agent Zero…) подключаются к **Agent CMS по MCP** —
shell только пишет в thread/inbox и слушает ответы.

## Desktop (отдельное приложение)

Код Electron-оболочки: `desktop/agent-shell/` (не путать с backend `agent-shell/`).

## iPhone

| Путь | Что это |
|------|---------|
| `mobile/iphone-shell/` | Нативное iOS-приложение (SwiftUI) |
| `public/shell/` | Web-клиент Safari / PWA / desktop browser |

На iPhone укажите URL Mac в локальной сети, например `http://192.168.1.42:3000`. CMS: `HOST=0.0.0.0 npm start`.
Подробнее: [`mobile/README.md`](../mobile/README.md).

```bash
# 1. Собрать Agent Shell.app (один раз)
npm run shell:dist

# 2. Запуск — как обычное Mac-приложение
npm run shell:open
```

Без сборки — dev-окно Electron:

```bash
npm run shell:desktop
```

**Agent CMS server** должен быть запущен (`npm start` или Agent CMS.app).  
Shell.app **не поднимает** CMS автоматически (в отличие от dev-режима).

## Быстрый старт (браузер)

```bash
# 1. CMS
npm start

# 2. Shell UI
open "http://localhost:3000/shell/index.html"

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
| POST | `/api/shell/camera/snapshot` | MCP: запросить кадр (ждёт Shell UI) |
| POST | `/api/shell/camera/snapshot/complete` | Shell UI: ответ на запрос кадра |
| POST | `/api/shell/camera/speech-snapshot` | Кадр при речи (VAD) или вручную |
| GET | `/api/shell/camera/latest?kind=speech\|manual` | Последний сохранённый кадр |
| GET | `/api/shell/stream?agent=` | SSE: status, assistant_message, assistant_delta, agent_activity, camera_snapshot_request, screen_snapshot_request |

Настройки Voice хранятся в workspace агента:

| Файл | Назначение |
|------|------------|
| `.agent-cms/settings/workspace.yml` | конфиг Voice (CMS), поля `voice-*` |
| `.agent-cms/state/shell.json` | runtime Shell (фаза UI, синк, scroll, camera deviceId…) |
| `.agent-cms/settings/platform.yml` | платформа (`default-workspace-id` и др.) |

Legacy `.agent-cms/settings/shell.json` удалён — при первом открытии Shell мигрирует в `workspace.yml` + `state/`.

## Камера (Shell UI)

Агент через MCP `shell_camera_snapshot` может запросить кадр. Shell UI должен быть открыт, камера включена.

- `kind: live` (default) — новый кадр с камеры
- `kind: speech` — последний кадр после голосового сообщения (когда Shell переходит «Слушаю» → «Думаю»)
- `kind: manual` — последний кадр по кнопке 📷

Настройки: `cameraEnabled`, `cameraOnSpeech`, `cameraFacing` (`user` | `environment` | `device`), `cameraDeviceId`.

## Экран (Shell UI)

Агент через MCP `shell_screenshot` может запросить снимок экрана. Shell UI должен быть открыт, демонстрация экрана включена (браузер попросит выбрать окно/экран).

- `kind: live` (default) — новый снимок с демонстрации
- `kind: speech` — последний снимок после голосового сообщения
- `kind: manual` — последний снимок по кнопке 🖥

Настройки: `screenEnabled`, `screenOnSpeech`.

HTTP: `POST /api/shell/screen/snapshot`, `GET /api/shell/screen/latest?kind=speech|manual`.

### Agent CMS (по умолчанию)

1. Shell отправляет текст в thread (`awn-agent-kit/agent/manifest.md` по умолчанию).
2. MCP-агент читает thread и отвечает (`append_thread`, role agent).
3. Shell получает ответ по SSE и озвучивает (Web Speech API или sidecar).

### QwenPaw

1. В UI выберите **Куда отправлять → QwenPaw**.
2. Shell шлёт текст на `POST http://127.0.0.1:8088/api/console/chat` (заголовок `X-Agent-Id`).
3. Ответ стримится из QwenPaw: Shell показывает текст по мере генерации (`assistant_delta` по SSE), затем финализирует markdown и TTS по предложениям.
4. Режим **QwenPaw + лог в CMS** дополнительно пишет диалог в thread CMS (ответ — целиком; при обрыве — сохраняется часть).

Настройки QwenPaw в CMS (`workspace.yml`): `voice-route-qwenpaw-url`, `voice-route-qwenpaw-user-id`, `voice-route-qwenpaw-agent-id`, `voice-route-qwenpaw-approval-level`, `voice-route-qwenpaw-session-id`. Runtime qwenpaw (`chatName`, `stt.*`) — в `state/shell.json`.

## Desktop

В Electron: **Tray → Agent Shell** (из `npm run cms:desktop`) или `npm run shell:desktop`.

## Переменные sidecar

| Переменная | По умолчанию |
|------------|--------------|
| `AGENT_CMS_BASE_URL` | `http://127.0.0.1:3000` |
| `AGENT_CMS_AGENT` | default из `awn-agents.json` |
| `SHELL_SAY_VOICE` | `Milena` (ru на macOS) |

В UI выберите **TTS engine: sidecar** (сохраняется как `ttsEngine: sidecar`) и запустите sidecar.

## UI · блок «Последний ответ агента»

Внизу окна Shell — секция `section.shell-reply` (**«Последний ответ агента»**).

Сюда выводится **полный текст** последнего ответа агента (QwenPaw или CMS) — как пришёл от модели, включая emoji и markdown. Это отдельно от карточки статуса сверху (фаза «Ожидаю / Думаю / Говорю» и короткая строка).

Озвучка (TTS) читает тот же текст; позже — отдельная «spoken»-версия без emoji и таблиц, а в `shell-reply` остаётся полный ответ для чтения.

**Ниже этого блока в UI** (планируется добавить):

## TODO · Agent Shell UI

- **Команды** — палитра / меню быстрых действий
- **Сделать скриншот** — захват окна Shell
- **Изменить размер окна** — пресеты или ручной resize
- **Показаться / спрятаться** — show/hide окна (tray, hotkey)

_Дополним позже._
