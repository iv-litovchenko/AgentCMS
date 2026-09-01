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