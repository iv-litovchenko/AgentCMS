# ✅ Закрыто

# Рефакторинг — часть 9

**Цель:** переименовать системные папки в `workspaces/`.

| Было | Стало |
| ---- | ----- |
| `agent-cms-core` | **`0-ws-core`** |
| `agent-cms-test` | **`0-ws-test`** |
| `cli-sandbox` | **`0-cli-sandbox`** |

## Зачем

1. **Не «agent»** — это хранилища (workspace), как у пользователя.
2. **`0-`** — системные каталоги **сверху** списка; пользовательские ws **ниже**.
3. **`ws`** — коротко: workspace (`0-ws-core`, `0-ws-test`).
4. **`0-cli-sandbox`** — CLI cwd; **`0-`** только для сортировки вверх.

## ✅ Сделано

- Папки на диске (git mv).
- `.agent-cms-global/ws-list-*.json`, код (`platform-sources`, scripts, shell, `public/main.js`).
- Legacy id/path: `lib/workspace/bundled-workspaces.js` + `resolveAgent`.

## Не в scope

- Контент/history внутри ws, REFACTOR-5 (бренд продукта).

## Чат (Cursor)

`<!-- uuid при старте работы -->`
