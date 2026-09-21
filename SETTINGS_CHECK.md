# SETTINGS_CHECK — реестр настроек Agent CMS

> Чеклист для проверки. Источник схем: `workspaces/agent-cms-core/awn-system/types/settings/*.yml`  
> Дата выгрузки: 2026-09-21

## Легенда

| Символ | Значение |
|--------|----------|
| 🌐 | Platform — `agent-cms-core/settings.global.yml` |
| 📦 | Workspace — `settings.yml` в корне хранилища |
| 🔌 | Integrations — `.agent-cms/integrations.yml` (skills, MCP, плагины) |
| 👤 | User — `.agent-cms/user-settings.yml` |
| 👁️✅ / 👁️❌ | Читается / не читается в runtime (MCP/сервер) |
| ✏️✅ / ✏️❌ | Редактируется в UI и влияет / только просмотр или нет эффекта |
| ✅ | Подключено в runtime |
| ⚠️ | Частично / косвенно |
| ❌ | `{NOT WORK}` — только схема и форма |

**Колонка MCP tools:** через какие MCP-tool получить/изменить ключ (`scope` — см. секцию: `platform` / `workspace` / `integrations` / `user`).  
Сокращения: **L** = `list_settings` · **R** = `read_setting` · **W** = `write_setting` · **—** = tool недоступен для ключа.

**UI:** раздел «Настройки проекта» + модал «Глобальные настройки платформы» в шапке.

---

## 🌐 Platform (глобальные) — `settings.global.yml`

Файл схемы: `awn-system/types/settings/platform.yml` · MCP `scope=platform`

### 🏠 Основные (`main`)

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 🌐 | 🏠 Основные | Версия CMS | `sys-cms-version` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Meta из `package.json`, не в yaml | L · R · W❌ readonly |
| 🌐 | 🏠 Основные | Версия registry.yml | `sys-registry-version` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Meta, readonly | L · R · W❌ readonly |
| 🌐 | 🏠 Основные | Режим registry | `sys-registry-mode` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Meta, readonly | L · R · W❌ readonly |
| 🌐 | 🏠 Основные | Дата миграции типов | `sys-registry-migration-date` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Meta, readonly | L · R · W❌ readonly |
| 🌐 | 🏠 Основные | Node.js | `sys-node-version` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Meta, readonly | L · R · W❌ readonly |
| 🌐 | 🏠 Основные | ОС сервера | `sys-platform-os` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Meta, readonly | L · R · W❌ readonly |
| 🌐 | 🏠 Основные | Каталог ядра | `sys-core-path` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Meta, readonly | L · R · W❌ readonly |
| 🌐 | 🏠 Основные | Типов в каталоге | `sys-type-catalog-count` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Meta, readonly | L · R · W❌ readonly |
| 🌐 | 🏠 Основные | Режим обслуживания | `maintenance-mode` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ API 503 + UI-оверлей (кроме settings-global) | L · R · W |
| 🌐 | 🏠 Основные | Язык UI по умолчанию | `default-locale` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ `document.lang` ru/en | L · R · W |

### 🖥️ Интерфейс (`ui`) — глобальные заглушки

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 🌐 | 🖥️ Интерфейс | Тема оформления | `ui-theme` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK — только схема | L · R · W (без runtime) |
| 🌐 | 🖥️ Интерфейс | Плотность интерфейса | `ui-density` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 🌐 | 🖥️ Интерфейс | Хлебные крошки | `ui-show-breadcrumbs` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 🌐 | 🖥️ Интерфейс | Ширина сайдбара по умолчанию | `ui-default-sidebar-width` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK — персонально в user | L · R · W (без runtime) |

### 🧠 Автоконтекст (`auto-context`)

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 🌐 | 🧠 Автоконтекст | GLOBAL_MCP_DOC.md | `always-context-global-mcp-doc` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Вкл/выкл в always-context registry | L · R · W · `list_workspace_always_context` |
| 🌐 | 🧠 Автоконтекст | GLOBAL_RESPONSE_STYLE.md | `always-context-global-response-style` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Стиль ответов в always-context | L · R · W · `list_workspace_always_context` |
| 🌐 | 🧠 Автоконтекст | AGENTS.md | `always-context-agents-md` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ AGENTS.md workspace в always-context | L · R · W · `list_workspace_always_context` |
| 🌐 | 🧠 Автоконтекст | Папка автоконтекста (shared) | `always-context-ws-folder` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Рекурсивно .md/.yml/.txt из каталога | L · R · W · `list_workspace_always_context` |
### 🔌 MCP (`mcp`)

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 🌐 | 🔌 MCP | Режим MCP | `mcp-mode` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ readonly / standard / full + `awn_policy` | L · R · W · `get_session_context` |
| 🌐 | 🔌 MCP | batch_invoke | `batch-enabled` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Пакетные вызовы одного tool | L · R · W · `batch_invoke` |
| 🌐 | 🔌 MCP | Лимит read/list/search | `batch-read-limit` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Лимит batch read | L · R · W · `batch_invoke` |
| 🌐 | 🔌 MCP | Лимит write/create/delete | `batch-write-limit` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Лимит batch write | L · R · W · `batch_invoke` |
| 🌐 | 🔌 MCP | Запретить exec в batch | `batch-deny-exec` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ✅ exec_* / run_script блок в batch_invoke | L · R · W · `batch_invoke` |
| 🌐 | 🔌 MCP | Подтверждение exec | `confirm-exec` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ✅ exec_* / run_script требуют `confirm: true` | L · R · W · exec/delete tools |
| 🌐 | 🔌 MCP | Подтверждение delete | `confirm-delete` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ✅ delete_* требуют `confirm: true` | L · R · W · exec/delete tools |
| 🌐 | 🔌 MCP | Лимит read_file (текст) | `read-text-max-bytes` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Лимит FS read текста | L · R · W · `read_file` |
| 🌐 | 🔌 MCP | Лимит read_file (base64) | `read-binary-max-bytes` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Лимит FS read бинарника | L · R · W · `read_file` |

### 📇 Индексирование (`indexing`)

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 🌐 | 📇 Индексирование | OCR (вложения) | `index-ocr-enabled` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ⚠️ Шаг 1 pipeline; OCR в UI пока отключён | L · R · W · `run_workspace_ocr_index` · `rebuild_workspace_indexes` |
| 🌐 | 📇 Индексирование | Слова (fulltext) | `index-fulltext-enabled` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Шаг 2 — fulltext-index, поиск «Слова» | L · R · W · `search_workspace_content` · `rebuild_workspace_fulltext_index` |
| 🌐 | 📇 Индексирование | Смысл (RAG) | `index-semantic-enabled` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Шаг 3 — semantic-index, поиск «Смысл» | L · R · W · `search_workspace_semantic` · `rebuild_workspace_semantic_index` |
| 🌐 | 📇 Индексирование | Поля (storage) | `index-storage-enabled` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Шаг 4 — storage-index, фильтры по полям | L · R · W · `query_workspace_storage` · `rebuild_workspace_storage_index` |
| 🌐 | 📇 Индексирование | Связи (links) | `index-links-enabled` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Шаг 5 — link-index, граф | L · R · W · `search_workspace_links` · `rebuild_workspace_link_index` |
| 🌐 | 📇 Индексирование | ID (awn-id) | `index-workspace-id-enabled` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Шаг 6 — sync счётчика в pipeline | L · R · W · `assign_workspace_id` · `resolve_workspace_id` |
| 🌐 | 📇 Индексирование | Режим индекса полей | `index-storage-mode` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ quick / full при пересборке storage | L · R · W · `rebuild_workspace_storage_index` |
| 🌐 | 📇 Индексирование | Типы файлов для индекса | `index-file-extensions` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ choice.many — что индексировать | L · R · W · `rebuild_workspace_indexes` |
| 🌐 | 📇 Индексирование | Разделы workspace для индекса | `index-path-prefixes` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Пусто = весь workspace | L · R · W · `rebuild_workspace_indexes` |
| 🌐 | 📇 Индексирование | Исключить из индекса | `index-exclude-patterns` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Текст, строка = правило; `!file` = исключение из маски | L · R · W · `rebuild_workspace_indexes` |
| 🌐 | 📇 Индексирование | Слои hybrid-поиска | `search-default-scopes` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ semantic / fulltext по умолчанию в hybrid/batch | L · R · W · `search_workspace_hybrid` · `search_workspace_batch` |

### 🔍 Поиск (RAG) (`indexing-search`)

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 🌐 | 🔍 Поиск (RAG) | Чанк RAG | `search-semantic-chunk-size` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Размер чанка semantic-index (символы) | L · R · W · `rebuild_workspace_semantic_index` |
| 🌐 | 🔍 Поиск (RAG) | Overlap чанков | `search-semantic-chunk-overlap` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Перекрытие чанков | L · R · W · `rebuild_workspace_semantic_index` |
| 🌐 | 🔍 Поиск (RAG) | Hybrid — semantic | `search-hybrid-semantic-weight` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Вес semantic 0–100 в hybrid | L · R · W · `search_workspace_hybrid` |
| 🌐 | 🔍 Поиск (RAG) | Hybrid — fulltext | `search-hybrid-fulltext-weight` | 👁️✅ ✏️⚠️ | 👁️✅ ✏️✅ | ✅ Вес fulltext 0–100 в hybrid | L · R · W · `search_workspace_hybrid` |

### 💾 Память (`memory`)

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 🌐 | 💾 Память | Авто-факты | `auto-retain-facts` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK — долговременная память | L · R · W (без runtime) · `retain_workspace_fact` |

---

## 📦 Workspace (локальные) — `settings.yml`

Файл схемы: `awn-system/types/settings/workspace.yml` · MCP `scope=workspace`

### 📋 Общие (`general`)

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 📦 | 📋 Общие | Язык агента | `agent-language` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 📦 | 📋 Общие | Стиль ответов | `response-style` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 📦 | 📋 Общие | Уведомление по завершении | `notify-on-complete` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |

### 🤖 Агент (`agent`)

_Пока без полей — заготовка группы._

### 🔢 Автоинкремент (`autoincrement`)

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 📦 | 🔢 Автоинкремент | Следующий id | `awn-id-next` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Счётчик; locked; MCP assign/sync | L · R · W❌ · `assign_workspace_id` · `rebuild_workspace_indexes` |
| 📦 | 🔢 Автоинкремент | Выдано id | `awn-id-issued` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Статистика; locked | L · R · W❌ · `assign_workspace_id` |
| 📦 | 🔢 Автоинкремент | Обновлено | `awn-id-updated-at` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ ISO timestamp; locked | L · R · W❌ |
| 📦 | 🔢 Автоинкремент | Модель счётчика | `awn-id-model` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | ✅ Версия схемы; locked | L · R · W❌ |

### 💾 Память (`memory`) — workspace

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 📦 | 💾 Память | Слот по умолчанию | `default-slot` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 📦 | 💾 Память | TTL awn-temp (дни) | `awn-temp-ttl-days` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |

### 🔧 Статичные параметры (`static`) — workspace

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 📦 | 🔧 Статичные | Пример ключа плагина | `ws-static-plugin-example` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK — заглушка интеграций | L · R · W (без runtime) |
| 📦 | 🔧 Статичные | Ключ 1 | `ws-static-example-1` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 📦 | 🔧 Статичные | Ключ 2 | `ws-static-example-2` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 📦 | 🔧 Статичные | Ключ 3 | `ws-static-example-3` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |

---

## 👤 User (пользовательские) — `.agent-cms/user-settings.yml`

Файл схемы: `awn-system/types/settings/user.yml` · MCP `scope=user`

### 🌳 Настройки дерева (`tree`)

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 👤 | 🌳 Дерево | Показывать свободную память | `tree-show-empty-folders` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ✅ Пустые папки в дереве меню | L · R · W |
| 👤 | 🌳 Дерево | Только активные темы | `tree-active-topics-only` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ✅ Фильтр по статусу темы | L · R · W |
| 👤 | 🌳 Дерево | Ведущие нули в sort | `tree-pad-sort-indexes` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ✅ 001, 002… при сортировке | L · R · W |
| 👤 | 🌳 Дерево | Макс. уровень загрузки | `tree-max-depth` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ✅ Глубина раскрытия дерева 1–12 | L · R · W |

### 🖥️ Интерфейс (`ui`) — user

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 👤 | 🖥️ Интерфейс | Ширина боковой панели | `sidebar-width` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ✅ px 200–520, sync с +/- в меню | L · R · W |
| 👤 | 🖥️ Интерфейс | Закреплённая ветка | `pinned-branch-path` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ✅ folderPath pin в дереве | L · R · W |

### 🔧 Статичные параметры (`static`) — user

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 👤 | 🔧 Статичные | Пример персонального ключа | `user-static-plugin-example` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 👤 | 🔧 Статичные | Ключ 1 | `user-static-example-1` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 👤 | 🔧 Статичные | Ключ 2 | `user-static-example-2` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |
| 👤 | 🔧 Статичные | Ключ 3 | `user-static-example-3` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W (без runtime) |

---

## 🔌 Integrations (плагины) — `.agent-cms/integrations.yml`

Файл схемы: `awn-system/types/settings/integrations.yml` · MCP `scope=integrations` · **заглушка, runtime не подключён**

| Принадлежность | Группа | Название | Ключ | MCP 👁️/✏️ | UI 👁️/✏️ | Описание / эффект | MCP tools |
|----------------|--------|----------|------|------------|-----------|-------------------|-----------|
| 🔌 | 📋 Концепция | Версия модели | `integrations-model-version` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | locked stub-v1 | L · R |
| 🔌 | 📋 Концепция | Как будет работать | `integrations-containers-note` | 👁️✅ ✏️❌ | 👁️✅ ✏️❌ | locked | L · R |
| 🔌 | 🧩 Cursor Skill | Включено | `container-cursor-skill-enabled` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W |
| 🔌 | 🧩 Cursor Skill | Тип | `container-cursor-skill-kind` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W |
| 🔌 | 🧩 Cursor Skill | Путь / пакет | `container-cursor-skill-source` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W |
| 🔌 | 🧩 Cursor Skill | Namespace MCP | `container-cursor-skill-namespace` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W |
| 🔌 | 🔗 MCP bridge | Включено | `container-mcp-bridge-enabled` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W |
| 🔌 | 🔗 MCP bridge | Endpoint | `container-mcp-bridge-endpoint` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W |
| 🔌 | 🔗 MCP bridge | Tools | `container-mcp-bridge-tools` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W |
| 🔌 | 🔗 MCP bridge | Auth token | `container-mcp-bridge-auth-token` | 👁️✅ ✏️✅ | 👁️✅ ✏️✅ | ❌ NOT WORK | L · R · W |

---

## Сводка для проверки

| Область | Всего полей | ✅ runtime | ❌ NOT WORK |
|---------|-------------|-----------|-------------|
| 🌐 Platform | 47 | 32 | 15 |
| 📦 Workspace | 13 | 4 | 9 |
| 🔌 Integrations | 10 | 0 | 10 |
| 👤 User | 11 | 6 | 5 |
| **Итого** | **81** | **42** | **39** |

### MCP tools (общие)

| Tool | Когда |
|------|-------|
| `list_settings` | Все ключи секции; `scope=all\|platform\|workspace\|integrations\|user` |
| `read_setting` | Один ключ: `scope` + `key` |
| `write_setting` | Запись одного ключа; W❌ = readonly; блок при `mcp-mode=readonly` |
| `get_session_context` | Bulk-read platform+workspace при старте чата (не user) |

### API для UI

| Метод | Путь | Scope |
|-------|------|-------|
| GET/POST | `/api/platform/settings-global` | 🌐 |
| GET | `/api/platform/settings-schema` | 🌐 |
| GET/POST | `/api/workspace/settings` | 📦 |
| GET/POST | `/api/integrations/settings` | 🔌 |
| GET/POST | `/api/user/settings` | 👤 |

### Примечания

- **L/R/W** — см. легенду; `key` передаётся в `read_setting` / `write_setting`.
- **Индекс** — после смены политики в UI toast: «пересоберите индексы».
- **Маска исключений** — пример: `awn-repository/ !manifest.md !README.md` (`index-policy.js` → `parseExcludeRuleLine`).
