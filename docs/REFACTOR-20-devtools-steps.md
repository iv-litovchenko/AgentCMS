# Refactor 20 — DevTools (фаза B, ~10 мин)

Две «двери»: **landing** `/` и **workspace** (например `/0-ws-core` или `/0-ws-test/…`).

1. Запусти CMS: `npm start` (или `npm run start:https` → тогда подставь свой base URL в команды ниже).
2. Chrome → **Incognito** (чистые extensions) → DevTools → **Network** + **Performance**.

## Performance (Scripting / Parse)

На каждом URL:

1. Performance → ⚙️ **Disable cache**.
2. **Record** → hard reload (Cmd+Shift+R).
3. Stop → **Main** thread → Summary: **Scripting**, **Parse/Compile** (или breakdown в Bottom-Up).
4. Запиши **LCP** (Timings lane или Performance insights), если доступен.

| URL | Scripting (ms) | Parse/compile (ms) | LCP (ms) | Примечание |
|-----|----------------|---------------------|----------|------------|
| `/` landing | | | | ожидаем lazy landing-orbit только здесь |
| `/0-ws-core` workspace | | | | без docs-meta на idle; health ~30s |
| `/0-ws-core?editorBuilt=1` prod bundle | | | | optional |

## Coverage (unused JS)

1. Cmd+Shift+P → **Coverage** → reload страницы.
2. Сортировка по unused bytes; смотри `main.js` или `main.*.built.js`.

| URL | JS total (approx) | main unused % | Примечание |
|-----|-------------------|---------------|------------|
| `/` | | | |
| `/0-ws-core` | | | после фазы A (docs в app-docs) |

## Network (idle 60 s на workspace)

На `/0-ws-core` после F5, **не открывая** справочник:

- ✅ периодически: `GET /api/health`
- ❌ не должно быть: `GET /api/docs-meta`, `/api/docs`, `/api/mcp-docs`, `/api/user-docs-index`

Открыть профиль → **HTTP API** → новая вкладка `/app-docs/?view=api` → там уже docs API.

## Автопроверки (не заменяют Performance)

```bash
npm run measure:editor
npm run check:refactor-20 -- http://127.0.0.1:3000
npm run check:editor-boot -- http://127.0.0.1:3000
```

Цифры и таблицы: [REFACTOR-20-baseline.md](./REFACTOR-20-baseline.md).
