---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-emoji: ""
awn-note-todo-sticker: ""
awn-main: false
awn-runtime-load-always: false
awn-runtime-heartbeat: false
awn-runtime-cron: false
awn-runtime-cron-schedule: "0 9 * * *"
awn-runtime-commands: false
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: ""
awn-tags: []
awn-type: awn.content.record
awn-create: "2026-09-13T16:55"
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-mindmap-enabled: true
awn-mindmap-type: optional
awn-mindmap-color: slate
awn-mindmap-size: auto
awn-mindmap-layout-independent: false
awn-mindmap-direction: auto
awn-attachments: []
awn-description: ""
awn-name: RAG-2
awn-preview: ""
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-13T13:56:01.906Z
awn-version: 2
---

Для YamlCMS полезность зависит от того, **что уже есть** и **какой у вас пайплайн**.

## Уже есть в проекте

| Инструмент | Где |
| ---------- | --- |
| **Tesseract** (`tesseract.js`) | `ocr-index/service.js` — картинки, препроцессинг, PSM, quality-score |
| **pdf-parse** | OCR для PDF (текстовый слой) + `document-extract-service.js` |
| **mammoth + xlsx** | `extract_document_text` — docx/xlsx |
| **Whisper** | `agent-shell/stt-service.js` — **речь → текст**, не OCR |
| **Поиск** | OCR → fulltext → semantic → storage-index → hybrid |

То есть базовый стек уже собран: **sidecar → индексы → hybrid search**.

***

## Что реально полезно добавить (по приоритету)

### 1. EasyOCR или PaddleOCR — **второй движок OCR** (средний приоритет)

Имеет смысл, если основная боль — **скриншоты и фото** (как ваш «Снимок экрана…» с мусором `pst`).

* **Tesseract.js** у вас уже встроен, офлайн, без Python — это плюс для CMS.
* **EasyOCR / PaddleOCR** — Python, тяжелее в деплое, но часто лучше на реальных скринах.
* Практичная схема: не заменять, а **fallback** — `tesseract.js` → если `awn-ocr-extracted: false` или низкий score → вызов Python-сервиса (EasyOCR/Paddle).
* Поля `awn-ocr-engine` в sidecar как раз под это.

**PaddleOCR** — если много кириллицы + латиницы в одном кадре.**EasyOCR** — проще старт, хорош на «грязных» фото.

### 2. Cloud API (Vision / Azure / Textract) — **опционально, не ядро**

Полезно для:

* сканов счетов, договоров, таблиц;
* когда нужна максимальная точность и объём небольшой.

Для архива из 1000+ Telegram-вложений — дорого и зависимость от сети. Логичнее как **плагин** «улучшить этот файл», не как дефолт пайплайна.

### 3. unstructured — **частично уже закрыто**

У вас есть `extract_document_text` (pdf, docx, xlsx, html).**unstructured** даст больше, если появятся:

* pptx, eml, epub;
* единый пайплайн «любой файл → markdown + метаданные».

Для Telegram-архива (в основном json/md/картинки/pdf) — **низкий приоритет**, пока не начнёте массово тащить office-документы.

### 4. Whisper — **уже есть, но для другого**

Whisper у вас для **голоса в Shell**, не для картинок.Полезен, если в архиве будут **голосовые .ogg/.mp3** из Telegram — тогда: Whisper → sidecar/запись → тот же индекс.

### 5. LayoutLM / Donut — **пока рано**

Имеет смысл, когда задача — не «найти текст», а **структура документа** (таблица / подпись / заголовок).Для скриншотов чатов и обычных вложений — overkill.

### 6. spaCy / NER — **следующий слой после OCR**

Не замена OCR, а **постобработка**:

* имена, даты, суммы из уже извлечённого текста;
* можно писать в frontmatter (`awn-tags`, кастомные поля) или отдельный индекс.

Полезно для «найди все упоминания X в 1000 сообщениях», но только **после** стабильного OCR.

### 7. «Агент читает картинку сам» — **не замена пайплайна**

В чате модель видит картинку напрямую — удобно для разовых вопросов.Для архива это не работает: нужен **постоянный текст в sidecar + индекс**, чтобы работали `search_workspace_hybrid` и агент без повторной загрузки каждого png.

***

## Под ваш кейс (Telegram-архив, скриншоты, 1000 файлов)

| Задача | Что брать |
| ------ | --------- |
| Скриншоты, фото | Держать **tesseract.js** + рассмотреть **EasyOCR fallback** |
| PDF с текстом | Уже есть **pdf-parse** |
| PDF-сканы (без текстового слоя) | Сейчас слабо — нужен **OCR по страницам** (Tesseract/EasyOCR на рендер pdf→image) |
| docx/xlsx | Уже есть |
| Голосовые | **Whisper** (уже в Shell) → sidecar/запись |
| Таблицы в сканах | Cloud API или Donut — только если появится реальная боль |
| Сущности после OCR | spaCy/NER — позже |

***

## Практическая рекомендация

**Сейчас не менять весь стек.** У вас правильная архитектура:

```
вложение → OCR → .sidecar.md → fulltext/semantic/storage → hybrid  
```

Имеет смысл думать о:

1. **Улучшении качества OCR** — второй движок (EasyOCR) как fallback при `poor_quality` / `empty_text`.
2. **PDF-сканах** — рендер страниц + тот же OCR (сейчас pdf без текстового слоя падает).
3. **Голосовых** — Whisper → текст в sidecar (если в архиве есть voice).

Cloud, unstructured, LayoutLM — только под конкретные новые типы файлов, не как замена текущего OCR-слоя.

Если скажете, что в архиве чаще всего (скрины / pdf-сканы / голосовые / docx), можно сузить до одного следующего шага.