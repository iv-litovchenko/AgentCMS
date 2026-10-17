# Refactor 14 — smoke checklist

Перед прогоном: `npm start`, hard refresh (Disable cache в Network).  
Размеры: `npm run measure:editor` → [REFACTOR-14-baseline.md](./REFACTOR-14-baseline.md).  
Автопроверка boot HTML: `npm run check:editor-boot -- https://127.0.0.1:3002`.  
Последний прогон: [REFACTOR-14-smoke-log.md](./REFACTOR-14-smoke-log.md).

## Boot / workspace (`/0-ws-core`)

- [x] Hard refresh: Network **нет** `mermaid`, `toastui`, `mammoth`, `xlsx`, `fancybox`, `d3`, `agent-rmm-live-brain`
- [x] До `main.js` в index **нет** panel-скриптов; после init — подгрузка панелей меню
- [x] Network **нет** `landing-runtime.js` до перехода на главную
- [x] Меню / workspace shell (дашборд открывается)
- [ ] Save lamp (без ложного dirty) — не проверяли
- [ ] Preview markdown + mermaid fence → `mermaid.min.js`
- [ ] WYSIWYG → toastui CSS/JS

## Главная (`/`)

- [ ] Orbit / **grid** / **hub** / **flow** — переключение видов
- [ ] Flow: скелетон → карточки recent updates
- [x] Platform / landing: chunks `landing-runtime`, flow, hub, orbit, system-map в Network
- [ ] Карта системы в UI

## Workspace views

- [ ] Map / map2 / map3 / graph — lazy `workspace-graph-chunk.js?v=2`
- [ ] Dashboard3 (виджеты) — `awn-dashboards.js`
- [ ] Меню: индексы workspace, entity registry modal
- [ ] Folder-browse lightbox → fancybox
- [ ] Document viewer docx/xlsx → mammoth/xlsx

## Prod minify (опционально)

- [x] `npm run build:editor` (manifest + hashed bundle)
- [x] `?editorBuilt=1` → manifest + `main.<hash>.built.js` (без `?v=` на main)
- [ ] Fallback `main.built.js?v=…` при отсутствии manifest

## DevTools (фаза 0)

- [ ] Performance: F5 — Scripting / Parse в [baseline](./REFACTOR-14-baseline.md) (Navigation Timing уже есть)
- [ ] Coverage: % unused JS на workspace vs landing
