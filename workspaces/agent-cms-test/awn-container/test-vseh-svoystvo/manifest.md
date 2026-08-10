---
awn-attachments: []
  Многострочный текст
  второй абзац
  ## Заголовок
  **Жирный** и *курсив*.
  - "[[All-Field-Types]]"
  - "[[main]]"
awn-status: open
awn-emoji: 🧪
awn-sort: 0
awn-slots-disabled: false
awn-main: false
awn-runtime-load-always: true
awn-runtime-cron: true
awn-runtime-cron-schedule: "0 9 * * 1-5"
awn-runtime-heartbeat: true
awn-runtime-commands: false
awn-category: reference
awn-owner: me
awn-priority: high
awn-color: purple
awn-tags:
  - demo
  - reference
awn-type: awn.page.topic
awn-create: "2026-06-21T12:00"
awn-update: 2026-08-10T00:03:16.979Z
awn-version: 20
awn-description: ""
awn-name: Тест всех свойство
awn-preview: awn-storage/assets/preview/20260623203544.png
awn-web-url: "https://example.com/all-field-types"
demo_boolean: true
demo_choice_many:
  - alpha
  - beta
demo_choice_one: in_progress
demo_color: "#461796"
demo_cron: "0 9 * * 1-5"
demo_date: 2026-06-21
demo_datetime: "2026-06-21T12:00"
demo_email: demo@example.com
demo_entity_preview: awn-storage/assets/preview/20260623203544.png
demo_file_many:
  - awn-storage/assets/attachments/939bad10-15ef-4708-b6a1-fff2ee90d7df-20260810000040.png
  - awn-storage/assets/attachments/47ee4862-2d97-44dd-b7e4-81ad60349fd1-20260810000044.png
demo_file_one: awn-storage/assets/attachments/47ee4862-2d97-44dd-b7e4-81ad60349fd1-20260810000026.png
demo_image_many: []
demo_image_one: ""
demo_integer: 42
demo_json: "{\"key\":\"value\",\"count\":1}"
demo_lookup_category: reference
demo_lookup_color: purple
demo_lookup_owner: me
demo_lookup_priority: high
demo_lookup_status: open
demo_lookup_tags:
  - 2024
  - книги
  - криминал-ит
  - москва
  - demo
  - reference
demo_markdown: ""
demo_number: 3.14
demo_path: awn-container/test-vseh-poley/main.md
demo_relation_many: "[PHP](../php/manifest.md)"
demo_relation_one: "[pukpku](../pukpku/manifest.md)"
demo_slug: all-field-types
demo_string: Пример однострочной строки
demo_tags_free:
  - demo
  - ui
  - test
demo_text: ""
demo_url: "https://example.com/all-field-types"
field-1: ""
---

# All Field Types — демонстрация типов полей

Тема для проверки виджетов в панели **Свойства**:

| Уровень | Где смотреть |
| ------- | ------------ |
| **topic** | frontmatter этой темы (`demo_*`) — **все типы** |
| **record** | `Content/All-Field-Types.md` (`rec_*`) |
| **sidecar** | любой `.sidecar.md` в `Assets/` (`sidecar_*`) |

Схема полей: **`schema-mod.yml`** → `awn_schema`.

**Медиа (5 типов файлов):**

| Поле | Тип | Виджет |
| ---- | --- | ------ |
| `demo_file_one` | `awn.field.file.one` | файл |
| `demo_file_many` | `awn.field.file.many` | файлы |
| `demo_image_one` | `awn.field.file.image.one` | изображение |
| `demo_image_many` | `awn.field.file.image.many` | изображения |
| `demo_entity_preview` | `awn.field.file.image.for-preview` | превью сущности |
| `awn-attachments` | `awn.field.file.many` + `widget: attachments` | блок вложений |
| `awn-preview` | `awn.field.file.image.for-preview` | превью в aside |

Запись с заполненными значениями: [[All-Field-Types]].
