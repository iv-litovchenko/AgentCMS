# Рефакторинг — часть 8 · **DONE**

**Статус:** функционально закрыто (MCP + placement). Хвост опционально: text aliases, полная синхронизация GLOBAL-SKILL / MCP welcome.

**Задача была:** развести MCP **контента** для агента: **текст** · **бинарь** · **URL** · **merge/split** · документы. **`placement`** сохранён.

**Связано:** часть 4 (`*_content_*`, placement), часть 6 (G6 **`topic`**), **`GLOBAL-SKILL-0-MCP-WELCOME.md`**, **`GLOBAL-SKILL-1-BASE.md`**.

---

## MCP · контент (итог)

```
📍 placement · list · create · rename · move · delete

📝 Текст
├── read_content · write_content (+ properties · patch)
├── merge_content · split_content (# H1, title «Base (n)»)
└── 🔶 read/write/create/list_content — канон (text_* aliases — опционально)

📦 Бинарь
├── read_content_binary · write_content_binary
├── write_content_binary_from_url (alias: import_content_from_url)
└── 🚩 upload_file* — только MCP_LEGACY_TOOLS=1

🔗 URL / превью
├── get_external_url_page_preview (alias: get_link_preview)
├── get_workspace_url_page_preview
├── get_content_binary_url
└── get_workspace_open_url_from_path (alias: get_topic_url)

📄 Документы
└── extract_document_text (rename read_content_extract — опционально)

📎 Доп. материалы записи
└── list_content (slot=assets, materials/{awn-id}/) + read_*
```

---

## Правила для агента (канон)

| Задача | MCP |
| ------ | --- |
| Текст | `read_content` / `write_content` |
| Бинарь | `read_content_binary` / `write_content_binary` / `write_content_binary_from_url` |
| Ссылка на картинку | `get_content_binary_url` |
| Открыть в CMS | `get_workspace_open_url_from_path` |
| Карточка записи | `get_workspace_url_page_preview` |
| Внешний сайт | `get_external_url_page_preview` |
| Склеить / разрезать .md | `merge_content` / `split_content` |
| pdf/docx/… → текст | `extract_document_text` |
| **media** ≠ **assets**; в тексте картинки → `assets/pasted/` |

---

## Опционально (не блокер)

- `read_text_content` / `write_text_content` — aliases + policy
- `upload_asset` / `read_asset` — сugar (уже покрыто binary + `get_content_binary_url`)
- Docs: GLOBAL-SKILL-1-BASE, MCP welcome, TODO-REFACTOR-4 ссылки

---

## Чат (Cursor)

`<!-- uuid при старте работы -->`
