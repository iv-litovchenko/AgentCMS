# Аудит миграции настроек Voice (shell.json → CMS)

Кратко по каждому пункту:

---

### 1. Что не перенесли / упустили

**В CMS нет полей (только runtime или только Shell):**
- `wakeName` — wake word
- `camera.deviceId` — выбранная камера
- `qwenpaw` userId, chatName, stt.sessionId — только `state/shell.json`

**Вне Voice workspace:**
- `awn-agents.json` → `.agent-cms/settings/agents-registry.json` — не сделано
- API-ключи в `.env` — не сделано
- `eng.traineddata` (OCR) — не трогали

**В схеме есть, но не работает как настройка:**
- `voice-route-*-session-id` — только показ (hydrate), **редактирование в CMS не влияет на Shell**
- `voice-input-global-listen`, `voice-input-to-compose` — deprecated readonly

---

### 2. Что могло сломаться / не применяется

**Работает:** основной конфиг Voice читается из `workspace.yml` + `state/shell.json`.

**Риски:**
- **Дефолт runtime = `codex`** в CMS перекрывает старый `claude` из `shell.json`, если в `workspace.yml` поле пустое
- **Миграция** переносит в CMS только **пустые** ключи — если `workspace.yml` уже был, часть из старого `shell.json` могла не попасть
- **SessionId в CMS** — сохраняется в yml, но Shell **не читает** (только `state/shell.json`)
- **Шапка Shell** (workspace/runtime) — по-прежнему **сессия**, не синхронизируется с CMS

Автотестов на миграцию нет — проверка только ручная.

---

### 3. Нужен ли ещё `shell.json`?

| Файл | Нужен? |
|------|--------|
| `.agent-cms/settings/shell.json` | **Нет** — удалён, авто-миграция при первом открытии |
| `.agent-cms/state/shell.json` | **Да** — sessionId, scroll, cameraDeviceId и т.п. |

То есть конфиг-`shell.json` не нужен, runtime-файл с тем же именем в `state/` — нужен.

---

### 4. Что не вынесли / ничего не потеряли?

**Из старого `settings/shell.json` конфиг перенесён** — при миграции + bridge.

**Осталось только в runtime (`state/`):**
- sessionId всех runtime
- qwenpaw userId/chatName/stt.*
- cameraDeviceId
- dialogScrollRatio (если был)

**Потенциальная потеря:** если миграция не сработала (workspace уже заполнен) или workspace не создался — часть значений могла остаться только в удалённом `shell.json`. Для `agent-cms-test` миграция прошла: `workspace.yml` есть, `settings/shell.json` нет, `state/shell.json` есть.

**Не переносилось (и раньше не было в CMS):** wakeName

---

### 5. Схема ↔ Agent CMS Voice — что ещё не совпадает

| Блок | Статус |
|------|--------|
| session-id поля в CMS | ⚠️ в схеме есть, **на Shell не влияют** |
| wakeName | ❌ нет в схеме |
| ui `dialogScrollRatio` | ⚠️ работает, но **три источника**: CMS / `state/shell.json` / `localStorage` — мелкий долг |
| descriptions в `workspace.yml` | ⚠️ устарели — много `shell.json →`, почистить |

---

### 6. Что из идей чата не реализовали

- Полный отказ от любого `shell.json` → остался **`state/shell.json`**
- Shell читает только API → всё ещё **читает `workspace.yml` с диска**
- Синхронизация шапки Shell → CMS default — **нет**
- `awn-agents.json` → agents-registry — **нет**
- Секреты в `.env` — **нет**
- Почистить descriptions в `workspace.yml` — **нет** (см. п.5)
- Идеальный split: yml = config, state = runtime only — **частично** (главное сделано)

---

**Итог одной строкой:** конфиг Voice на CMS, `settings/shell.json` убран. Дыры: sessionId в CMS, wakeName, agents-registry, secrets в `.env`, живая сессия шапки, dialogScrollRatio из трёх мест, устаревшие descriptions.
