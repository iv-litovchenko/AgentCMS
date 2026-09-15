# Desktop apps

Три Electron-приложения в одном репозитории.

| | Agent CMS | Agent Shell | Agent CMS Control |
|---|-----------|-------------|---------------|
| **Назначение** | Редактор CMS | Agent CMS Voice | Пульт: сервер, сборки, зависимости |
| **Dev** | `npm run cms:desktop` | `npm run shell:desktop` | `npm run control:desktop` |
| **Сборка** | `npm run cms:dist` | `npm run shell:dist` | `npm run control:dist` |
| **Pack** | `npm run cms:pack` | `npm run shell:pack` | `npm run control:pack` |
| **Открыть .app** | `npm run cms:open` | `npm run shell:open` | `npm run control:open` |

Старт из корня проекта: **`welcome.command`** (скрипт) или **`Agent CMS Control.app`** (с иконкой).

На рабочем столе (кнопка «Ярлыки Desktop» в Control):
- `Agent CMS Control.app` — пульт
- `Agent CMS.app` — редактор (после сборки)
- `Agent CMS Voice.app` — Voice (после сборки)

Сборка Control:
- `npm run control:dist` — полный .app в `dist/agent-control/`
- `npm run control:launcher` — `Agent CMS Control.app` с иконкой в корне (опционально)

Или кнопками внутри Agent CMS Control → карточка **Control**.

Отдельные команды: [`commands/`](../commands/).

## Артефакты (`dist/`)

```
dist/
  agent-cms/      → Agent CMS.app
  agent-shell/    → Agent Shell.app
  agent-control/  → Agent CMS Control.app
```

Код: [`agent-cms/`](agent-cms/), [`agent-shell/`](agent-shell/), [`agent-control/`](agent-control/).
