---
awn-attachments: []
  Многострочный текст
  второй абзац
  ## Заголовок
  **Жирный** и *курсив*.
  - "[[All-Field-Types]]"
  - "[[main]]"
  version: 1
    qty: 2
- name: alpha"
  \"key\": \"value\",
  \"count\": 1
}"
  \"title\": \"Пример\",
awn-status: open
awn-quality: 4
awn-importance: 0
awn-emoji: 🧪
awn-sort: 0
awn-note-todo-sticker: ""
awn-main: false
awn-focus: false
awn-slots-flexible: false
awn-runtime-load-always: true
awn-runtime-heartbeat: true
awn-runtime-cron: true
awn-runtime-cron-schedule: "0 9 * * 1-5"
awn-runtime-commands: false
awn-index-exclude-record: false
awn-index-exclude-subtree: false
awn-taxonomy:
  kollektsiya-1: 009
  kollektsiya-1-tree: 999
  kollektsiya-2-many: 777
  kollektsiya-2-many-tree:
    - 55555
    - 444
awn-type: awn.page.topic
awn-create: "2026-06-21T12:00"
awn-owner: me
awn-category: reference
awn-color: purple
awn-description: ""
awn-name: Тест всех свойство
awn-preview: awn-storage/assets/preview/20260623203544.png
awn-priority: high
awn-slots-disabled: false
awn-tags:
  - reference
  - 2024
  - книги
  - криминал-ит
  - москва
awn-web-url: "https://example.com/all-field-types"
demo_array:
  - demo
  - ui
  - test
demo_boolean: true
demo_choice_many:
  - alpha
  - beta
demo_choice_one: in_progress
demo_code: "version: 1"
demo_color: "#461796"
demo_coordinates: "55.7558, 37.6173"
demo_cron: "0 9 * * 1-5"
demo_date: 2026-06-21
demo_datetime: "2026-06-21T12:00"
demo_duration: 2h 30m
demo_email: demo@example.com
demo_entity_preview: awn-storage/assets/preview/20260623203544.png
demo_file_many:
  - awn-storage/assets/attachments/939bad10-15ef-4708-b6a1-fff2ee90d7df-20260810000040.png
  - awn-storage/assets/attachments/47ee4862-2d97-44dd-b7e4-81ad60349fd1-20260810000044.png
demo_file_one: awn-storage/assets/attachments/47ee4862-2d97-44dd-b7e4-81ad60349fd1-20260810000026.png
demo_image_many: []
demo_image_one: ""
demo_integer: 42
demo_json: "{"
demo_lookup_category: reference
demo_lookup_color: purple
demo_lookup_owner: me
demo_lookup_priority: high
demo_lookup_status: open
demo_lookup_tags: []
demo_markdown: ""
demo_number: 3.14
demo_object: "{"
demo_password: ""
demo_path: awn-container/test-vseh-poley/main.md
demo_phone: +7 900 123-45-67
demo_relation_many: "[PHP](../php/manifest.md)"
demo_relation_one: "[pukpku](../pukpku/manifest.md)"
demo_repeater: "[object Object]"
demo_secret: ""
demo_slug: all-field-types
demo_string: Пример однострочной строки
demo_text: ""
demo_time: "14:30"
demo_url: "https://example.com/all-field-types"
field-1: ""
items: ""
awn-update: 2026-09-26T07:57:49.087Z
awn-version: 23
awn-id: 39
---


# All Field Types — демонстрация типов полей

Тема для проверки виджетов в панели **Свойства**:

| Уровень | Где смотреть |
| ------- | ------------ |
| **topic** | frontmatter этой темы (`demo_*`) — **все типы** |
| **record** | `Content/All-Field-Types.md` (`rec_*`) |
| **sidecar** | любой `.sidecar.md` в `Assets/` (`sidecar_*`) |

Схема полей: **`schema.yml`** → `awn_schema`.

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

**Новые (new!):**

| Поле | Тип |
| ---- | --- |
| `demo_time` | `awn.field.date.time` |
| `demo_duration` | `awn.field.duration` |
| `demo_code` | `awn.field.text.code` |
| `demo_secret` | `awn.field.string.secret` |
| `demo_object` | `awn.field.object` |
| `demo_repeater` | `awn.field.repeater` |

Запись с заполненными значениями: [[All-Field-Types]].
