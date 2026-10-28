# Рефакторинг — часть 4

**✅ Сделано (снято с этого списка):** единый `read/write/list_content` + `placement.kind` (topic · channel · media · database · repository · root); guards API; legacy MCP tools по умолчанию выключены (`MCP_LEGACY_TOOLS=1`); hub `awn-topics/`, `0-agent-kit` / `0-shared`, pinned TOC, `awn-topics/index.md`, hub `refresh_*_index_toc`, WS-MAP; синхрон `channel-presets.js` ↔ UI; карта MCP → `_todo_/_MCP-MAP.md` / `mcp-server/index.js`.

**✅** сделано · **❌** не сделано.

---

## 📡 Пресеты каналов (нет в `lib/config/channel-presets.js`)

Добавить в код + выровнять порядок с продуктом:

| Slug | Назначение |
| ---- | ---------- |
| ❌ 🧩 `companion` | расширение / companion-app |
| ❌ 📄 `notebook-white` | белая тетрадь (нумерация) |
| ❌ 🩷 `notebook-pink` | розовый блокнот |

Источник UI: `CHANNEL_BUILTIN_PRESETS` в `public/main.js`.

---

## 🌐 Каналы — возможные пробелы (не план, пока без пресета)

Расширять каталог только при отдельном коннекторе или triage; иначе → `other` / `web` / `rss` / `mailbox`.

```
❌ 💬 Discord · Slack/Teams · Matrix/Signal · VK/X/LinkedIn/TikTok/Reddit
❌ 📁 watch-folder (Inbox на диске) — рядом companion
❌ 📓 Notion · Obsidian · Keep · Readwise
❌ 🎙️ Meet/Zoom/Teams — транскрипты (рядом voice)
❌ 📧 newsletters · support-тикеты (рядом mailbox)
❌ 🎨 Figma · Miro
❌ 📰 Substack · Patreon (частично rss)
❌ 🤖 export LLM/IDE · cron→ingress (рядом digest/webhook/capabilities)
❌ 🛒 wishlist · отзывы в сторах
❌ 🌍 часы · QR/NFC (рядом real-world / photo-phone)
```

---

## ☁️ Media cloud

| Статус | Tool |
| ------ | ---- |
| ❌ | `module_media_cloud_upload` — реальный API провайдера (legacy `upload_media_cloud_to_provider_zzz`) |
| ❌ | `module_media_cloud_url` — реальный remote URL (legacy `get_remote_url_zzz`) |

Сейчас: локальные blobs + заглушки.

---

## 🗄️ MCP — снять legacy (после миграции клиентов)

**🔓 Всегда в каталоге (убрать или спрятать за флаг):**

- `list_vaults` → только `list_workspaces`
- `list/read/write_system_*` → `list/read/write_root_*`
- `read_dialogs` / `append_dialog` → `read/append_discussion`

**⚠️ Deprecated (удалить tools, оставить миграционную подсказку в docs):**

- `get_topic_map`, `get_content_map`

**🚩 Только `MCP_LEGACY_TOOLS=1` (цель — не нужен флаг):**

- `read/write_content_{body,properties,schema}`
- `read_file` / `write_file`
- channel/media: `list_*_items`, `read_*_file`, `upload_*_file`

---

## 📚 Документация

| ❌ | Обновить ссылки: `read_topic_index_toc` → **`awn-topics/index.md`** (не корневой `INDEX.md`) |
| ❌ | Актуализировать GLOBAL-SKILL / MCP welcome под registry-tools (`get_workspace_*_registry`) |

---

## 🔗 Связанные части (не REFACTOR-4)

- **REFACTOR-5** 🏷️ — rename Agent CMS, `.agent-cms/` state path
- **REFACTOR-3** 🧬 — свойства `a-cms-*` вместо `awn-*` (черновик в REFACTOR-5)
