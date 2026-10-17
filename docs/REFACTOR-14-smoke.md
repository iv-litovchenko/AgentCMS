# Refactor 14 — smoke checklist

Перед прогоном: `npm start`, hard refresh (Disable cache в Network).  
Размеры: `npm run measure:editor` → [REFACTOR-14-baseline.md](./REFACTOR-14-baseline.md).

## Boot / workspace (`/0-ws-core`)

- [ ] Hard refresh: Network **нет** `mermaid`, `toastui`, `mammoth`, `xlsx`, `fancybox`, `d3`, `agent-rmm-live-brain`
- [ ] До конца init: **нет** `semantic-index-panel`, `entity-registry-editor`, `awn-dashboards` в очереди до `main.js`; после init — подгрузка панелей меню
- [ ] Network **нет** `landing-runtime.js` до перехода на главную
- [ ] Меню, открытие темы, save lamp (без ложного dirty)
- [ ] Preview markdown + mermaid fence → подгружается `mermaid.min.js`
- [ ] WYSIWYG → toastui CSS/JS

## Главная (`/`)

- [ ] Orbit / **grid** / **hub** / **flow** — переключение видов (grid/hub/flow — lazy chunk)
- [ ] Flow: скелетон → карточки recent updates
- [ ] Platform-секция: карта системы (system map chunk)
- [ ] `landing-runtime.js`, `landing-flow.js`, `landing-system-map.js` в Network

## Workspace views

- [ ] Map / map2 / map3 / graph — lazy `workspace-graph-chunk.js?v=2`, UI как раньше
- [ ] Dashboard3 (виджеты) — `awn-dashboards.js` + рендер виджетов
- [ ] Меню: индексы workspace (semantic panel), entity registry modal
- [ ] Folder-browse lightbox → fancybox
- [ ] Document viewer docx/xlsx → mammoth/xlsx

## Prod minify (опционально)

- [ ] `npm run build:editor` (manifest + hashed bundle)
- [ ] `?editorBuilt=1` → Network: `editor-build-manifest.json`, затем `main.<hash>.built.js` (без `?v=` на main), UI без регрессий
- [ ] Без manifest (старый деплой): fallback на `main.built.js?v=…`

## DevTools (фаза 0)

- [ ] Performance: F5 `/0-ws-core` — Scripting / Parse vs baseline
- [ ] Coverage: % unused JS на workspace vs landing
