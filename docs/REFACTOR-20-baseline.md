# Refactor 20 — baseline (две двери: `/` и workspace)

**Дата среза:** 2026-10-28 (после **фазы A**: app-docs, health, modals/docs JS вырезаны из editor).

Перегенерировать размеры: `npm run measure:editor`  
Автопроверки фазы B: `npm run check:refactor-20 [-- baseUrl]` · offline: `npm run check:refactor-20 -- --offline`  
DevTools (Scripting / Coverage): [REFACTOR-20-devtools-steps.md](./REFACTOR-20-devtools-steps.md)

---

## Размеры бандла (static, `measure:editor`)

| Asset | raw | gzip (orientir) | Комментарий |
|-------|-----|-----------------|-------------|
| `main.js` (dev) | **4.93 MB** (5 173 849 B) | **~0.99 MB** | −~13 KB vs до вырезки docs-блока в main |
| `main.built.js` / hashed | **3.14 MB** | **~0.81 MB** | **устарел** до `npm run build:editor` после фазы A |
| `index.html` | **514 KB** (526 738 B) | — | без 3 modals api/user/mcp docs |
| Lazy landing+graph chunks | **~140 KB** raw | — | не на workspace F5 |
| Deferred vendor (lazy) | **~5.74 MB** raw | — | не в index boot |

---

## Фаза A — ожидания Network (editor idle)

| Запрос | Editor F5 / idle | app-docs |
|--------|------------------|----------|
| `/api/health` | ✅ poll ~30 s | не нужен |
| `/api/docs-meta` | ❌ | ✅ при открытии API/MCP |
| `/api/docs`, `/api/mcp-docs` | ❌ | ✅ по вкладке |
| `/api/user-docs-index` | ❌ | ✅ guides |

Проверка статики/HTTP: `npm run check:refactor-20` (нужен **перезапуск** `npm start` после фазы A — иначе 404 на `/api/health` и старый `index.html` в ответе).

---

## DevTools Performance (заполнить вручную)

Navigation Timing **не заменяет** Scripting/Parse. См. [REFACTOR-20-devtools-steps.md](./REFACTOR-20-devtools-steps.md).

| URL | Scripting (ms) | Parse/compile (ms) | LCP (ms) | main transfer (wire) | Примечание |
|-----|----------------|---------------------|----------|----------------------|------------|
| `/` | *Performance* | *Performance* | | | landing |
| `/0-ws-core` | *Performance* | *Performance* | | ~5.0 MB `main.js` dev | workspace |
| `/0-ws-core?editorBuilt=1` | *Performance* | *Performance* | | hashed built | после rebuild |

---

## Coverage (заполнить вручную)

| URL | `main.js` / built unused % | Примечание |
|-----|----------------------------|------------|
| `/` | | |
| `/0-ws-core` | | цель фазы B+: сравнить с REFACTOR-14 baseline |

---

## Связь с REFACTOR-14

- Общие lazy/boot правила: [REFACTOR-14-baseline.md](./REFACTOR-14-baseline.md)
- REFACTOR-20 добавляет **матрицу двух URL** и **отсутствие docs API на editor idle** после фазы A.

---

## Фаза C — landing boot

- **`/`:** `landing-chunk-boot.js` + `landing-runtime.js` (modulepreload + boot before main).
- **`/0-ws-core/…`:** main без eager landing (~140 KB chunks + parse сэкономлены на F5).
- Детали: [REFACTOR-20-phase-c.md](./REFACTOR-20-phase-c.md).

---

## История

| Дата | Событие |
|------|---------|
| 2026-10-28 | Фаза B: документ + `check:refactor-20`; размеры после фазы A |
| 2026-10-28 | Фаза C: `editor-boot-route.js`, условный landing в index.html |
