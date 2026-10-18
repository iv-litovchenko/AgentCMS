# Рефакторинг — часть 14 (набросок)

**Цель:** убрать «монолит на каждый F5» — `public/editor/main.js` ~5 MB (parse + память + долгий TTI).  
**Не цель:** переписать всю логику; сначала **границы модулей + lazy load + сборка**.

---

## 🌳 План (по приоритету)

```
editor boot
│
├── Фаза 0 — замеры (1 день)
│   ├── baseline: размер main.js, Performance trace F5 на `/` и `/0-ws-core`
│   └── Lighthouse / Coverage: % неиспользуемого JS на типичных экранах
│
├── Фаза 1 — сборка без смены поведения
│   ├── [x] minify prod: `npm run build:editor` (+ hash/manifest)
│   ├── [x] `npm run build:editor:watch` — rebuild main.built + manifest
│   ├── [x] entry `editor-entry.js` → bundle `main.built.js` (iife; runtime `/editor/*` import() external)
│   └── index.html: один `<script>` — как сейчас (main source в dev)
│
├── Фаза 2 — вынести уже отдельные скрипты «внутрь» бандла
│   ├── [x] prod: `editor-entry.js` импортирует core/cms/markdown/icons (+ main)
│   ├── [x] loader: skip lazy fetch если `__AGENTCMS_EDITOR_BUNDLE__` и globals на месте
│   ├── [x] prod: post-main + secondary + connection-status в entry
│   ├── [x] prod: menu panels + comfort + document-viewer в entry
│   └── [ ] file-hub on demand; дальше нарезка main
│
├── Фаза 4 — slice 1
│   ├── [x] `channel-presets-runtime.js` (~12 KB)
│   ├── [x] `media-library-presets-runtime.js`
│   ├── [x] `editor-chpu-path-runtime.js` (CHPU workspace + legacy path rewrite)
│   ├── [x] `editor-system-files-runtime.js`
│   ├── [x] `editor-shared-theme-presets-runtime.js`
│   └── [x] `editor-storage-path-runtime.js`
│
├── Фаза 3 — lazy chunks (главный выигрыш CPU)
│   ├── landing-orbit / landing-flow / landing-platform  → import() только на `/`
│   ├── graph / agent-map / obsidian-simulation          → import() при открытии режима
│   ├── agent-rmm-live-brain                             → import() при панели
│   ├── wysiwyg / toastui / тяжёлый preview              → import() при режиме editor
│   └── mermaid — уже отдель vendor; не тащить в core chunk
│
├── Фаза 4 — core остаётся лёгким
│   ├── menu + workspace shell + routing + save/API helpers
│   ├── context menus, props form base, connection-status
│   └── целевой core после split: сильно < 1 MB gzip (ориентир, уточнить замерами)
│
└── Фаза 5 — кэш и деплой
    ├── [x] `build:editor` → `main.<hash>.built.js` + `editor-build-manifest.json`
    ├── [x] `?editorBuilt=1` → manifest → hashed main (immutable URL)
    └── [x] long-cache `immutable` на `main.<hash>.built.js` (+ map); manifest `no-cache`
```

---

## ✅ Критерии «готово»

- [x] Boot: ~5.5 MB vendor + chunks вынесены из F5 (`npm run measure:editor`).
- [ ] F5 на `/0-ws-core`: **Scripting / Parse** в DevTools → таблица в `docs/REFACTOR-14-baseline.md` (Navigation Timing записан 2026-10-17).
- [x] **d3 + agent-rmm-live-brain** — lazy (`editor-script-loader.js`), не в `index.html` на F5.
- [x] **mermaid + toastui (JS + CSS)** — lazy при preview/diagram и режиме WYSIWYG.
- [x] **mammoth + xlsx** — lazy при просмотре docx/xls в `DocumentViewer`.
- [x] **fancybox** — lazy при folder-browse lightbox.
- [x] **Prod/minify boot:** `?editorBuilt=1` или `localStorage agentcms-editor-built=1` → `/editor/main.built.js`.
- [x] `npm run build:editor` → `public/editor/main.built.js` (+ sourcemap).
- [x] Landing chunk (старт): `landing-system-map.js` + `import()` при главной/platform.
- [x] Landing chunk: **flow**, **hub/grid**, **orbit** (`landing-orbit.js`, ~53 KB).
- [x] Graph chunk: `workspace-graph-chunk.js` — map/map2/map3/graph (~33 KB), lazy import.
- [x] Menu panels lazy: `semantic-index-panel`, `entity-registry-editor`, `awn-dashboards` (~155 KB) — `loadEditorMenuPanels`.
- [x] Comfort lazy: pomodoro + idle screensaver + `document-viewer` — `loadWorkspaceComfortScripts` / `loadDocumentViewer`.
- [x] Post-main lazy: discuss, privacy, page-picker, companion, rotators — `loadEditorPostMainScripts` (start of `init`).
- [x] Secondary lazy: languagetool, file-find, marker-blocks, mcp/api docs — `loadEditorSecondaryPanels`.
- [x] Shell lazy: `connection-status` (init), `file-hub-queue-client` (on demand).
- [x] Core helpers lazy: slug-translit, external-file-mask, platform-status — `loadEditorCoreHelpers` (start of `init`).
- [x] CMS core lazy: awn-enum-options, node-config-bundle, topic-schema-slot-specs — `loadEditorCmsCore` (+ lazy topic-schema slot caches in main).
- [x] Markdown preview lazy: markdown-it + plugins + highlight — `loadEditorMarkdownPreview` (start of `init`).
- [x] UI icons lazy: material-file-icons + channel-preset-icons map — `loadEditorUiIcons` (start of `init`).
- [ ] app-lock остаётся sync в index (безопасность до загрузки main).
- [ ] Поведение UI — дочистить smoke (`docs/REFACTOR-14-smoke.md`); частичный прогон: `docs/REFACTOR-14-smoke-log.md`, `npm run check:editor-boot`.

**Сводная таблица:** `docs/REFACTOR-14-status.md`

## 📊 Замеры

- `npm run measure:editor` — размеры main, chunks, deferred vendor
- `docs/REFACTOR-14-baseline.md` — DevTools + таблица baseline
- `npm run check:editor-boot` — статическая проверка index boot

---

## ⚠️ Риски

| Риск | Mitigation |
|------|------------|
| `globalThis.*` / порядок init | явный `boot.js`; globals только на границе legacy |
| Циклические import | фаза 2 маленькими PR, eslint import/no-cycle |
| server отдаёт `editor/main.js` как файл | путь сборки = тот же URL или rewrite в `public-static-layout` |

---

## 🔗 Связано

- `TODO.md` — п. «11 MB статики», lazy mermaid/editor.
- Рефактор 13 — паттерн переноса shell в `public/shell/js/` (аналогично для editor modules).

## Чат

`<!-- uuid при старте работы -->`
