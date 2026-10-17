# Refactor 14 — baseline (размеры и замеры)

Актуальные цифры: `npm run measure:editor` (перегенерировать после крупных изменений).  
Автопроверка HTML boot: `npm run check:editor-boot -- https://127.0.0.1:3002` (dev TLS).

## Что не грузится на F5 `/0-ws-core`

| Категория | Поведение |
|-----------|-----------|
| Vendor lazy | mermaid, toastui, mammoth, xlsx, fancybox, d3, RMM brain — только по действию |
| Landing chunks | `landing-runtime.js` (+ flow/hub/orbit/system-map) — только на главной |
| Graph chunk | `workspace-graph-chunk.js` — только map/map2/map3/graph |
| Menu panels | semantic-index, entity-registry, awn-dashboards — после init `main.js` |
| Shell lazy | connection-status — в `init()`; file-hub — по кнопке «в файлообменник» |

## DevTools — parse/compile (фаза 0)

Краткая инструкция: [REFACTOR-14-devtools-steps.md](./REFACTOR-14-devtools-steps.md).

1. Chrome → **Performance** → Record → Hard reload на `https://127.0.0.1:3002/0-ws-core`.
2. Смотреть **Scripting** и breakdown **Parse/Compile** (Main thread).
3. Повторить на `/` (landing) — ожидаем spike при `landing-orbit.js`.
4. **Coverage** (Cmd+Shift+P → Coverage): reload workspace → % unused в `main.js`.

### Таблица Performance (Main thread)

Заполнить из панели Performance (Scripting / Parse+Compile). Ниже — **Navigation Timing** с той же машины (2026-10-17, Chrome automation), не замена Scripting.

| URL | Scripting (ms) | Parse/compile (ms) | Navigation DCL (ms) | Load (ms) | main transfer (B) | Примечание |
|-----|----------------|---------------------|---------------------|-----------|-------------------|------------|
| `/0-ws-core` | *Performance* | *Performance* | 242 | 7413 | 5056153 (`main.js`) | 44 script resources; lazy vendor/chunks absent |
| `/` landing | *Performance* | *Performance* | 734 | 3264 | — | landing chunks ~101 KB transfer |
| `/0-ws-core?editorBuilt=1` | *Performance* | *Performance* | 424 | 4983 | 3802446 (`main.fd29d55c.built.js`, cache hit → 0 wire) | manifest → hashed URL без `?v=` |

**Ориентир размеров (gzip raw):** `npm run measure:editor` — main 4.82 MB → built 3.63 MB; deferred vendor ~5.74 MB; lazy chunks ~118 KB.

## Prod minify

- `npm run build:editor` — `main.built.js`, `main.<8-char-hash>.built.js`, `editor-build-manifest.json`
- `?editorBuilt=1` или `localStorage.setItem('agentcms-editor-built','1')` — loader читает manifest, грузит hashed URL (без query на main)
- **Fix 2026-10-17:** async manifest loader держит `loaderScript` — иначе `document.currentScript` null и main не грузился

## Smoke

Чеклист: [REFACTOR-14-smoke.md](./REFACTOR-14-smoke.md)  
Прогон 2026-10-17: [REFACTOR-14-smoke-log.md](./REFACTOR-14-smoke-log.md)
