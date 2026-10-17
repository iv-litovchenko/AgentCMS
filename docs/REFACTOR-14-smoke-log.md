# Refactor 14 — smoke log (2026-10-17)

Окружение: `https://127.0.0.1:3002`, Chrome (Cursor browser).  
Статика boot: `npm run check:editor-boot` — **PASS** (15/15).

## Boot / workspace (`/0-ws-core`)

- [x] Hard refresh: **нет** mermaid, toastui, mammoth, xlsx, fancybox, d3, agent-rmm-live-brain (CDP resource check)
- [x] **нет** landing-runtime / workspace-graph-chunk на workspace
- [x] semantic-index / entity-registry / awn-dashboards **не в index.html**; после init `main.js` индексы 58–74 (после main idx 47)
- [x] Workspace UI: title «Ядро платформы — Дашборд», меню отрисовано
- [ ] Preview markdown + **mermaid** fence — не прогоняли в этой сессии
- [ ] **WYSIWYG** → toastui — не прогоняли

## Главная (`/`)

- [x] Landing chunks в Network: runtime, system-map, flow, hub, orbit
- [ ] Ручное переключение Orbit / grid / hub / flow — не кликали по всем табам
- [ ] Flow skeleton → cards — не проверяли

## Workspace views

- [ ] Map / map2 / map3 / graph + `workspace-graph-chunk.js` — не открывали
- [ ] Dashboard3 виджеты — не открывали
- [ ] Entity registry modal — не открывали
- [ ] Fancybox / docx/xlsx viewer — не прогоняли

## Prod minify

- [x] `editor-build-manifest.json` + `main.fd29d55c.built.js` (без `?v=` на main)
- [x] UI после fix loader: дашборд workspace, не «Загружаем важное…»

## DevTools (фаза 0)

- [ ] Performance Scripting / Parse — **в таблицу baseline вручную** (Navigation Timing записан в [REFACTOR-14-baseline.md](./REFACTOR-14-baseline.md))
- [ ] Coverage % unused — не снимали

## Регрессии

- [x] **Исправлено:** `?editorBuilt=1` / localStorage — main не подключался (async + `document.currentScript`).
