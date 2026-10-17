# Рефакторинг — часть 8

**Задача:** развести MCP **контента** для агента: **текст** · **картинки/файлы** (assets, в т.ч. **`pasted/`**) · **документы** · опционально **merge/split** заметок. **`placement`** не ломать — новые tools как канон или тонкие обёртки над **`read_content` / `write_content`**.

**✅** сделано · **❌** не сделано.

**Связано:** часть 4 (`*_content_*`, placement), часть 6 (G6 **`topic`**), **`workspaces/0-md/GLOBAL-MCP-INSTRUCTION.md`**, **`GLOBAL-SKILL-1-BASE.md`**.

**Сейчас:** всё через **`read_content` / `write_content`** (+ `format: base64`, `import_content_from_url`, `extract_document_text`). **Не срочно** — можно начать с **`upload_asset` + `publicUrl`**.

---

## Зачем

- Агенту проще: текст ≠ бинарь; после загрузки картинки — **`publicUrl`** для чата и `![…](url)`.
- Картинки в заметках → **`assets/pasted/`** (не слот **`media`** темы).
- Склеить/разрезать заметки — отдельные tools, не смешивать с patch body.

---

## Целевое дерево MCP (концепт)

```
📝 Текст (markdown / csv / properties)
├── read_text_content      … read_content part=body|properties|schema|meta (+ окно строк)
├── write_text_content     … write_content part=body|properties (patch/replace/…)
├── create_text_content    … create_content (.md)
└── list_text_content      … list_content (фильтр text по слоту)

🖼️ Картинки / файлы (assets: pasted | attachments | preview; media hub files/assets)
├── upload_asset           … write_content бинарь; ref: pasted/{name} …
│                          → workspacePath, ref, refResolved, publicUrl [, previewUrl]
├── read_asset             … read + format base64; image/* → publicUrl (+ image block)
├── list_assets            … list_content slot=assets|files
└── import_asset_from_url  … import_content_from_url (+ publicUrl в ответе)

📄 Документы
├── extract_document       … extract_document_text (pdf/docx/… URL или path)
└── read_asset             … бинарь; extract при необходимости

✂️ Заметка как целое
├── merge_notes            … refs[]|paths[] → one ref (body + правила frontmatter)
└── split_note             … one ref + markers (--- / ## / line ranges) → refs[]

🧩 Legacy (aliases, вне policy whitelist)
└── read_content / write_content / create_content → делегат в text_* / upload_asset
```

---

## Правила для агента (docs)

| Задача | Метод |
| ------ | ----- |
| Читать/править текст | `read_text_content` / `write_text_content` |
| Загрузить картинку в **pasted** | `upload_asset({ placement, ref: "pasted/…", data })` → **`publicUrl`** |
| Показать картинку в чате | `read_asset` → **`publicUrl`** (и при необходимости base64) |
| Склеить несколько .md | `merge_notes` |
| Разрезать одну .md | `split_note` |

- В теле заметки канон ссылок: **`awn-storage/assets/pasted/…`**; **`publicUrl`** — для UI/чата (HTTPS CMS, signed path — уточнить в реализации).
- **`media`** слот темы ≠ **`assets`** (картинки в тексте → **assets**).

---

## План работ

| Статус | Шаг |
| ------ | --- |
| ❌ | **`upload_asset` + `publicUrl`** в ответе (обёртка над `write_content` + URL builder) |
| ❌ | **`read_asset` / `list_assets`** (+ `import_asset_from_url`) |
| ❌ | **`read_text_content` / `write_text_content`** (aliases + policy канон) |
| ❌ | **`merge_notes` / `split_note`** — после появления сценариев |
| ❌ | **`GLOBAL-MCP-INSTRUCTION`**, **`GLOBAL-SKILL-1-BASE.md`**, **`TODO-REFACTOR-4`** |

**Приоритет:** сначала **upload + URL**; merge/split — отдельно. Единый mega-hub API **не** делать (5 семейств hub + **`placement`** понятнее агенту).

---

## Чат (Cursor)

`<!-- uuid при старте работы -->`
