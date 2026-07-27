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
* **Запись** = `awn.content.record` в `…/awn-storage/main/*.md`
* **Диалог** = `awn.content.dialog` в `…/thread/` или `awn-agent-kit/agent/…/thread/`
* **Sidecar** = `{file}.sidecar.md` рядом с медиа, тип `awn.content.sidecar`
* **Слот vs content**: папка `main/` — слот; файл внутри — content-type

## Создание топика — правильный порядок

> Нарушение порядка = потеря схемы или неверный тип!

1. `create_node` — создать папку (type: "folder")
2. `write_node_properties` — записать frontmatter:

    ```yaml
    awn-type: awn.page.topic
    awn-name: <название>
    ```
3. **Если нужна кастомная схема полей** — `write_topic_schema` (content: YAML с `awn_schema:`)
    * **НЕ** используй `write_node_config` для записи схемы — это затёрет `awn_ui`
    * `write_node_config` только для `awn_ui` и `awn_settings`
4. Для слотов агент создаёт стандартные папки автоматически (не трогай вручную)

## Остальные операции

| Задача | MCP / API |
| ------ | --------- |
| Область | `create_node` → `write_node_properties` (awn-type: awn.page.area) |
| Запись в main | `create_external_memory` |
| Sidecar | `read_media_sidecar` / `write_media_sidecar` |
| Свойства узла | `read_node_properties` / `write_node_properties` |
| Схема полей топика | `read_topic_schema` / `write_topic_schema` (YAML content) |
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
