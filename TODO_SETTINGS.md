# Аудит настроек Agent CMS

Актуально на 2026-09-22.

---

### Сделано

**Voice / Shell**
| Что | Где |
|-----|-----|
| Конфиг Voice | `.agent-cms/settings/workspace.yml` |
| Runtime Shell | `.agent-cms/state/shell.json` |
| Legacy `settings/shell.json` | удалён, авто-миграция при первом открытии |
| Session ID + QwenPaw user ID | `voice-route-*-session-id`, `voice-route-qwenpaw-user-id` + миграция из `state/` |
| Route/QwenPaw/media titles | убраны `{DRAFT}` из схемы workspace |
| `voice-wake-name` | CMS + bridge + Shell UI (readonly, sidecar) |
| `dialogScrollRatio` | localStorage + `state/shell.json`; CMS readonly, bridge отключён |
| Descriptions в схеме workspace | убраны `shell.json →` |
| `agent-shell/README.md` | пути `workspace.yml` / `state/shell.json` |

**Платформа**
| Что | Где |
|-----|-----|
| Platform / user settings | `.agent-cms/settings/platform.yml`, `user.yml` |
| `indexing-ocr-langs` | platform.yml → OCR pipeline, дефолт `rus+eng`, модели из интернета |
| `*.traineddata` | `ocr-index/tessdata/` (резерв, пока не используется) |

---

### Открыто

**Runtime без CMS-полей (намеренно):**
- `camera.deviceId`
- qwenpaw `chatName` — имя текущего чата в UI

**Платформа:**
- `awn-agents.json` → `.agent-cms/settings/agents-registry.json`
- API-ключи (TTS и др.) → `.env`, не в `workspace.yml`

**Архитектура (не срочно):**
- Shell читает `workspace.yml` с диска, не только через API
- шапка Shell (workspace/runtime) не пишет default в CMS (`default-workspace-id`, `voice-route-runtime`)

---

### Не актуально (закрыто, трогать не планируем)

- **Legacy readonly в workspace.yml:** `voice-input-global-listen`, `voice-input-to-compose`, `voice-ui-dialog-scroll-ratio` — оставлены для совместимости
- **OCR offline:** `langPath` → `ocr-index/tessdata/` — решили качать языки из интернета (`indexing-ocr-langs`)
- **QwenPaw STT-refine:** `qwenpawSttSessionId`, `qwenpawSttChatName` — отдельный чат для уточнения STT; `shouldRefineStt()` выключен, в runtime не используется

---

### Риски / проверить вручную

- **Дефолт runtime = `codex`**, если `voice-route-runtime` пустой — перекрывает legacy `claude`
- **Миграция** в CMS только **пустых** ключей
- **Потеря значений** — если миграция не сработала, данные могли остаться в удалённом `settings/shell.json`
- автотестов на миграцию нет

---

**Итог:** миграция Voice/settings в CMS завершена. Долг: agents-registry, secrets в `.env`, qwenpaw chatName + camera runtime, синк шапки Shell.
