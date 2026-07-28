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
| **Runtime агента** | `awn-agent-kit/` | persona (`awn.page.service-doc`), thread, taxonomies (`awn.page.catalog`) |

## Быстрые правила

* **Меню слева** = `awn.page.ws` → `awn.page.area` → `awn.page.topic`
* **Страница** (не «нода») = manifest.md с `awn-type: awn.page.*`
* **External-слот** = папка (`main/`, `inbox/`, `references/`, …)
* **Internal-слот** = один файл (`main.md`, `main.csv`, `todo.md`)
* **Запись** = `awn.content.record` в слоте
* **Диалог** = `awn.content.dialog` в `thread/`
* **Sidecar** = `{file}.sidecar.md` рядом с медиа

## Создание топика — правильный порядок

> Нарушение порядка = потеря схемы или неверный тип!

1. `create_page` — создать папку (type: "folder")
2. `write_page_properties` — frontmatter:

    ```yaml
    awn-type: awn.page.topic
    awn-name: <название>
    ```
3. **Если нужна кастомная схема полей** — `write_page_schema` (content: YAML с `awn_schema:`)
    * **НЕ** используй `write_page_config` для записи схемы — это затрёт `awn_ui`
    * `write_page_config` только для `awn_ui` и `awn_settings`
4. Для слотов агент создаёт стандартные папки автоматически (не трогай вручную)

## Остальные операции

| Задача | MCP / API |
| ------ | --------- |
| Область | `create_page` → `write_page_properties` (awn-type: awn.page.area) |
| Запись в main | `create_slot_record` { folder: "main" } |
| Запись во входящие/источники | `create_slot_record` { folder: "inbox" \| "references" } |
| Однофайловая память | `read_internal_slot` / `write_internal_slot` |
| Sidecar | `read_media_sidecar` / `write_media_sidecar` |
| Свойства страницы | `read_page_properties` / `write_page_properties` |
| Схема полей страницы | `read_page_schema` / `write_page_schema` (YAML content) |
| **Уведомление пользователю (🔔 CMS)** | **`notify_user`** — title, message?, path? (manifest) |
| Сообщение в Agent Shell (голос/UI) | **`shell_post_message`** — body (thread/inbox, **не** колокольчик) |

## Уведомления пользователю

* **Колокольчик 🔔 в шапке CMS** — журнал `.agent-cms/activity.jsonl` (per-agent).
* **Автоматически** попадают create/update/delete/move файлов через MCP и UI.
* **Произвольный текст** — MCP **`notify_user`** (`POST /api/agent/activity/notify`):

  ```json
  { "title": "Готово", "message": "42 записи импортировано", "path": "awn-container/tema/manifest.md" }
  ```

  `path` — опционально: по клику откроется тема.
* **Не путать** с **`shell_post_message`** — это сообщение в **Agent Shell** (thread/диалог), не в колокольчик CMS.

## Схема типов

Полная карта: **`awn-system/MAP.md`**Слот → content: **`awn-system/slots-bindings.yml`**YAML типов: **`awn-system/types/`**

## Канонические awn-type

С 2026-07-05 в этом workspace **только канонические id** (`awn.page.topic`, `awn.content.record`, `awn.page.service-doc`, …).Не используй старые `awn.topic`, `awn.record`, `awn.area`, `awn.workspace`, `awn.sidecar`, **`service-doc`**, **`catalog`**.

## Не делай

* Не выдумывай новые `awn-type` — бери из `awn-system/types/`
* Не храни типы в `agent-cms-core` — они **в этом агенте**
* Не затирай `config.yml` без чтения — там может быть `awn_schema`

## Тестовые темы

* `awn-container/php/` — большая тема с main/, media/, scripts/
* `awn-container/polnyy-test/` — полный тест областей
* `awn-container/test-shemy-i-konfiguratsii/` — эксперименты со schemawatch test 1785182088
