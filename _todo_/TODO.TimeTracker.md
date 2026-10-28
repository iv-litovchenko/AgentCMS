# Agent CMS — Time tracker, идея MCP (черновик)

**Статус:** черновик · tools с суффиксом `_zzz` — ещё не в прод-MCP

**Связано:** README (канон MCP, дерево ⏱), [TODO.md](TODO.md)

---

## 🇷🇺 Time tracker — идея MCP (🇬🇧 Time tracker — MCP idea)

🇷🇺 **[ru]**

**Зачем.** Личный **time tracker**: куда ушло время — не только **workspace** в Agent CMS, но и **жизнь вне экрана** (зал, прогулка, сон). Это не «сессия MCP» и не лента правок (`workspace_activity_list`). Отдельная группа tools с префиксом `time_tracker_*`. Сбор: **Jarvis** (голос «начал тренировку»), **редактор** (авто по открытому workspace), **ручная/голосовая запись** после факта.

**Запись** — `{ startedAt, endedAt?, durationMinutes?, kind, category?, label?, workspaceId?, path?, source }`.  
`kind`: `workspace` | `life` | `custom`. Хранение: `.agent-cms/state/time-tracker-log.json` (или database frame + `awn.field.duration`).

| Tool | Смысл |
|------|--------|
| `time_tracker_activity_start_zzz` | Старт таймера (зал, проект, workspace) |
| `time_tracker_activity_stop_zzz` | Стоп текущей активности |
| `time_tracker_entry_log_zzz` | Запись без таймера: «был в зале 75 мин» |
| `time_tracker_summary_zzz` | Отчёт: минуты и % по `workspaceId`, `category`, `label` |

Примеры:

```json
// time_tracker_activity_start_zzz — «пошёл в зал»
{ "kind": "life", "category": "sport", "label": "зал", "source": "jarvis" }

// time_tracker_entry_log_zzz — после тренировки, без таймера
{
  "kind": "life",
  "category": "sport",
  "label": "зал",
  "startedAt": "2026-10-21T18:00:00+03:00",
  "durationMinutes": 75,
  "source": "jarvis"
}

// time_tracker_activity_start_zzz — работа в песочнице (авто из UI)
{
  "kind": "workspace",
  "workspaceId": "0-ws-test",
  "path": "awn-topics/test-md-blokov/main/demo.md",
  "source": "editor"
}

// time_tracker_summary_zzz
{ "period": "today", "groupBy": "category" }
// → [{ "category": "sport", "label": "зал", "minutes": 75 }, { "category": "workspace", "workspaceId": "0-ws-core", "minutes": 90, "percent": 55 }, …]
```

Орбита landing (mock «доли внимания») может читать только `kind: workspace` из `time_tracker_summary_zzz`. **Не путать** с `session_*` и `awn-runtime-heartbeat` (агент/cron).

---

> 🇬🇧 **[en]**
>
> Personal **time tracker** — CMS workspaces *and* off-screen life (gym, walk). Separate MCP group `time_tracker_*`, not session tools. Start/stop timer, log entries after the fact, summary by category or workspace. Examples above; orbit UI can use workspace slice of `time_tracker_summary_zzz` only.
