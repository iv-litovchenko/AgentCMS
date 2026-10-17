---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-emoji: ""
awn-note-todo-sticker: ""
awn-focus: false
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
awn-create: "2026-09-16T12:04"
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
awn-name: Изображения и работа с изображениями
awn-preview: ""
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-16T09:05:26.439Z
awn-version: 2
---

Для YamlCMS / Agent CMS картинки уже частично закрыты — ниже карта: что есть, чего не хватает и что даст наибольшую отдачу.

## Уже есть (можно использовать сейчас)

| Инструмент | Зачем |
| ---------- | ----- |
| `upload_file` / `upload_file_from_url` | Загрузка изображений в workspace |
| `import_content_from_url` | Импорт картинки в слот `media` темы |
| `read_file` (`format=base64`) | Агент **видит** картинку напрямую (MCP image content) |
| `search_web_images` | Поиск картинок в интернете |
| `get_link_preview` | OG-превью с `imageUrl` |
| `run_workspace_ocr_index` | OCR изображений/PDF → `{stem}.sidecar.md` |
| `search_workspace_hybrid` / `semantic` | Поиск по тексту из OCR sidecar |
| `extract_document_text` | Текст из PDF (не vision, но для сканов полезно) |
| Thumbnails (`sharp`, `?thumb=1`) | Превью в UI, кэш `.agent-cms/cache/media-thumbs` |
| `browser_take_screenshot` | Скриншоты страниц при автоматизации |
| `GenerateImage` (Cursor) | Генерация картинок по описанию |

Типичный пайплайн уже работает:

```
search_web_images → import_content_from_url  
upload_file → run_workspace_ocr_index → search_workspace_hybrid  
read_file (base64) → разовый анализ в чате  
```

***

## Чего не хватает — и что было бы полезно добавить

### Высокий приоритет (прямо в тему CMS)

1. **`describe_image` / `generate_alt_text`**

* Vision-модель → описание, alt-текст, теги, язык
* Сохранять в sidecar (`awn-image-description`, `awn-tags`)
* Нужно для: accessibility, поиска, автозаполнения превью тем

2. **`optimize_image` / `resize_image` / `convert_image`**

* `sharp` уже в проекте — логично вынести в MCP:
* resize, webp/avif, сжатие, crop
* Сценарий: «загрузил 5 МБ PNG → сжал в assets»

3. **`improve_ocr` / fallback OCR**

* У вас это уже описано в `rag-2.md`: Tesseract → EasyOCR/Paddle при плохом результате
* Поле `awn-ocr-engine` в sidecar как раз под это

4. **`search_images_semantic`**

* Сейчас поиск по картинкам идёт через OCR-текст
* CLIP/embeddings дадут «найди похожую картинку» / «красная машина на фоне гор» без текста на изображении

### Средний приоритет (удобство агента)

5. **`get_image_metadata`**

* EXIF: размер, дата, камера, гео, ориентация
* Полезно для архивов Telegram/фото

6. **`extract_dominant_colors`**

* Палитра → теги, подбор обложек, группировка вложений

7. **`detect_duplicate_images`**

* pHash / perceptual hash
* Дедуп в `awn-storage/assets/`

8. **`screenshot_to_workspace`**

* Скриншот → сразу в `awn-temp/` или `assets/pasted/`
* Связка с voice-shell (у вас в todo: screenshot, clipboard)

9. **`rasterize_svg`**

* SVG → PNG/WebP для превью и OCR

### Низкий приоритет / по запросу

10. **`remove_background`** — обложки, иконки
11. **`compare_images`** — diff скриншотов UI
12. **`detect_objects` / `detect_faces`** — редкие кейсы
13. **`generate_image` в MCP** — не только через Cursor `GenerateImage`, а в workspace-пайплайн

***

## Рекомендуемый минимальный набор новых MCP-tools

Если делать поэтапно, я бы начал с трёх:

```text
1. describe_image({ path, saveToSidecar? })  
→ caption + tags + alt

2. process_image({ path, resize?, format?, quality?, crop? })  
→ sharp-пайплайн, перезапись или новый файл

3. search_images({ query, mode: "ocr" | "semantic" | "hybrid" })  
→ единая точка: OCR-текст + (позже) CLIP-embeddings  
```

Это закрывает 80% сценариев:

* вставка картинки в тему,
* поиск по архиву,
* автогенерация alt/описаний,
* оптимизация веса.

***

## Что не стоит тащить в ядро

* **Cloud Vision API** — только как опциональный плагин для «улучшить этот файл» (у вас это уже отмечено в `rag-2.md`)
* **LayoutLM / Donut** — пока overkill для скриншотов чатов
* **«Агент сам смотрит картинку»** — хорошо для разовых вопросов, но **не заменяет** sidecar + индекс для архива

***

## Быстрая матрица «задача → инструмент»

| Задача | Сейчас | Лучше добавить |
| ------ | ------ | -------------- |
| Найти картинку в интернете | `search_web_images` | — |
| Положить в тему | `import_content_from_url` | — |
| Прочитать текст со скрина | `run_workspace_ocr_index` | fallback OCR |
| Найти по содержимому | `search_workspace_hybrid` | `search_images_semantic` |
| Сгенерировать обложку | `GenerateImage` (Cursor) | `generate_image` MCP |
| Сжать/ресайз | вручную / вне CMS | `process_image` |
| Alt-текст | вручную | `describe_image` |
| Скриншот страницы | `browser_take_screenshot` | `screenshot_to_workspace` |

Если нужно, могу набросать конкретные схемы аргументов и sidecar-поля для `describe_image` + `process_image` под ваш текущий MCP-сервер.