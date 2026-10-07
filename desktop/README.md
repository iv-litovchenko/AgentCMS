# Desktop apps

Три Electron-приложения в одном репозитории.

| | Agent CMS | Agent Shell | Agent CMS Control |
|---|-----------|-------------|---------------|
| **Назначение** | Редактор CMS | Agent CMS Voice | Пульт: сервер, сборки, зависимости |
| **Dev** | `npm run cms:desktop` | `npm run shell:desktop` | `npm run control:desktop` |
| **Сборка** | `npm run cms:dist` | `npm run shell:dist` | `npm run control:dist` |
| **Pack** | `npm run cms:pack` | `npm run shell:pack` | `npm run control:pack` |
| **Открыть .app** | `npm run cms:open` | `npm run shell:open` | `npm run control:open` |

Старт из корня: **`install.command`** (один раз), затем **`welcome.command`** (Control). Альтернатива: `commands/install-deps.command`.

На рабочем столе (кнопка «Ярлыки Desktop» в Control):
- `ACMS-Control.app` → `dist/agent-control/`
- `ACMS-Editor.app` → `dist/agent-cms/`
- `ACMS-Voice.app` → `dist/agent-shell/`
- `ACMS-Browser-Extension` → `browser-extension/` (папка расширения)

Сборка Control: `npm run control:dist` → `dist/agent-control/Agent CMS Control.app`

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
