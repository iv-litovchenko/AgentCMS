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
| Миграция из `state/` → CMS | session ID claude/codex/qwenpaw, `qwenpawUserId` |
| QwenPaw в CMS | url, user-id (`default`), agent-id, approval-level, session-id |
| QwenPaw в Shell UI | User ID, чекбокс approval ↔ CMS + push в QwenPaw API |
| Route/media titles | убраны `{DRAFT}` из схемы workspace |
| `voice-wake-name` | CMS + bridge + Shell UI (readonly, sidecar) |
| `dialogScrollRatio` | localStorage + `state/shell.json`; CMS readonly, bridge отключён |
| Descriptions в схеме | убраны `shell.json →` |
| `agent-shell/README.md` | актуальные пути и QwenPaw-поля |

**Платформа**
| Что | Где |
|-----|-----|
| Platform / user settings | `.agent-cms/settings/platform.yml`, `user.yml` |
| `indexing-ocr-langs` | platform.yml → OCR pipeline, дефолт `rus+eng` |

---

### QwenPaw — сводка

| Поле | Где | Назначение |
|------|-----|------------|
| `voice-route-qwenpaw-url` | CMS | URL API |
| `voice-route-qwenpaw-user-id` | CMS | `user_id` в QwenPaw (дефолт `default`) |
| `voice-route-qwenpaw-agent-id` | CMS | профиль агента |
| `voice-route-qwenpaw-approval-level` | CMS | OFF / AUTO → QwenPaw `approval_level` |
| `voice-route-qwenpaw-session-id` | CMS | активный чат |
| `qwenpawChatName` | state | имя чата в UI (runtime) |
| `qwenpawChatUpdatedAt` | state | кэш синка (служебное) |

---

### Открыто

**Runtime без CMS (намеренно):**
- `camera.deviceId`
- `qwenpawChatName`, `qwenpawChatUpdatedAt`

**Платформа:**
- `awn-agents.json` → `.agent-cms/settings/agents-registry.json`

**Архитектура (не срочно):**
- Shell читает `workspace.yml` с диска, не только через API
- шапка Shell не пишет default в CMS (`default-workspace-id`, `voice-route-runtime`)

---

### На будущее (отложено)

- **Секреты / API-ключи** (TTS ElevenLabs и др.) — не в `workspace.yml`, а `.env` / vault; идея: [7 Идея хранить секретные данные (пароли) и карты](workspaces/agent-cms-core/zadachi-plany-i-idei/awn-storage/main/7-ideya-hranit-sekretnye-dannye-paroli-i-karty.md). Пока ключи могут оставаться в yaml локально.

### Не актуально (закрыто)

- Legacy readonly: `voice-input-global-listen`, `voice-input-to-compose`, `voice-ui-dialog-scroll-ratio`
- OCR offline: `langPath` → `ocr-index/tessdata/` (языки из интернета)
- QwenPaw STT-refine: `qwenpawSttSessionId`, `qwenpawSttChatName` (`shouldRefineStt()` выключен)

---

### Риски / проверить вручную

- **Дефолт runtime = `codex`**, если `voice-route-runtime` пустой
- **Миграция** в CMS только **пустых** ключей
- **QwenPaw approval** в CMS и на сервере QwenPaw могут разойтись, если API был offline при сохранении
- автотестов на миграцию нет

---

**Итог:** Voice/QwenPaw конфиг в CMS. Долг: agents-registry, camera + qwenpaw chatName runtime, синк шапки Shell. Секреты — на будущее (тема #7).
