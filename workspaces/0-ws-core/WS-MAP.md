# Карта хранилища (WS-MAP)

Собрано: 2026-10-17T19:47:32.258Z
Узлов manifest: 23
Записей в корне (без `awn-*`): 12

Лёгкий реестр **всех** `manifest.md` в workspace (обход диска, не меню и не get_topic_map): ID, статус, тип, путь (до `manifest.md`), название (текст), описание. Для записей внутри темы — `read_content_index_toc` по пути темы. Пересборка: sidebar «Карта», pipeline или MCP `refresh_workspace_map`.

## Корень workspace (без `awn-*`)

Файлы и папки в корне агента, кроме служебных hub-каталогов `awn-*` (они перечислены в таблице manifest ниже).

| Вид | Имя |
| --- | --- |
| файл | `AGENTS.md` |
| файл | `config.yml` |
| файл | `index.json` |
| файл | `INDEX.md` |
| файл | `manifest.md` |
| файл | `NOTE.md` |
| файл | `read-content.json` |
| файл | `read.json` |
| папка | `Resources` |
| файл | `SKILL.md` |
| файл | `sort.json` |
| файл | `TODO.md` |

## Реестр manifest

| ID | Статус | Тип | Путь | Название | Описание |
| ---: | --- | --- | --- | --- | --- |
| — | 🟢 Открыта | awn.hub.topic.ws | `.` | [Memory CMS] Ядро платформы | Ядро платформы — спеки, доки, runtime, интеграции; описано на языке CMS |
| — | — | awn.hub.topic.ws-system | `awn-dashboards/manifest.md` | Дашборды | Кастомные виджеты и раскладки workspace. Виджеты в widgets/, раскладки — в подпапках. |
| — | 🟢 Открыта | awn.hub.database.taxonomy-collection | `awn-databases/0-taxonomies/0-categories/manifest.md` | Категории | Справочник категорий для awn-category |
| — | 🟢 Открыта | awn.hub.database.taxonomy-collection | `awn-databases/0-taxonomies/0-colors/manifest.md` | Палитра | Справочник цветов для awn-color |
| — | 🟢 Открыта | awn.hub.database.taxonomy-collection | `awn-databases/0-taxonomies/0-tags/manifest.md` | Теги | Список тегов workspace — как #tag в Obsidian |
| — | 🟢 Открыта | awn.hub.database.group | `awn-databases/0-taxonomies/manifest.md` | Таксономии (справочники) | Группировка enum-справочников платформы |
| — | 🟢 Открыта | awn.hub.database.collection | `awn-databases/0-taxonomies/priorities/manifest.md` | Приоритеты | Справочник для awn-priority |
| — | 🟢 Открыта | awn.hub.database.collection | `awn-databases/0-ui/0-home-titles/manifest.md` | Заголовки «Главная» | Заголовки ссылки «Главная» (app-home-title-rotator) |
| — | 🟢 Открыта | awn.hub.database.collection | `awn-databases/0-ui/0-slogans/manifest.md` | Слоганы шапки | Цитаты в шапке (header-slogan-rotator) |
| — | 🟢 Открыта | awn.hub.database.group | `awn-databases/0-ui/manifest.md` | UI (интерфейс) | Платформенные строки для шапки |
| 27 | — | awn.hub.repository | `awn-repositories/sayt-platformy-v1/manifest.md` | Сайт платформы v1 | HTML-макет лендинга Agent CMS, версия 1 |
| 28 | — | awn.hub.repository | `awn-repositories/sayt-platformy-v2/manifest.md` | Сайт платформы v2 | HTML-макет лендинга Agent CMS, версия 2 |
| 29 | — | awn.hub.repository | `awn-repositories/sayt-platformy-v3/manifest.md` | Сайт платформы v3 | HTML-макет лендинга Agent CMS, версия 3 (макет с медиа) |
| 8 | 🟢 Открыта | awn.hub.topic | `awn-topics/arhiv-voprosov/manifest.md` | Архив вопросов | — |
| — | 🟢 Открыта | awn.content.category | `awn-topics/dokumentatsii/awn-storage/main/globalnye-dokumentatsii/manifest.md` | Глобальные документации для агентов | — |
| 10 | 🟢 Открыта | awn.hub.topic | `awn-topics/dokumentatsii/manifest.md` | Документации | User docs, Best Practices, Markdown showcase и черновики — в слоте main |
| 32 | — | awn.hub.topic.section | `awn-topics/manifest.md` | Контейнер | — |
| 9 | 🟢 Открыта | awn.hub.topic | `awn-topics/obsuzhdeniya/manifest.md` | Обсуждения | — |
| — | 🟢 Открыта | awn.content.category | `awn-topics/zadachi-plany-i-idei/awn-storage/main/agent-cms-voice/manifest.md` | Agent CMS Voice | — |
| — | 🟢 Открыта | awn.content.category | `awn-topics/zadachi-plany-i-idei/awn-storage/main/drugie-idei/manifest.md` | Другие идеи | — |
| — | 🟢 Открыта | awn.content.category | `awn-topics/zadachi-plany-i-idei/awn-storage/main/kopilot-v-brauzere/manifest.md` | Копилот в Браузере | — |
| — | 🟢 Открыта | awn.content.category | `awn-topics/zadachi-plany-i-idei/awn-storage/main/problemy/manifest.md` | Проблемы | — |
| 11 | 🟢 Открыта | awn.hub.topic | `awn-topics/zadachi-plany-i-idei/manifest.md` | Задачи, планы и идеи | — |
