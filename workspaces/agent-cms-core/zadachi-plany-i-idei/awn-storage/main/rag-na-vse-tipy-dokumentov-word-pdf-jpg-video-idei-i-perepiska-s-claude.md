---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-emoji: ""
awn-note-todo-sticker: ""
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: ""
awn-tags: []
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-type: awn.content.record
awn-create: "2026-09-01T12:24"
awn-mindmap-enabled: true
awn-mindmap-type: optional
awn-mindmap-color: slate
awn-mindmap-size: auto
awn-mindmap-layout-independent: false
awn-mindmap-direction: auto
awn-attachments:
  - awn-storage/assets/attachments/photo-2026-09-01-122903-20260901092938.jpg
  - awn-storage/assets/attachments/photo-2026-09-01-122906-20260901092939.jpg
  - awn-storage/assets/attachments/photo-2026-09-01-122908-20260901092939.jpg
  - awn-storage/assets/attachments/photo-2026-09-01-122910-20260901092939.jpg
  - awn-storage/assets/attachments/photo-2026-09-01-122913-20260901092939.jpg
  - awn-storage/assets/attachments/photo-2026-09-01-122915-20260901092940.jpg
  - awn-storage/assets/attachments/photo-2026-09-01-122918-20260901092940.jpg
awn-description: ""
awn-main: false
awn-name: RAG-на все типы документов word pdf jpg video (идеи и переписка с Claude)
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-01T09:29:49.267Z
awn-version: 3
---

Вот краткий итог по инструментам:

**Извлечение текста**

* **Unstructured** — парсинг Word, PDF и других форматов документов
* **PyMuPDF** — попроще, специально под PDF
* **python-docx** — прямое чтение Word файлов

**OCR (текст с картинок и сканов)**

* **Tesseract** — классика, бесплатный, локальный
* **PaddleOCR** — точнее, лучше со сложной вёрсткой и таблицами

**Речь в текст (аудио/видео)**

* **Whisper** (OpenAI) — локальное распознавание речи, хорошо держит русский
* **faster-whisper** — тот же Whisper, но быстрее

**Понимание изображений и видео по смыслу**

* **LLaVA**, **Qwen2.5-VL** — визуальные модели, описывают что на картинке/кадре словами

**Скачивание/извлечение из видео**

* **yt-dlp** — субтитры с YouTube без скачивания видео, либо только аудио дорожку
* **FFmpeg** — вытащить звук из видео файла

**Векторизация и хранение**

* **Sentence Transformers** — локальные модели эмбеддингов, текст → вектор
* **Chroma** — локальная база для хранения и поиска по векторам

**Общий принцип пайплайна:** любой источник (документ, картинка, аудио, видео) сначала превращается в чистый текст своим методом, текст сжимается до сути (как вы делали с книгами), и уже это кладётся в Agent CMS как запись — с векторным индексом для смыслового поиска.

---

## Граф связей (идеи, переписка с Claude)

**Что уже есть — три слоя поиска (MCP)**

* **Полнотекст** — `search_workspace_content` (слова, теги, имена файлов)
* **Смысл** — `search_workspace_semantic` (локальный hash-TF-IDF)
* **Фильтры** — `query_workspace_storage` (SQL-like по frontmatter)
* **Комбо** — `ask_workspace` (semantic + fulltext + always-context)

**Граф — отдельный 4-й слой, пока не реализован как поиск**

Claude часто смешивает три разных «графа»:

1. **Структурный** — дерево workspace: manifest → topic → record. Уже есть: `get_page_map`, `get_content_map`, UI «Граф связей» (папки и темы, не wiki-связи).
2. **Link graph** — `[[wiki-links]]`, явные Relations (My Graph ORM), EGE в AWN. Парсер ссылок есть (`broken-links-scanner`), но индекса и MCP «соседи заметки» — нет.
3. **Temporal graph** — Graphiti / Zep AI: автоизвлечение сущностей из диалогов, Neo4j/FalkorDB, вопросы «как менялись правила за полгода». Внешний сервис, не подключён (слой 3 в многослойной памяти AWN).

**Польза vs риск**

* Link graph — высокая ценность, недорого: «что связано с чем», обход соседей, карта знаний темы.
* Graphiti/Zep — интересно для cross-session memory и временных связей, но сложно; без ревизии граф превращается в «цифровой хоардинг» (как Obsidian с тысячами заметок).

**Практичный MVP (без Neo4j)**

* При индексации парсить `[[links]]` из `.md` (логика уже в broken-links-scanner).
* Хранить в `.agent-cms/link-graph.json` (nodes + edges).
* MCP: `get_note_neighbors(path)`, `traverse_graph(from, depth=2)`.
* UI: переключатель «структурный граф» / «граф ссылок» (зачатки graph/mindmap уже есть).

**Очередь (если выбирать 3)**

1. Гибридный API (текст + смысл + where)
2. RAG-контекст для агента (автоматически в prompt)
3. Link graph index — wiki-links + manifest→topic→record