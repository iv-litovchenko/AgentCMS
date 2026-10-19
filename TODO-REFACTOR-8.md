# Рефакторинг — часть 8

**Задача:** развести MCP **контента** для агента: **текст** · **картинки/файлы** (assets, в т.ч. **`pasted/`**) · **документы** · **merge/split** заметок. **`placement`** не ломать — новые tools как канон или тонкие обёртки над **`read_content` / `write_content`**.

**✅** уже в MCP · **❌** план (ещё нет) · **🔶** есть аналог под другим именем.

**Связано:** часть 4 (`*_content_*`, placement), часть 6 (G6 **`topic`**), **`GLOBAL-SKILL-0-MCP-WELCOME.md`**, **`GLOBAL-SKILL-1-BASE.md`**.

**Сейчас в проде:** текст **`read/write_content`**, бинарь **`read/write_content_binary`**, URL **`write_content_binary_from_url`**, **`merge/split_content`**, **`list/create_content`**, **`extract_document_text`**. **URL / превью:** **`get_external_url_page_preview`**, **`get_workspace_url_page_preview`**, **`get_content_binary_url`**, **`get_workspace_open_url_from_path`** (+ legacy aliases). **Дальше:** text aliases, docs.

---

## Зачем

- Агенту проще: текст ≠ бинарь; после загрузки картинки — **`publicUrl`** для чата и `![…](url)`.
- Картинки в заметках → **`assets/pasted/`** (не слот **`media`** темы).
- Склеить/разрезать заметки — отдельные tools, не смешивать с patch body.

---

## Целевое дерево MCP (концепт)

```
📝 Текст (markdown / csv / properties)
├── ❌ read_text_content      … alias → read_content part=body|properties|schema|meta
├── ❌ write_text_content     … alias → write_content part=body|properties
├── ❌ create_text_content    … alias → create_content (.md)
├── ❌ list_text_content      … alias → list_content (фильтр text)
└── 🔶 read/write/create/list_content   … уже есть (канон до aliases)

🖼️ Картинки / файлы (assets: pasted | attachments | preview; media hub files/assets)
├── ❌ upload_asset           … обёртка write_content бинарь + publicUrl
├── ❌ read_asset             … read_content base64 + publicUrl
├── ❌ list_assets            … list_content slot=assets|files
├── ❌ import_asset_from_url  … write_content_binary_from_url + publicUrl
├── ✅ read_content_binary · write_content_binary · write_content_binary_from_url
│   └── 🔶 import_content_from_url (alias)
├── 🚩 upload_file · upload_file_from_url   … только MCP_LEGACY_TOOLS=1
└── 🔶 write_content (data) · read_content format=base64   … legacy

📄 Документы
├── 🔶 extract_document_text  … уже есть
├── ❌ extract_document       … alias (опционально)
└── ❌ read_asset             … бинарь + extract при нужде

✂️ Заметка как целое
├── ✅ merge_content          … refs[] → targetRef (--- между body; FM target; tags union)
└── ✅ split_content          … # H1 → {stem}-n.md, title «Base (n)»

🧩 Legacy (aliases, вне policy whitelist)
└── ❌ read_content / write_content / create_content → делегаты в text_* / upload_asset (policy)
```

---

## Правила для агента (docs)

| Задача | Сейчас | Цель |
| ------ | ------ | ---- |
| Читать/править текст | `read_content` / `write_content` | `read_text_content` / `write_text_content` |
| Загрузить картинку в **pasted** | `write_content` + `data` (base64) | `upload_asset` → **`publicUrl`** |
| Показать картинку в чате | `read_content` + `format=base64` | `read_asset` → **`publicUrl`** |
| Склеить несколько .md | **`merge_content`** ✅ | — |
| Разрезать одну .md по `# H1` | **`split_content`** ✅ | — |

- В теле заметки канон ссылок: **`awn-storage/assets/pasted/…`**; **`publicUrl`** — для UI/чата (HTTPS CMS, signed path — уточнить в реализации).
- **`media`** слот темы ≠ **`assets`** (картинки в тексте → **assets**).

---

## План работ

| Статус | Шаг |
| ------ | --- |
| ✅ | **`read/write_content_binary`**, **`write_content_binary_from_url`**; `upload_file*` → legacy |
| ✅ | **`merge_content` / `split_content`** — split по `# H1`, title `(n)` |
| 🔶 | Текст/списки/импорт — **`read/write/create/list_content`**, **`import_content_from_url`** (без aliases) |
| 🔶 | Документы — **`extract_document_text`** |
| ❌ | **`upload_asset` + `publicUrl`** (обёртка над `write_content` + URL builder) |
| ❌ | **`read_asset` / `list_assets`** (+ **`import_asset_from_url`**) |
| ❌ | **`read_text_content` / `write_text_content`** (aliases + policy канон) |
| ❌ | **`GLOBAL-MCP-INSTRUCTION`**, **`GLOBAL-SKILL-1-BASE.md`**, **`TODO-REFACTOR-4`** |

**Приоритет:** **upload + URL** → asset read/list → text aliases → docs. Merge/split **готовы**.

---

## Чат (Cursor)

`<!-- uuid при старте работы -->`
