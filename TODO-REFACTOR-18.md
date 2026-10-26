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



**P2 — зачем (на примере)**

У тебя на компе лежит **photo.jpg** (500 KB). Агент в **облаке** хочет положить её в тему CMS.

| Способ | Что происходит | Минус |
|--------|----------------|--------|
| **base64 в MCP** | 500 KB текстом в каждом сообщении | лимит ~1 MB, тяжело для чата |
| **chunk** (сделали) | много вызовов `upload_chunk` с кусками base64 | медленно, но работает без URL |
| **PUT putUrl** | агент шлёт файл **напрямую** на maptex.ru | облако **не достучится** до твоего VPS |
| **P2 / from_url** | ты даёшь **ссылку** `https://…/photo.jpg`, **CMS сама** качает и кладёт в слот | нужен **URL, доступный с сервера CMS** |

**P2 нужен**, когда файл **уже где-то по HTTP** (Dropbox public link, S3, imgur, свой nginx) и **не хочется** гонять 500 KB через MCP — одна команда: «скачай отсюда → положи в `assets/pasted/bob.png`».

**Это уже частично есть:** `content_binary_write_from_url` — это и есть «CMS качает по URL».  
**«P2» в TODO** — расширить/унифицировать (например, через `upload_begin` + `sourceUrl`), если захотите один сценарий вместо отдельного tool.

---

**Что надо сделать, если делать P2 по-настоящему**

1. **Продукт:** API вроде `upload_begin` с полем `sourceUrl` **или** всегда использовать `write_from_url`.
2. **Сервер:** HTTP GET с CMS (лимиты, mime, таймаут, SSRF-защита — не качать `localhost`, внутренние сети).
3. **Док для агента:** «есть публичная ссылка → `from_url`; нет ссылки → `begin` + `chunk`».

**Что делать тебе сейчас:** для Губки Боба **без публичной ссылки** P2 **не нужен** — **`upload_begin` → `upload_chunk` → `complete`** после rebuild CMS. P2 — только если потом захочешь «залил файл на хостинг → дал URL → CMS забрала».

---

## Идеи MCP (обсуждение — не про бинарь)

- [ ] **Включить / выключить платформу MCP** — переключатель «MCP доступен снаружи» (не путать с `mcp-mode`: readonly/standard/full).
- [ ] **Контент · история MCP** — `content_history_*` (zzz, см. дерево ниже).
- [x] **Количество записей** — **`contents_count`** (MCP; те же placement/filters, что `contents_list`)

### 1) Включить / выключить платформу MCP

**CLI (целевое):** `agent-cms-cli mcp status` · `mcp maintenance on|off` · `mcp off` · `mcp on`

**MCP methods (tools)?** — только если есть **живой transport + CMS принимает вызовы**. Ниже.

```
Agent CMS — MCP exposure (полное дерево)
│
├─ platform.yml mcp-mode: readonly | standard | full
│     └─ при ЖИВОМ MCP: какие tools разрешены (write/exec), не «сервис вкл/выкл»
│
├─ Состояние A: normal          agent-cms-cli mcp on  (maintenance off, mcp exposed)
│     ├─ Editor (HTTPS /)              ✅ UI
│     ├─ HTTP MCP /app-mcp             ✅ initialize + все tools (в рамках mcp-mode)
│     ├─ claude.ai / Cursor remote     ✅ через коннектор
│     └─ Desktop stdio (node mcp-server) ✅ к localhost CMS
│
├─ Состояние B: maintenance ON   agent-cms-cli mcp maintenance on
│     ├─ Флаг на диске (напр. .agent-cms-global/state/mcp-maintenance.json)
│     ├─ Editor (HTTPS /)              ✅ (админ чинит в браузере)
│     ├─ HTTP MCP /app-mcp             ❌ 503 maintenance (сессия/tools не стартуют)
│     ├─ claude.ai / Cursor remote     ❌ methods нет (коннектор «жив», ответ 503)
│     ├─ mcp-контейнер                 ⚙ опционально stop (RAM) или up (быстрый off)
│     └─ Desktop stdio на Mac          ⚙ решить:
│           · strict: CMS отклоняет MCP API → ❌ methods
│           · ops-only: stdio с того же хоста → ✅ (обход для локального админа)
│
├─ Состояние C: mcp off          agent-cms-cli mcp off
│     ├─ Флаг: mcp-exposed=false + compose stop mcp (или Caddy не проксирует /app-mcp)
│     ├─ Editor (HTTPS /)              ✅ если cms healthy
│     ├─ HTTP MCP /app-mcp             ❌ нет сервиса (502/503 «MCP выключен»)
│     ├─ claude.ai / Cursor remote     ❌ methods нет
│     └─ Desktop stdio на Mac          ✅* если процесс mcp-server локальный и CMS API открыт
│           (* не «VPS MCP off», а свой Mac — отдельный инстанс)
│
└─ CMS unhealthy (контейнер cms упал)
      ├─ Editor                            ❌ 502 (страница ☕)
      ├─ HTTP MCP                            ❌ 502
      └─ methods                             ❌ (нет backend)
```

| Команда | HTTP MCP tools | Editor | Заметка |
| --- | --- | --- | --- |
| `mcp on` | ✅ | ✅ | normal |
| `mcp maintenance on` | ❌ 503 | ✅ | агенты снаружи отдыхают |
| `mcp off` | ❌ | ✅ | MCP-сервис снят с публикации |
| `mcp-mode=readonly` при normal | только read/list/search | ✅ | политика, не maintenance |

**Решить:** maintenance — **strict** (stdio тоже off) или **ops** (stdio/local bypass)?

**Кто что меняет (сводка)**

```
Что можно переключить
│
├─ 🖥️ Терминал (agent-cms-cli / compose) — инфра, без агента
│     ├─ mcp on / mcp off / mcp maintenance on|off   → exposure MCP (целевое)
│     ├─ start | stop | restart | rebuild            → контейнеры cms/mcp/caddy
│     ├─ doctor | status | logs                      → диагностика
│     ├─ git pull + rebuild                          → код на VPS
│     └─ docker compose stop cms                     → ☕ 502 (не maintenance)
│
├─ 🤖 Агент (MCP tools) — политика и контент, пока MCP жив
│     ├─ setting_write mcp-mode                      → readonly/standard/full
│     ├─ setting_write batch-enabled, лимиты…        → platform.yml через MCP
│     ├─ content_*, contents_list, workspace_*       → хранилище
│     └─ ❌ пока нет: maintenance, mcp off, restart docker
│
└─ 🌐 Браузер (Editor / Control) — UI
      ├─ app-lock зоны, workspace, индексы…
      └─ ❌ пока нет: рубильник MCP (если не через settings в будущем)
```

**Обсудить (вопросы)**
- Maintenance **strict** vs **ops** (stdio на Mac при maintenance ON)?
- **`mcp off`** только HTTP или ещё блок API для всех MCP-клиентов?
- Нужен ли агенту tool **`platform_mcp_maintenance_set`** или только CLI?
- Одна страница 503 для maintenance vs отдельная от «cms упала» (☕)?
- **`content_history`** / **`content_count`** — приоритет после рубильника?

### 2) `content_history_*` (zzz — идея, не в коде)

**Бэкенд сегодня:** `POST /api/file/revisions`, чтение версии по API file/history, `.mdback` на save. **MCP — нет.**

**Адрес как у content:** `placement` + `ref` (или `kind: root`, `path`).

```
content_history_*  (префикс content_, не contents_)
│
├─ content_history_version_count     zzz
│     └─ → { total, placement, ref }   сколько .mdback у файла
│
├─ content_history_version_list      zzz
│     └─ → { versions[], total, limit?, hasMore? }
│           элемент: version (имя .mdback), savedAt, sizeBytes?, hash?
│
├─ content_history_version_read      zzz  ← чтение тела версии (предложение)
│     └─ args: placement + ref + version (или versionId)
│     → { version, part: body|all, body, hash?, savedAt }
│        лимиты как content_read (окно строк / maxBytes)
│
└─ (v2, не v1)
      ├─ content_history_version_diff   → patch/diff vs текущий content_read
      └─ content_history_restore        → обёртка POST /api/file/history/restore (write, confirm)
```

| Tool | Зачем |
| --- | --- |
| `_version_count` | «Сколько версий» без списка |
| `_version_list` | Таймлайн для выбора version |
| `_version_read` | Прочитать старый текст (не путать с `content_read` = текущий файл) |

**Activity (`.agent-cms/state/activity.jsonl`):**

```
workspace_activity_* 
│
├─ workspace_activity_list          ✅ уже есть (since, limit → GET /api/agent/activity)
├─ workspace_activity_count         zzz — { total } или { total, since? } без выгрузки ленты
├─ workspace_activity_get           zzz — одно событие по id (если нужно точечно)
└─ (опц.) workspace_feed_list       ✅ уже есть — feed шире (activity + stale + …)
```

Restore в v2: `content_history_restore` (API `POST /api/file/history/restore`, write + confirm).

### 3) `contents_count` ✅

MCP **`contents_count`** — `total` entries в placement (slot как у `contents_list`; `kind: root` — path без slot). Фильтры: `parent`, `q`, `ext`, `status`, `tags`, `entryType`. Код: `countContentEntries` → list API, `limit=1`, поле `total`.