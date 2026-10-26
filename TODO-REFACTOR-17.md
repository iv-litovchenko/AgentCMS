# Рефакторинг — часть 17 (MCP слоты: slotKey vs folder)

😊😊😊😊 Пиши туда в самом начале
## Что произошло с #9041

Запись **на месте**. При `slot: memory` (или `main` — это алиас) файл лежит здесь:

`awn-topics/<тема>/awn-storage/main/probnaya-zapis.md`

(у вас путь вида `workspaces/0-ws-test/test-klod/…` — это slug темы без префикса хаба в MCP.)

Ответ API **не противоречие**, а **два слоя именования**:

| Поле | Значение | Смысл |
|------|----------|--------|
| `folder` | `main` | **Папка на диске** под `awn-storage/` |
| `slotKey` | `memory` | **Ключ в роутинге** (`storage-slot-routing.js`) |

В MCP в `placement.slot` можно писать **`main` или `memory`** — нормализуются в один слот. На диске папка всегда **`main/`** (старые `memory/`, `content/` читаются как `main`).

**Почему агент путается:** в скиллах везде **`main`**, в ответе сервера — **`slotKey: memory`**, а **`path` от корня workspace в ответе create нет** (есть только `folder` + `file`). Отсюда `find …`.

**Имеет смысл в продукте:** в ответ `content_create` / `/api/storage/file/create` добавить, например, `workspacePath: awn-topics/…/awn-storage/main/probnaya-zapis.md`.

---

## Два измерения слота (кратко)

```
placement.slot  ──alias──►  slotKey (канон API)  ──►  storageFolder (диск)
     main / memory / external          memory                    main/
     note                              notes                     notes/
     thread / dialogs                  discussion                discussion/
```

**Ловушка:** слоты **`main-single`** и **`main-single-csv`** — driver **`internal`**, без `ref`, но на диске тоже живут под **`awn-storage/main/`** (bundle-файлы). Это **не** каталог записей `memory`, хотя папка одна.

---

## Дерево: сущности → слоты (✅ канон MCP / ⚠️ legacy)

```
🗂️ Workspace
│
├─ 📚 Тема (kind: topic) — awn-topics/{slug}/
│  └─ awn-storage/
│     ├─ 🧠 memory ✅  ← placement: main | memory | external ⚠️
│     │     📁 main/          (⚠️ disk: memory/, content/)
│     ├─ 📥 inbox/            inbox
│     ├─ 📤 outbox/           outbox
│     ├─ 📝 notes/            notes (⚠️ note/, slot note)
│     ├─ 🔗 references/       references
│     ├─ 🧪 artefacts/        artefacts
│     ├─ 🖼️ media/             media
│     ├─ 📎 assets/           assets (+ pasted/, preview/, materials/)
│     ├─ 💾 repository/       repository (мелкий код в теме; ⚠️ не hub awn-repositories)
│     ├─ 📜 scripts/          scripts (⚠️ script)
│     ├─ 📋 templates/, base/, notebooklm/
│     ├─ ⏱️ task-queue/       task-queue (⚠️ agent-task-queue, agent-queue)
│     ├─ 🗺️ atlas/            atlas (⚠️ roadmap/, roadmap-single)
│     ├─ 📄 main/ (bundle)    main-single, main-single-csv — один файл, без ref
│     ├─ ✅ todo/ (bundle)    todo-single, todo (⚠️ todo)
│     ├─ 💬 discussion/       discussion — только comment-tools (⚠️ thread, dialogs)
│     ├─ 🕓 history/, 💭 comments/ — системные
│     └─ 🔒 awn-slots-flexible: только внешние записи в main/
│
├─ 📡 Канал (kind: channel) — awn-channels/{slug}/
│  └─ awn-storage/
│     ├─ 📥 inbox/            разбор → inbox_item_triage
│     ├─ ⏱️ task-queue/
│     ├─ 📤 outbox/
│     ├─ 📁 files/            ref обязателен
│     └─ 📎 assets/
│     (❌ нет memory/main — не писать «основную память» сюда)
│
├─ 🎞️ Медиатека (kind: media) — awn-media/{slug}/
│  └─ awn-storage/
│     ├─ 📁 files/
│     └─ 📎 assets/
│
├─ 🗃️ База (kind: database) — awn-databases/{store}/
│  └─ awn-storage/
│     ├─ 📊 data/             slot: data — записи/разделы (не «main»)
│     └─ 📎 assets/
│     (⚠️ hub: awn-database/, awn-data/)
│
├─ 🔧 Репозиторий (kind: repository) — awn-repositories/{slug}/
│  └─ awn-storage/
│     ├─ 📁 files/
│     └─ 📎 assets/
│     (код клона — отдельно, часто kind: root)
│
└─ 🌲 Свободная память (kind: root)
      path = файл от корня WS, без slot/ref
      (⚠️ placement kind: tree → root; ⚠️ page → topic)
```

---

## Legacy вне слотов (пути)

```
awn-container/  →  awn-topics/
storage/        →  awn-storage/   (внутри темы/хаба)
INDEX.md        →  index.md      (оглавление тем)
```

---

## Правило для агента (1 строка)

**Обычная заметка в теме:** `kind: topic`, `slot: main` (или `memory`), `ref: файл.md` → диск **`…/awn-storage/main/…`**. Перед записью — **`contents_slots_list`** по теме; для канала/медиа/базы/репо — слоты **другие**, не копировать из темы.

---

## Расхождение док ↔ код (источник путаницы)

| Где | Пишут | Канон роутера |
|-----|--------|----------------|
| GLOBAL-SKILL / agent-cms §4 | слот **`main`** | **`memory`** (+ алиасы main, external) |
| `topic.yml` storage-slots | **`main`** | нормализуется в memory |
| Ответ create | `folder: main` | `slotKey: memory` |

Имеет смысл **свести доки к одной формулировке**: «в MCP — `main` или `memory`; на диске — папка `main/`; в ответах смотреть `workspacePath` (когда добавят) или `folder` + `file`».

Если нужно — могу набросать патч: **`workspacePath` в ответ create** и правка §4 скилла под `memory`/`main` без двусмысленности.