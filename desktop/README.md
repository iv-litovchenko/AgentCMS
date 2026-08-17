# Desktop apps

Два отдельных Electron-приложения в одном репозитории.

## Команды

| | Agent CMS | Agent Shell |
|---|-----------|-------------|
| **Dev** | `npm run cms:desktop` | `npm run shell:desktop` |
| **Сборка** | `npm run cms:dist` | `npm run shell:dist` |
| **Pack (без инсталлятора)** | `npm run cms:pack` | `npm run shell:pack` |
| **Открыть .app** | `npm run cms:open` | `npm run shell:open` |

## Артефакты (`dist/`)

Сборки лежат **рядом**, без вложенности друг в друга:

```
dist/
  agent-cms/
    Agent CMS.app
    Agent CMS-0.1.0.dmg
    Agent CMS-0.1.0-mac.zip
  agent-shell/
    Agent Shell.app
    Agent Shell-0.1.0.dmg
    Agent Shell-0.1.0-mac.zip
```

Папки `mac/` внутри убраны скриптом `scripts/flatten-desktop-dist.js` после сборки.

Если остались старые `dist/mac/` или `dist/shell/`:

```bash
npm run dist:migrate
```

Полная пересборка:

```bash
npm run dist:clean
npm run cms:dist
npm run shell:dist
```

Код приложений: [`agent-cms/`](agent-cms/) и [`agent-shell/`](agent-shell/).

## Связанные папки (не путать)

| Путь | Что это |
|------|---------|
| `desktop/agent-shell/` | Electron-оболочка (окно, иконка) |
| `mobile/iphone-shell/` | iOS-приложение (SwiftUI) |
| `agent-shell/` | Backend Shell: API, sidecar, QwenPaw (`npm run shell:sidecar`) |
| `public/shell/` | Web UI Shell (desktop · browser · mobile · PWA) |

В **Agent CMS.app** упакован backend `agent-shell/` (API для `/shell/` в браузере) — это не desktop-приложение Shell.
