# Agent CMS — Transfer между workspace, идея MCP (черновик)

**Статус:** черновик · tools с суффиксом `_zzz` — ещё не в прод-MCP

**Связано:** README (канон MCP, дерево 🔀), [TODO.md](TODO.md)

---

## 🇷🇺 Transfer — идея MCP (🇬🇧 Transfer — MCP idea)

🇷🇺 **[ru]**

**Зачем.** Перенос **между workspace**. Не путать с 🟢 `content_move` / `topic_move` (только внутри vault). Сначала ссылки записи, потом plan, потом перенос.

**Ссылки записи** (текущий workspace):

| Tool | Смысл |
|------|--------|
| `record_links_outgoing_get_zzz` | На кого/что ссылается: wikilinks, md-ссылки, картинки в теле |
| `record_links_incoming_get_zzz` | Кто ссылается на эту запись |

**Transfer:**

| Tool | Смысл |
|------|--------|
| `transfer_record_plan_zzz` | Список зависимых записей/бинарников для переноса, конфликты slug в B |
| `transfer_record_plan_execute_zzz` | Выполнить plan |
| `transfer_record_zzz` | Одна текстовая запись (copy \| move), опционально `dryRun` |
| `transfer_record_binary_zzz` | Один бинарник |

**Поток:** `record_links_outgoing_get` → `transfer_record_plan` → `transfer_record_plan_execute` (или вручную по plan).

```json
// record_links_outgoing_get_zzz
{ "path": "awn-topics/demo", "slot": "main", "ref": "note.md" }

// transfer_record_plan_zzz
{
  "fromWorkspaceId": "0-ws-test",
  "toWorkspaceId": "0-ws-core",
  "source": { "path": "awn-topics/demo", "slot": "main", "ref": "note.md" },
  "target": { "path": "awn-topics/imported", "slot": "main" },
  "includeIncoming": false,
  "dryRun": true
}

// transfer_record_plan_execute_zzz
{ "planId": "…", "mode": "copy", "rewriteLinks": "same-vault-only" }
```

---

> 🇬🇧 **[en]**
>
> Cross-workspace **transfer**: `record_links_outgoing_get_zzz` / `record_links_incoming_get_zzz`, then `transfer_record_plan_zzz` → `transfer_record_plan_execute_zzz` (or single `transfer_record_*`). In-vault: `content_move` / `topic_move`.
