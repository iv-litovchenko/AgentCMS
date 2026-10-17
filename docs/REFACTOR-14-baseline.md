# Refactor 14 — baseline (размеры и замеры)

Актуальные цифры: `npm run measure:editor` (перегенерировать после крупных изменений).

## Что не грузится на F5 `/0-ws-core`

| Категория | Поведение |
|-----------|-----------|
| Vendor lazy | mermaid, toastui, mammoth, xlsx, fancybox, d3, RMM brain — только по действию |
| Landing chunks | `landing-runtime.js` (+ flow/hub/orbit/system-map) — только на главной |
| Graph chunk | `workspace-graph-chunk.js` — только map/map2/map3/graph |

## DevTools — parse/compile (фаза 0)

1. Chrome → **Performance** → Record → Hard reload на `http://localhost:3002/0-ws-core`.
2. Смотреть **Scripting** и breakdown **Parse/Compile** (Main thread).
3. Повторить на `/` (landing) — ожидаем spike при `landing-orbit.js`.
4. **Coverage** (Cmd+Shift+P → Coverage): reload workspace → % unused в `main.js`.

Записать в таблицу (ручной замер):

| URL | Scripting (ms) | Parse/compile (ms) | Примечание |
|-----|----------------|---------------------|------------|
| `/0-ws-core` | | | после refactor 14 |
| `/` landing | | | orbit chunk |
| `/0-ws-core?editorBuilt=1` | | | main.built.js |

## Prod minify

- `npm run build:editor` — `main.built.js`, `main.<8-char-hash>.built.js`, `editor-build-manifest.json`
- `?editorBuilt=1` или `localStorage.setItem('agentcms-editor-built','1')` — loader читает manifest, грузит hashed URL (без query на main)
- Сравнить размеры в `npm run measure:editor`

## Smoke

Чеклист: [REFACTOR-14-smoke.md](./REFACTOR-14-smoke.md)
