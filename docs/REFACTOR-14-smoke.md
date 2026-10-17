# Refactor 14 — smoke checklist

Перед прогоном: `npm start`, hard refresh (Disable cache в Network).  
Размеры: `npm run measure:editor` → [REFACTOR-14-baseline.md](./REFACTOR-14-baseline.md).  
DevTools: [REFACTOR-14-devtools-steps.md](./REFACTOR-14-devtools-steps.md).  
Автопроверка boot HTML: `npm run check:editor-boot -- https://127.0.0.1:3002`.  
Лог прогона: [REFACTOR-14-smoke-log.md](./REFACTOR-14-smoke-log.md).

## Boot / workspace (`/0-ws-core`)

- [x] Hard refresh: Network **нет** mermaid, toastui, mammoth, xlsx, fancybox, d3, agent-rmm-live-brain
- [x] **нет** panel-скриптов в index; после init — semantic/entity/dashboards
- [x] **нет** landing-runtime / workspace-graph-chunk на workspace F5
- [x] **нет** document-viewer / pomodoro / idle-screensaver в index (lazy после init)
- [x] Меню / workspace shell
- [ ] Save lamp без ложного dirty (открыть NOTE `~edit`, не трогать текст → Save не `is-dirty`)
- [x] Preview + mermaid fence → `mermaid.min.js` (автопрогон 2026-10-17)
- [x] WYSIWYG → toastui CSS/JS

## Главная (`/`)

- [x] Tabs: Карта / Список / Лента потока (flow grid виден)
- [ ] Flow: skeleton → cards (визуально)
- [x] Landing chunks в Network
- [ ] Карта системы в UI (platform)

## Workspace views

- [x] Graph view + `workspace-graph-chunk.js`
- [x] Dashboard3 + `awn-dashboards.js`
- [x] Entity registry modal
- [ ] Map2/map3 (map2 disabled в UI — skip если так задумано)
- [ ] Fancybox (folder-browse lightbox)
- [ ] docx/xlsx (нет файлов в 0-ws-core — skip или добавить fixture)

## Prod minify

- [x] build:editor + manifest + hashed main
- [x] `?editorBuilt=1` после fix loader
- [ ] Fallback `main.built.js` (удалить manifest локально / 404)

## DevTools (фаза 0)

- [ ] Performance Scripting/Parse → baseline
- [ ] Coverage unused % workspace vs landing
