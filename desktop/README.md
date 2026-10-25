# Desktop apps

Четыре Electron-приложения в одном репозитории (+ HTTP Commander без Electron: `npm run commander:start`).

| | Agent CMS | Agent Shell | Agent CMS Commander | Agent CMS Control |
|---|-----------|-------------|---------------------|-------------------|
| **Назначение** | Редактор CMS | Agent CMS Voice | Управление ПК (MVP: HTTP UI) | Пульт: сервер, сборки, зависимости |
| **Dev** | `npm run cms:desktop` | `npm run shell:desktop` | `npm run commander:desktop` | `npm run control:desktop` |
| **Сборка** | `npm run cms:dist` | `npm run shell:dist` | `npm run commander:dist` | `npm run control:dist` |
| **Pack** | `npm run cms:pack` | `npm run shell:pack` | `npm run commander:pack` | `npm run control:pack` |
| **Открыть .app** | `npm run cms:open` | `npm run shell:open` | `npm run commander:open` | `npm run control:open` |

Старт сервера: **`cms-start.command`** (Mac Docker) или **`agent-cms start`**. Конфиг — **`.env`** (`AGENT_CMS_PUBLIC_URL`).

Electron `.app` по умолчанию — **только URL** (`desktop/shared/url-shell.js`): Editor `/`, Voice `/app-chat/`, Control `/app-control/`, Commander `/app-commander/`. Сервер не поднимается; если стек выключен — экран «офлайн» с кнопкой «Повторить». Встроенный сервер (legacy): **`AGENT_CMS_ELECTRON_LEGACY=1`**.

CLI: **`agent-cms status`**, **`agent-cms electron-app build`**, **`agent-cms electron-app shortcuts`** (короче: **`electron build`** / **`electron shortcuts`**).

На рабочем столе (кнопка «Ярлыки Desktop» в Control):
- `ACMS-Editor` → `dist/agent-cms/Agent CMS.app`
- `ACMS-Chat` → `dist/agent-shell/Agent Shell.app`
- `ACMS-Control` → `dist/agent-control/Agent CMS Control.app`
- `ACMS-Commander` → `dist/agent-commander/Agent CMS Commander.app`

Сборка Control: `npm run control:dist` → `dist/agent-control/Agent CMS Control.app`

Или кнопками внутри Agent CMS Control → карточка **Control**.

Отдельные команды: [`commands/`](../commands/).

## Артефакты (`dist/`)

```
dist/
  agent-cms/      → Agent CMS.app
  agent-shell/    → Agent Shell.app
  agent-control/  → Agent CMS Control.app
  agent-commander/ → Agent CMS Commander.app
```

Порт Commander (HTTP): `AGENT_CMS_COMMANDER_HTTP_PORT` в `.env`, по умолчанию **3188**.  
UI: [`public/commander/`](../public/commander/) (как Voice → [`public/shell/`](../public/shell/)).

Код: [`agent-cms/`](agent-cms/), [`agent-shell/`](agent-shell/), [`agent-commander/`](agent-commander/), [`agent-control/`](agent-control/).
