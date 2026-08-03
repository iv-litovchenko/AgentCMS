# Карта Agent CMS — `[Agent CMS] Test`

> **Агент = CMS.** Схема типов встроена в workspace: `awn-system/types/`.  
> Контент — в `awn-container/`. Служебное — в `awn-agent-kit/`.

---

## Дерево workspace

```
workspaces/agent-cms-test/
│
├── manifest.md                 ← awn.page.ws (корень агента)
├── AGENTS.md                   ← этот файл
├── awn-system/                 ← ★ CMS-МОДЕЛЬ (типы, слоты, поля)
│   ├── registry.yml
│   ├── MAP.md
│   ├── slots-bindings.yml
│   └── types/{pages,content,slots,fields,mixins}/
│
├── awn-container/              ← ★ КОНТЕНТ (дерево слева)
│   └── {area}/manifest.md      ← awn.page.area
│       └── {topic}/manifest.md ← awn.page.topic
│           └── awn-storage/    ← слоты (см. ниже)
│
├── awn-agent-kit/              ← runtime агента
│   ├── agent/                  ← persona + thread/
│   ├── user/
│   └── awn-data/taxonomies/{tags,categories,statuses,…}/
│
└── awn-storage/                ← assets workspace-уровня
```

---

## Онтология типов (awn.base → …)

| Домен | id-префикс | Что это |
|-------|------------|---------|
| **base** | `awn.entity` | суперкласс всего |
| **pages** | `awn.page.*` | узлы **меню слева** |
| **content** | `awn.content.*` | сущности **внутри слотов** |
| **slots** | `awn.slot.*` | **папки** в `topic/awn-storage/` |
| **fields** | `awn.string` … | типы полей frontmatter |
| **mixins** | `awn.mixin.*` | переиспользуемые поля |

**Markdown-блоки** — `awn-data/markdown-blocks/` (палитра редактора).

**Справочники** — `awn-data/taxonomies/*/main.csv` (не YAML-типы в `awn-system/types/`).

### Pages (меню)

| id | children | Файл |
|----|----------|------|
| `awn.page.ws` | area, kit | `manifest.md` (корень) |
| `awn.page.area` | topics | `awn-container/{area}/manifest.md` |
| `awn.page.topic` | **нет** (данные в слотах) | `…/{topic}/manifest.md` |
| `awn.page.service-doc` | **нет** | `awn-agent-kit/agent`, `user`, `agent.voice.*` |
| `awn.page.catalog` | **нет** | legacy; данные в `awn-data/taxonomies/*` |

### Content (в слотах)

| id | Где |
|----|-----|
| `awn.content.record` | `main/`, `inbox/`, `references/` … `.md` |
| `awn.content.record.category` | `main/{cat}/manifest.md` |
| `awn.content.sidecar` | `media/*.sidecar.md`, `assets/*.sidecar.md` |
| `awn.content.media.category` | `media/{cat}/manifest.md` |
| `awn.content.dialog` | `thread/*.md` — диалог с агентом |
| `awn.content.comment` | `comments/*.md` |

### Slots → content (главное правило)

**Слот = WHERE, content = WHAT.** См. `awn-system/slots-bindings.yml`.

```
main/      → awn.content.record, awn.content.record.category
inbox/     → awn.content.record
thread/    → awn.content.dialog
media/     → sidecar + бинарники
comments/  → awn.content.comment
```

---

## MCP — порядок работы

1. **`get_session_context`** — старт сессии (manifest, AGENTS.md, API map)
2. **`get_menu`** / **`list_agents`** — дерево контента
3. **`read_page_properties`** — frontmatter страницы
4. **`list_page_slots`** → **`create_content`** / **`upload_content`**
5. **`read_media_sidecar`** / **`write_media_sidecar`**
6. **`GET /api/awn-types`** — эффективные типы **этого** агента

### Создание топика — правильный порядок

```
1. create_page (type: folder, name: "slug-topika")
2. write_page_properties → content: "awn-type: awn.page.topic\nawn-name: Название"
3. (опционально) write_page_schema → content YAML с awn_schema блоком
```

### Ключи awn_schema (для write_page_schema)

| Ключ | Для чего |
|------|----------|
| `slot_memory` | записи в `main/` |
| `slot_memory_category` | категории записей |
| `slot_inbox` | записи в `inbox/` |
| `slot_quick_notes` | заметки |
| `slot_references` | ссылки / референсы |
| `slot_artefacts` | артефакты |
| `slot_media` | медиа |
| `slot_media_category` | категории медиа |
| `slot_scripts` | скрипты |
| `slot_repository` | репозиторий |
| `topic` | поля самой темы |
| `sidecar` | поля sidecar-файлов |
| `settings` | настройки |

Пример `write_page_schema` content:
```yaml
awn_schema:
  slot_memory:
    fields:
      title:
        type: string
        name: Заголовок
      tags:
        type: tags
```

### Не путать

| Действие | Инструмент |
|----------|------------|
| Менять **схему CMS** (типы) | YAML в `awn-system/types/` (редко, осознанно) |
| Создать **тему/запись** | `create_page` / `create_content` |
| Загрузить **файл** | `upload_content` slot=media |
| Задать **поля одной страницы** | `write_page_schema` (content = YAML с awn_schema:) |
| UI настройки страницы | `write_page_config` (content = YAML с awn_ui:) |

---

## Канонические awn-type (миграция 2026-07-05)

В workspace **только канонические id**:

| Домен | id |
|-------|-----|
| Workspace | `awn.page.ws` |
| Область | `awn.page.area` |
| Тема | `awn.page.topic` |
| Запись | `awn.content.record` |
| Категория записи | `awn.content.record.category` |
| Sidecar | `awn.content.sidecar` |
| Категория медиа | `awn.content.media.category` |
| Диалог | `awn.content.dialog` |
| Комментарий | `awn.content.comment` |
| Служебный док (agent-kit) | `awn.page.service-doc` |
| Справочник (tags, statuses) | `awn.page.catalog` |

Старые `awn.topic`, `awn.record`, `service-doc`, `catalog`, … в этом агенте **больше не используются**.

---

## Примеры путей (agent-cms-test)

| Что | Путь |
|-----|------|
| PHP-тема | `awn-container/php/manifest.md` |
| Запись | `awn-container/php/awn-storage/main/….md` |
| Диалог | `awn-agent-kit/agent/awn-storage/thread/….md` |
| Тип record | `awn-system/types/content/record.yml` |
| Слот main | `awn-system/types/slots/main.yml` |

---

## Расширение системы

Новый тип / слот / поле → правка YAML в `awn-system/types/` (или bootstrap из platform).  
**Не** изобретать типы в `config.yml` каждой темы — только override полей.

Перегенерация из platform core:

```bash
node scripts/bootstrap-agent-awn-system.js agent-cms-test
```

(agent-типы поверх platform; свои файлы в `awn-system/types/` сохраняй отдельно)
