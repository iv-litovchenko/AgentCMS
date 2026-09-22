# Аудит миграции настроек Voice (shell.json → CMS)

Актуально на 2026-09-22.

---

### Сделано

| Что | Где |
|-----|-----|
| Конфиг Voice | `.agent-cms/settings/workspace.yml` |
| Платформа / пользователь | `.agent-cms/settings/platform.yml`, `user.yml` |
| Runtime Shell | `.agent-cms/state/shell.json` (принят, не CMS) |
| Legacy `settings/shell.json` | удалён, авто-миграция при первом открытии Shell |
| Session ID claude/codex/qwenpaw | `voice-route-*-session-id` в workspace + `migrateStateSessionIdsToWorkspace()` |
| `voice-wake-name` | CMS + bridge + Shell UI (readonly, только sidecar) |
| Descriptions в схеме | убраны устаревшие `shell.json →` |
| `dialogScrollRatio` | localStorage + `state/shell.json`; CMS-поле readonly, bridge отключён |
| `*.traineddata` | `ocr-index/tessdata/` (резерв, пока не используется) |
| `indexing-ocr-langs` | platform.yml → OCR pipeline (`rus+eng` по умолчанию, модели из интернета) |

---

### Открыто

**Runtime без CMS-полей:**
- `camera.deviceId`
- qwenpaw `userId`, `chatName`, `stt.sessionId`

**Платформа (не Voice workspace):**
- `awn-agents.json` → `.agent-cms/settings/agents-registry.json`
- API-ключи (TTS и др.) → `.env` / secrets, не в `workspace.yml`

**Legacy readonly в схеме (не настройка пользователя):**
- `voice-input-global-listen`, `voice-input-to-compose`
- `voice-ui-dialog-scroll-ratio`

**OCR (опционально):**
- `langPath` → `ocr-index/tessdata/` для офлайн вместо скачивания

**Архитектура (идеи, не срочно):**
- Shell читает `workspace.yml` с диска, не только через API
- шапка Shell (workspace/runtime) не пишет default обратно в CMS

---

### Риски / проверить вручную

- **Дефолт runtime = `codex`** в CMS, если `voice-route-runtime` пустой — перекрывает старый `claude` из legacy `shell.json`
- **Миграция** в CMS только **пустых** ключей — при уже заполненном `workspace.yml` часть legacy могла не попасть
- **Потеря значений** — только в удалённом `settings/shell.json`, если миграция не сработала
- автотестов на миграцию нет

---

**Итог:** основная миграция Voice на CMS завершена. Осталось: agents-registry, secrets в `.env`, qwenpaw/camera runtime, синк шапки Shell.
