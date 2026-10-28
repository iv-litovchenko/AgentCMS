# Refactor 20 — фаза D (внутренняя страница / workspace boot)

## Сделано

1. **`loadAgents()`**
   - `loadLandingAgentsGroups()` только на маршруте landing (`/` / legacy), не на каждом F5 workspace.

2. **`init()` — workspace CHPU (`AgentCmsBootRoute.isWorkspaceBootRoute()`)**
   - Critical path: core helpers, CMS core, markdown preview, UI icons, connection-status.
   - **Не ждём** `postMain` + secondary (discuss, page-picker, LanguageTool, file-find, marker-blocks) в `Promise.all` — фоном через `startDeferredWorkspaceHeavyScripts()`.
   - **Comfort** (screensaver, pomodoro): скрипты грузятся асинхронно, mount после `loadWorkspaceComfortScripts`.
   - **Menu panels** (semantic index, dashboards): `WorkspaceIndexPanel.refreshStatus` только после `ensureEditorMenuPanelsUi()`.

3. **Landing `/`**
   - Поведение как раньше: postMain + secondary в параллельном boot.

## Не в этой итерации

- Slices `main.js` (MODE_GROUPS, save/API) — REFACTOR-14 P1.
- Правая панель слотов async — пересечение с TODO.md.
- Явный lazy-load secondary по клику «Поиск в файле» / LanguageTool (достаточно фоновой подгрузки после core).

## Проверка

```bash
npm run check:refactor-20:offline
# DevTools → Network, F5 /0-ws-core/…:
#   main.js стартует без ожидания discuss-panel / languagetool / file-find в critical path
#   landing-groups API не дергается на workspace URL
# F5 / — landing groups + postMain по-прежнему в boot
```

## Связь с фазой C

- C: не грузить `landing-chunk-boot` на workspace.
- D: не блокировать workspace на landing API и тяжёлых post-main панелях.
