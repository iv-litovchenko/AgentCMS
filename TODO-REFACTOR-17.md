# Рефакторинг — часть 17 (MCP слоты: slotKey vs folder)

😊😊😊😊 Пиши туда в самом начале

**Тема:** агент путается, куда писать и где файл на диске после `content_create` / API create.

**Триггер:** запись #9041 «Пробная запись», `placement.slot: memory` → в ответе одновременно `"folder": "main"` и `"slotKey": "memory"`; путь на сервере пришлось искать через `find`.

**Суть:** два слоя — **slotKey** (роутинг, `lib/config/storage-slot-routing.js`) и **storageFolder** (папка под `awn-storage/`). Для основной памяти: канон API **`memory`**, алиасы **`main`**, **`external`** → на диске **`main/`** (legacy: `memory/`, `content/`).

---

## Оригинал (дерево правок, октябрь 2026)

```
🔴 Ответ API (create/read)
   └─ нет workspacePath от корня WS → только folder + slotKey + file

🔴 Доки агента (GLOBAL-SKILL / agent-cms §4)
   └─ канон «main» ≠ код slotKey «memory» (+ external)

🔴 MCP schema (content-placement-zod)
   └─ в describe слотов нет явной пары: slot ↔ папка на диске

🔴 Тип темы (topic.yml storage-slots)
   └─ в списке «main», в роутере «memory» — без пояснения

🔴 Один каталог main/ — два смысла
   ├─ memory (много .md, ref)
   └─ main-single / main-single-csv (internal, без ref)
   → в скилле почти не подчёркнуто

🟡 Желательно (не блокер)
   ├─ placement.slot в ответах нормализовать к одному ключу (memory или main)
   └─ flexible-тема: в ошибке «main», в роутере «memory»
```

**Одной строкой:** главное — **`workspacePath` в ответах** + **одна линия в доках: `slot main|memory` → папка `awn-storage/main/`**.

---

## Чеклист (куда править)

| 🔴 | Задача | Файлы / места |
| --- | --- | --- |
| 1 | В ответ `POST /api/storage/file/create` (и MCP `content_create`) добавить **`workspacePath`** (и при необходимости **`placement`** с нормализованным slot) | `server.js` → `createStorageRecordFile` return; `mcp-server/lib/content-core.js` → обогащение ответа |
| 2 | То же для read/meta, где агенту нужен полный путь | `content_read` part=meta, `content_meta_get` |
| 3 | Согласовать док: **`main` = алиас `memory`**, диск = **`main/`** | `GLOBAL-SKILL-1-BASE.md` §4, `.codex/skills/agent-cms/SKILL.md` §4 |
| 4 | В Zod describe слота — таблица или ссылка «slot → folder» | `mcp-server/lib/content-placement-zod.js` → `buildContentSlotSchema` |
| 5 | Комментарий или ключ в типе: `main` в YAML → `memory` в routing | `workspaces/0-ws-core/awn-system/types/hubs/topic/topic.yml` |
| 6 | Явно: **`main/`** ≠ только memory (bundle internal) | скилл §4 + кратко в MCP tool description `content_create` |

| 🟡 | Задача | Файлы / места |
| --- | --- | --- |
| 7 | Единый slot в JSON-ответах (`memory` или `main`) | policy в `formatPublicPlacement` / create handler |
| 8 | Текст ошибки flexible-темы: slot key как в MCP (`memory` или оба) | `server.js` `createStorageRecordFile` |

---

## Проверка после правок

1. MCP: `content_create` в теме, `slot: memory` и `slot: main` → один и тот же **`workspacePath`**, `folder: main`.
2. Агент без `find` видит путь вида `awn-topics/{slug}/awn-storage/main/{file}.md`.
3. `contents_slots_list` по теме: driver `external` vs `internal` для main-single — в доке есть одна фраза-предупреждение.

---

## Связанные файлы (справка)

- `lib/config/storage-slot-routing.js` — `STORAGE_SLOT_ROUTING`, `normalizeStorageSlotKey`
- `lib/config/manifest-paths.js` — `STORAGE_SUBFOLDER_MAIN`, legacy `memory`/`content`
- `lib/config/content-placement.js` — `formatPublicPlacement` (сейчас без disk path)

**Статус:** 📌 открыто
