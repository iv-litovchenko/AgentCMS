# Рефакторинг — часть 18 (MCP бинарная загрузка: bug + облачные агенты)

😊😊😊😊 Пиши туда в самом начале

**Статус:** 🟡 v1 (2026-10-26) — P0 + chunked MCP; smoke на prod — ⏳

**Связь:** REFACTOR-16 п.8 — большие файлы через `content_binary_upload_*`; малые — base64 (~1 MiB MCP).

---

## Оригинал сообщения (дословно)

```text
Не вышло, и причин сразу две.
1. Ошибка на сервере. Первый же шаг упал:
content_binary_upload_begin → 400: getAgentRoot is not a function
Это ошибка в коде CMS, а не в запросе. Внутри обработчика загрузки вызывается функция getAgentRoot, а её нет: её, похоже, переименовали или не импортировали. Скорее всего, после переименования «agent → workspace» какое-то место забыли поправить. Ищи по коду обработчик /api/workspace/binary-upload/begin.
2. Даже после исправления у меня не получится. Новый способ работает так: сервер выдаёт ссылку putUrl, и агент сам отправляет по ней файл обычным HTTP-запросом. Но мой облачный компьютер не может достучаться до maptex.ru: в пятницу я проверял, и меня не пустили. Так что эта загрузка подойдёт агентам, которые работают на твоём макбуке (Claude Code, Cursor, Antigravity), а мне — нет.
Что можно сделать для таких, как я:
* Пусть upload_begin умеет отдавать файл по ссылке в обратную сторону: я даю адрес, где лежит файл, и сервер сам его скачивает. У тебя уже есть похожий content_binary_write_from_url. Но моим файлам нужен публичный адрес, а у меня его нет.
* Или оставить старый content_binary_write с base64, но для больших файлов принимать его частями: я отправляю куски по 20–30 КБ, сервер склеивает. Медленно, но надёжно, и опечатка в одном куске не ломает всё.
Сейчас могу загрузить Губку Боба старым способом, ужав картинку примерно до 20 КБ, это 3–4 раза меньше. Будет поменьше, но целая. Пробуем?
```

---

## Диагноз (код)

| Симптом | Вероятная причина |
| --- | --- |
| `getAgentRoot is not a function` на **begin** | `lib/workspace/binary-upload-sessions.js` импортирует `getAgentRoot` из `lib/paths/agent-cms.js`, но модуль **не экспортирует** `getAgentRoot` (staging dir для upload). |
| Цепочка | `POST /api/workspace/binary-upload/begin` → `beginBinaryUpload` → `createBinaryUploadSession` → `stagingDirectory()`. |

**Файлы:** `server.js` (~31872), `lib/workspace/binary-upload-handlers.js`, `lib/workspace/binary-upload-sessions.js`, `lib/workspace/binary-upload-target.js`, `mcp-server/lib/content-binary-upload.js`.

---

## Дерево работ

```
📦 REFACTOR-18 — бинарь в MCP
│
├─ 🔴 P0 — починить begin (блокер всех PUT-upload)
│  ├─ staging: getAgentRoot / getWorkspaceRoot — один канон + DI из server.js
│  ├─ smoke: begin → PUT → complete (локальный MCP)
│  └─ регресс: complete уже передаёт getAgentRoot в deps — проверить sessions
│
├─ 🟡 P1 — облачный агент (нет исходящего PUT на putUrl)
│  ├─ A) Chunked base64 MCP: content_binary_write_append / upload_id + offset
│  │     (куски 20–30 KiB, склейка на сервере, idempotent)
│  ├─ B) Server-side fetch: расширить import / begin+url (нужен публичный URL)
│  └─ C) Док: когда PUT-upload vs base64 vs from_url vs chunk
│
└─ 🟢 P2 — UX / лимиты
   ├─ Ясная ошибка MCP при 413 base64 → подсказка chunk или upload_begin
   └─ Опционально: tunnel/proxy PUT для claude.ai (продуктово тяжело)
```

---

## Прогресс

| | Задача | Статус |
| --- | --- | --- |
| ✅ | P0: `getAgentRoot` из `agent-registry`, staging `.agent-cms/cache/binary-upload-staging` | `binary-upload-sessions.js` |
| ⏳ | Smoke PUT-upload / chunk на prod | |
| ✅ | P1: `POST /api/workspace/binary-upload/chunk` + `content_binary_upload_chunk` | handlers, server, MCP |
| ✅ | Подсказки в begin (chunkUrl) + base64 413 message | `binary-upload-handlers`, `base64-upload.js` |
| ✅ | GLOBAL-SKILL § бинарь — chunk flow | `GLOBAL-SKILL-1-BASE.md` |
| ⏳ | P2: server pull URL без публичного файла (если продуктово нужно) | |

---

## Матрица сценариев (целевая, для доков)

| Агент | Малый файл | Большой файл |
| --- | --- | --- |
| Desktop MCP (Mac, localhost) | `content_binary_write` base64 | `content_binary_upload_begin` → PUT `putUrl` → complete |
| claude.ai / облако без доступа к VPS | base64 ≤ ~1 MiB | **chunked base64** (P1) или server fetch по URL |
| Есть публичный URL | `content_binary_write_from_url` / import | то же |

---

## Проверка после P0

1. MCP `content_binary_upload_begin` — 200, есть `uploadId`, `putUrl`.
2. PUT тела на `putUrl` с Mac → `content_binary_upload_complete` — файл в placement.
3. На maptex без исходящего PUT — ожидаемо fail до P1; base64 ~20 KiB — ок.
