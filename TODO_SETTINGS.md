# Аудит миграции настроек Voice (shell.json → CMS)

Кратко по каждому пункту:

---

### 1. Что не перенесли / упустили

**В CMS нет полей (только runtime или только Shell):**
- `wakeName` — wake word
- `camera.deviceId` — выбранная камера
- `cursor` / `openclaw` / `hermes` / `agent-zero` — только stub «скоро», конфиг не в CMS
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

**Работает:** голос, STT/TTS, proactive, window, compose, media, route (claude/codex/qwenpaw), чтение через `workspace.yml` + `state/shell.json`.

**Риски:**
- **Дефолт runtime = `codex`** в CMS перекрывает старый `claude` из `shell.json`, если в `workspace.yml` поле пустое
- **Миграция** переносит в CMS только **пустые** ключи — если `workspace.yml` уже был, часть из старого `shell.json` могла не попасть
- **SessionId в CMS** — сохраняется в yml, но Shell **не читает** (только `state/shell.json`)
- **dialogScrollRatio** — три места: CMS, `state/shell.json`, `localStorage` в браузере; живой скролл = localStorage
- **Шапка Shell** (workspace/runtime) — по-прежнему **сессия**, не синхронизируется с CMS
- **Описания в `workspace.yml`** всё ещё ссылаются на `shell.json` — путаница, не баг

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

**Из старого `settings/shell.json` конфиг перенесён** (voice, window, route, cms, media, ui, compose) — при миграции + bridge.

**Осталось только в runtime (`state/`):**
- sessionId всех runtime
- qwenpaw userId/chatName/stt.*
- cameraDeviceId
- dialogScrollRatio (если был)

**Потенциальная потеря:** если миграция не сработала (workspace уже заполнен) или workspace не создался — часть значений могла остаться только в удалённом `shell.json`. Для `agent-cms-test` миграция прошла: `workspace.yml` есть, `settings/shell.json` нет, `state/shell.json` есть.

**Не переносилось (и раньше не было в CMS):** wakeName, runtime-агенты cursor/openclaw/…

---

### 5. Схема ↔ Agent CMS Voice — совпадает?

| Блок | Статус |
|------|--------|
| voice, window, tts, stt, proactive, compose | ✅ схема + bridge + Shell |
| cms.topicPath/channel | ✅ |
| route runtime, systemPrompt, claude/codex/qwenpaw | ✅ |
| media camera/screen | ✅ (DRAFT в схеме, bridge есть) |
| ui dialogScrollRatio | ✅ (но живой scroll = localStorage) |
| session-id поля в CMS | ⚠️ в схеме есть, **на Shell не влияют** |
| cursor/openclaw/hermes/agent-zero | ❌ только stub |
| wakeName | ❌ нет в схеме |
| platform `default-workspace-id` | ✅ отдельно в `platform.yml` |

**Документация схемы устарела** — много `shell.json →` в description.

---

### 6. Что из идей чата не реализовали

- Полный отказ от любого `shell.json` → остался **`state/shell.json`**
- Shell читает только API → всё ещё **читает `workspace.yml` с диска**
- Синхронизация шапки Shell → CMS default — **нет**
- `awn-agents.json` → agents-registry — **нет**
- Секреты в `.env` — **нет**
- Почистить descriptions в `workspace.yml` — **нет**
- Идеальный split: yml = config, state = runtime only — **частично** (главное сделано)

---

**Итог одной строкой:** конфиг Voice полностью на CMS, `settings/shell.json` убран корректно, данные не потеряны при нормальной миграции. Дыры: sessionId в CMS не работают, runtime-агенты без полей, wakeName, agents-registry, secrets в `.env`, живая сессия шапки, устаревшие описания в схеме.
