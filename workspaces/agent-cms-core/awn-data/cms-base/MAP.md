# Карта Agent CMS — `[Agent CMS] Test`

> **Агент = CMS.** Схема типов — в `awn-data/` (Страницы, Контент, Слоты, … + `cms-base/`).  
> Контент — в `awn-container/`. Служебное — в `awn-agent-kit/`.

---

## Дерево workspace

```
workspaces/agent-cms-test/
│
├── manifest.md                 ← awn.page.ws (корень агента)
├── AGENTS.md                   ← этот файл
├── awn-data/                   ← ★ CMS-МОДЕЛЬ (накопители типов + конфиг)
│   ├── cms-base/               ← entities (base/table/row + table-base), mixins, registry
│   ├── slots/                  ← awn.slot.* (path, allowed-content, accept-files)
│   ├── pages/                  ← awn.page.*
│   ├── content/                ← awn.content.*
│   ├── editing-fields/         ← awn.field.*
│   ├── markdown-blocks/        ← awn.block.*
│   └── taxonomies/             ← справочники (tags, slot-categories, …)
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
| **base** | `awn.base` | корень: name + description |
| | `awn.table.base` | база накопителя (таблицы) |
| | `awn.row.base` | база записи (строки) |
| **pages** | `awn.page.*` | узлы **меню слева** |
| **content** | `awn.content.*` | сущности **внутри слотов** |
| **slots** | `awn.slot.*` | **папки** в `topic/awn-storage/` |
| **fields** | `awn.string` … | типы полей frontmatter |
| **mixins** | `awn.mixin.*` | переиспользуемые поля |

**Markdown-блоки** — `awn-data/markdown-blocks/` (палитра редактора).

**Справочники** — `awn-data/taxonomies/*/main.csv`.

### Pages (меню)

| id | children | Файл |
|----|----------|------|
| `awn.page.ws` | area, kit | `manifest.md` (корень) |
| `awn.page.area` | topics | `awn-container/{area}/manifest.md` |
| `awn.page.topic` | **нет** (данные в слотах) | `…/{topic}/manifest.md` |
| `awn.page.topic.agent-kit.*` | **нет** | `awn-agent-kit/agent`, `user`, `rules`, `voice-*` |

### Content (в слотах)

| id | Где |
|----|-----|
| `awn.content.record` | `main/`, `inbox/`, `references/` … `.md` |
| `awn.content.category` | `{slot}/{cat}/manifest.md` — категория в любом слоте |
| `awn.content.sidecar` | `media/*.sidecar.md`, `assets/*.sidecar.md` |
| `awn.content.dialog` | `thread/*.md` — диалог с агентом |
| `awn.content.comment` | `comments/*.md` |

### Slots → content (главное правило)

**Слот = WHERE, content = WHAT.** Каждый `awn.slot.*` — запись в **`awn-data/slots/`** (`path`, `allowed-content`, `accept-files`, `storage-driver`, `slot-category`).

**Категории слотов** (группы в каталоге): `awn-data/taxonomies/slot-categories/main.csv` — Память, Файлы, Однофайловая, Записи, Общение.

```
main/      → awn.content.record, awn.content.category  (см. slots/multi-file/multi-file-main.md)
inbox/     → awn.content.record                         (см. slots/multi-file/inbox.md)
thread/    → awn.content.dialog                         (см. slots/multi-file/system/dialogs.md)
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
| Менять **схему CMS** (типы) | Записи в `awn-data/{pages,content,slots}/types/` |
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
| Категория | `awn.content.category` |
| Sidecar | `awn.content.sidecar` |
| Диалог | `awn.content.dialog` |
| Комментарий | `awn.content.comment` |
| Служебный док (agent-kit) | `awn.page.topic.agent-kit.*` |
| Справочники (tags, statuses) | `awn-data/taxonomies/*` (не page-type) |

Старые `awn.topic`, `awn.record`, `service-doc`, `catalog`, `taxonomy`, … в этом агенте **больше не используются**.

---

## Примеры путей (agent-cms-test)

| Что | Путь |
|-----|------|
| PHP-тема | `awn-container/php/manifest.md` |
| Запись | `awn-container/php/awn-storage/main/….md` |
| Диалог | `awn-agent-kit/agent/awn-storage/thread/….md` |
| Тип record | `awn-data/content/types/record.md` |
| Слот main | `awn-data/slots/types/multi-file/multi-file-main.md` |

---

## Расширение системы

Новый тип / слот / поле → запись в `awn-data/{pages,content,slots}/types/`.  
**Не** изобретать типы в `config.yml` каждой темы — только override полей.

Перегенерация из platform core:

```bash
node scripts/bootstrap-agent-awn-system.js agent-cms-test
```

(agent-типы поверх platform; свои записи в `awn-data/` сохраняй отдельно)
