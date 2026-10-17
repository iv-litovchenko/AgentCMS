# Refactor 14 — smoke checklist

## Boot / workspace (`/0-ws-core`)

- [ ] Hard refresh: Network **нет** `mermaid`, `toastui`, `mammoth`, `xlsx`, `fancybox`, `d3`, `agent-rmm-live-brain`
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
- [ ] Folder-browse lightbox → fancybox
- [ ] Document viewer docx/xlsx → mammoth/xlsx

## Prod minify (опционально)

- [ ] `?editorBuilt=1` → `main.built.js`, UI без регрессий

## DevTools (фаза 0)

- [ ] Performance: F5 `/0-ws-core` — Scripting / Parse vs baseline
- [ ] Coverage: % unused JS на workspace vs landing
