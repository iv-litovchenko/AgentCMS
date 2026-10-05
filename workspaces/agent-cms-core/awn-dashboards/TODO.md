---
awn-type: awn.page.ws-system
awn-name: TODO · awn-dashboards
---

# Идеи awn-dashboards

Краткая выжимка обсуждения. Не конструктор, а **линзы** на данные CMS.

## Принципы

- **Линзы, не гирлянда** — виджет = короткий взгляд на уже существующие данные; не Notion/Obsidian.
- **Декларативный конфиг** — `home/layout.md` + `widgets/*.md`, без drag-and-drop холста.
- **Открытый `present`** — любая строка; рендеры регистрируются в реестре, не зашиваются в enum.
- **Источники** — internal (TODO, MCP, CSV) и external (API).

## Структура

- `awn-dashboards/home/layout.md` — сетка и список виджетов.
- `awn-dashboards/widgets/*.md` — present, source, позиция `x/y/w/h`.
- **Данные отдельно** — `TODO.md`, store, API; виджет только привязка.
- **Два экрана** — «Дашборд» (карточки тем) и «Дашборд 2» (кастомные виджеты).
- Sidebar-секция после `awn-recycle`.

## Presenters (MVP)

| present | статус |
|---------|--------|
| clock, calendar, stat, list, markdown, chart, activity | готово |
| kanban | заглушка |
| custom | `AwnDashboards.registerPresenter(id, fn)` |

## Дальше

- [ ] UI-каталог виджетов (выбор из набора, не только правка файлов)
- [ ] chart из CSV/MCP, не только JSON в body
- [ ] лимит плотности / anti-garland rules
- [ ] перенести паттерны из Example14 в production

## Чат

**awn-dashboards · линзы и виджеты**

ID: `2a685a24-b310-4030-8c38-5e5d2faf7f19`

Транскрипт: `/Users/macbook/.cursor/projects/Users-macbook-Desktop-YamlCMS/agent-transcripts/2a685a24-b310-4030-8c38-5e5d2faf7f19/2a685a24-b310-4030-8c38-5e5d2faf7f19.jsonl`
