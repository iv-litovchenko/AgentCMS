# Desktop apps

Три Electron-приложения в одном репозитории.

| | Agent CMS | Agent Shell | Agent Control |
|---|-----------|-------------|---------------|
| **Назначение** | Редактор CMS | Agent CMS Voice | Пульт: сервер, сборки, зависимости |
| **Dev** | `npm run cms:desktop` | `npm run shell:desktop` | `npm run control:desktop` |
| **Сборка** | `npm run cms:dist` | `npm run shell:dist` | `npm run control:dist` |
| **Pack** | `npm run cms:pack` | `npm run shell:pack` | `npm run control:pack` |
| **Открыть .app** | `npm run cms:open` | `npm run shell:open` | `npm run control:open` |

Ярлык в корне: **`Agent Control.app`** (с иконкой).

Сборка Control:
- `npm run control:dist` — полный .app в `dist/agent-control/`
- `npm run control:launcher` — ярлык с иконкой в корне проекта

Или кнопками внутри Agent Control → карточка **Control**.

Отдельные команды: [`commands/`](../commands/).

## Артефакты (`dist/`)

```
dist/
  agent-cms/      → Agent CMS.app
  agent-shell/    → Agent Shell.app
  agent-control/  → Agent Control.app
```

Код: [`agent-cms/`](agent-cms/), [`agent-shell/`](agent-shell/), [`agent-control/`](agent-control/).
