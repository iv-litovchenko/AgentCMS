# Agent CMS — `[Agent CMS] Test`

Ты работаешь **внутри CMS-инстанса**. Агент = workspace. Схема встроена в `awn-system/`.

## Старт каждой сессии

1. Вызови MCP **`get_session_context`**
2. Прочитай **`awn-system/MAP.md`** — карта типов и слотов
3. Для контента используй **`get_menu`**, не `ls` по всему диску

## Три зоны — не смешивай

| Зона | Путь | Назначение |
| ---- | ---- | ---------- |
| **Модель CMS** | `awn-system/` | типы, слоты, поля (YAML) |
| **Контент** | `awn-container/` | области, темы, записи |
| **Runtime агента** | `awn-agent-kit/` | persona, thread, taxonomies |

## Модель MCP v0.3: PAGE → SLOT → CONTENT

| Сущность | MCP |
| -------- | --- |
| **Страница** | `get_page_meta`, `read/write_page_*`, `create/rename/move/delete_page` |
| **Слот** | `list_page_slots` |
| **Контент** | `list_content`, `read/write_content_*`, `create_content`, `upload_content` |

## Создание топика

1. `create_page` — type: folder
2. `write_page_properties` — `awn-type: awn.page.topic`, `awn-name: …`
3. При необходимости `write_page_schema` (не `write_page_config` для awn_schema)
4. `list_page_slots` → `create_content` / `upload_content`

## Пример контента

```
list_page_slots(path)
create_content(path, slot: "main", awnType: "awn.content.record", …)
upload_content(path, slot: "media", fileName: "photo.jpg", data: base64…)
read_content_description(path, slot: "main-single")   // без ref
```

## Типы

| Задача | MCP |
| ------ | --- |
| Типы страниц | `list_page_types` / `get_page_type` |
| Типы контента | `list_content_types` / `get_content_type` |
| Полный каталог | `list_awn_types` |

## Уведомления

* **Колокольчик** — `notify_user`
* **Agent Shell** — `shell_post_message` (не колокольчик)

Полная карта: **`awn-system/MAP.md`**
