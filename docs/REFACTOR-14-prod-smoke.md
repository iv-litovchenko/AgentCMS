# Refactor 14 — prod smoke (`?editorBuilt=1`)

После изменений `editor-entry.js` / `main.built.js`.

## Включить prod main

1. `npm run build:editor`
2. Открыть `https://127.0.0.1:3002/0-ws-core?editorBuilt=1` (или `localStorage.setItem('agentcms-editor-built','1')` + reload)

В Network: один `main.<hash>.built.js`, **нет** повторной загрузки slug-translit, discuss-panel, semantic-index и т.д.

## Чеклист (P2)

| # | Проверка | OK |
|---|----------|-----|
| 1 | Workspace boot, дерево меню | ☐ |
| 2 | Footer → semantic index / entity registry / dashboards | ☐ |
| 3 | Discuss panel, privacy mode | ☐ |
| 4 | API docs modal (secondary) | ☐ |
| 5 | Offline banner / connection-status | ☐ |
| 6 | Markdown preview + highlight | ☐ |
| 7 | Document viewer (docx/xlsx fixture) | ☐ |
| 8 | Pomodoro / screensaver (comfort) | ☐ |
| 9 | awn-channels presets в меню (channel-presets-runtime) | ☐ |
| 10 | Landing `/` + graph mode lazy chunks | ☐ |

Записать результат в [REFACTOR-14-smoke-log.md](./REFACTOR-14-smoke-log.md).
