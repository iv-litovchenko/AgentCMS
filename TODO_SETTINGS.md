# Аудит миграции настроек Voice (shell.json → CMS)

Кратко по каждому пункту:

---

### 0. Сделано (убрать из долга)

- **`settings/shell.json` удалён** — авто-миграция при первом открытии Shell
- **`state/shell.json`** — принят как runtime-хранилище Shell (не CMS, не трогаем)
- **Session ID claude/codex/qwenpaw** → `workspace.yml` (`voice-route-*-session-id`), миграция `migrateStateSessionIdsToWorkspace()`
- **`voice-wake-name`** → CMS + bridge + Shell UI (readonly, только sidecar)
- **Descriptions в схеме `workspace.yml`** — убраны устаревшие `shell.json →`
- **`dialogScrollRatio`** — localStorage + `state/shell.json`; поле в CMS readonly, bridge отключён

---

### 1. Что не перенесли / упустили

**В CMS нет полей (только runtime):**
- `camera.deviceId` — выбранная камера
- `qwenpaw` userId, chatName, stt.sessionId

**Вне Voice workspace:**
- `awn-agents.json` → `.agent-cms/settings/agents-registry.json` — не сделано
- API-ключи в `.env` — не сделано
- `eng.traineddata` (OCR) — не трогали

**В схеме есть, legacy (readonly, не настройка пользователя):**
- `voice-input-global-listen`, `voice-input-to-compose` — deprecated readonly

---

### 2. Что могло сломаться / не применяется

**Работает:** основной конфиг Voice читается из `workspace.yml` + runtime в `state/shell.json`.

**Риски:**
- **Дефолт runtime = `codex`** в CMS перекрывает старый `claude` из `shell.json`, если в `workspace.yml` поле пустое
- **Миграция** переносит в CMS только **пустые** ключи — если `workspace.yml` уже был, часть из старого `shell.json` могла не попасть
- **Шапка Shell** (workspace/runtime) — по-прежнему **сессия**, не синхронизируется с CMS (`default-workspace-id`, `voice-route-runtime`)

**Потенциальная потеря:** если миграция не сработала (workspace уже заполнен) — часть значений могла остаться только в удалённом `settings/shell.json`.

Автотестов на миграцию нет — проверка только ручная.

---

### 3. Что из идей чата не реализовали

- Shell читает только API → всё ещё **читает `workspace.yml` с диска**
- Синхронизация шапки Shell → CMS default — **нет**
- `awn-agents.json` → agents-registry — **нет**
- Секреты в `.env` — **нет**

---

**Итог одной строкой:** конфиг Voice на CMS, `settings/shell.json` убран, sessionId и wakeName в CMS, `state/shell.json` — runtime. Дыры: agents-registry, secrets в `.env`, живая сессия шапки, qwenpaw/camera runtime без CMS-полей.
