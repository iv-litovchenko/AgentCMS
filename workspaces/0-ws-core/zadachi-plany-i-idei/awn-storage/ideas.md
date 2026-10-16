# Идеи из `data/` — что забрать в проект

> Черновик анализа: папка `data/` — прототип из первого коммита. Сейчас приложение её **нигде не читает** (ни `server.js`, ни `public/main.js`, ни MCP). Но в ней уже заложены полезные идеи, которые хорошо ложатся на текущую архитектуру Agent CMS.

---

## Что там есть

| Файл | Суть |
|------|------|
| `index.json` | Каталог разделов: Agents, Knowledge, Workflows, Settings |
| `agents/editor-agent.yaml` | Персона агента: model, role, prompt, tools, limits |
| `agents/support-agent.yaml` | То же для саппорта |
| `workflows/publish-flow.yaml` | Многошаговый пайплайн: draft → review → publish |
| `settings/global.yaml` | Глобальные настройки: theme, locale, defaultModel |
| `knowledge/product-guide.md` | **Отсутствует** — в `index.json` есть ссылка, папки нет |

---

## Идеи, что можно забрать

### 1. Разделить «workspace» и «персону агента»

Сейчас `awn-agents.json` описывает только **где лежит мир** (путь, среда, active). YAML в `data/agents/` описывает **как агент ведёт себя** (промпт, инструменты, лимиты).

**Идея:** workspace = данные, persona = поведение. Один workspace может иметь несколько ролей (editor, support, reviewer). Это ближе к реальному использованию, чем «один агент = одна папка».

### 2. Workflow-движок поверх `awn-status`

`publish-flow.yaml` уже задаёт хороший скелет:

```yaml
steps:
  - id: draft    → actor: editor-agent  → prepare_draft
  - id: review   → actor: human         → approve_content
  - id: publish  → actor: support-agent → publish_to_channel
```

Это напрямую стыкуется с `awn-status` из `awn-types` (🟡 Черновик → человек → 🟢 Открыта). Можно сделать первый workflow «публикация темы» без БД — чисто на YAML + статусы в `_registration.md`.

### 3. `index.json` как навигационный каталог

Структура `sections → items → path` — готовый формат для:

- новой панели «Система» в UI (агенты, воркфлоу, настройки);
- MCP-инструмента `list_platform_config`;
- автогенерации документации.

По сути это file-based CMS **для самой платформы**, зеркало того, что workspaces делают для контента.

### 4. `settings/global.yaml` вместо разрозненных настроек

Сейчас theme/locale/model размазаны по localStorage и хардкоду. Один YAML в корне — единый источник правды для:

- дефолтной модели LLM;
- локали UI;
- темы;
- позже — MCP endpoints, лимитов токенов.

### 5. Слой Knowledge отдельно от workspaces

`data/knowledge/` — статическая база знаний платформы (гайды, FAQ, product docs), не привязанная к конкретному агенту. Отлично ложится на:

- `support-agent` с `tools: [file_search, faq_lookup]`;
- RAG без засорения пользовательских workspaces;
- кнопку **DOC** — часть доков можно вести именно здесь.

### 6. Типизация через `awn-types`

Из `data/` можно вывести новые компоненты в `awn-types/`:

| Прототип в `data/` | Новый тип в `awn-types` |
|--------------------|-------------------------|
| `agents/*.yaml` | расширить `agent.yml`: `model`, `prompt`, `tools`, `limits` |
| `workflows/*.yaml` | `workflow.yml`: `steps`, `actor`, `action`, `retry` |
| `settings/global.yaml` | `platform-settings.yml` |

Тогда YAML в `data/` станет **экземпляром схемы**, а не просто примером.

---

## Что стоит сделать в первую очередь

### Быстрые победы (1–2 дня)

1. Починить битую ссылку — создать `data/knowledge/product-guide.md` или убрать из `index.json`.
2. Подключить чтение `data/index.json` в API (`GET /api/platform/catalog`).
3. Расширить `awn-types/components/agent.yml` полями из YAML-агентов.

### Средний срок

4. Workflow «черновик → ревью → публикация» на статусах `awn-status`.
5. UI-панель «Платформа» по каталогу из `index.json`.
6. Привязка MCP persona к `data/agents/*.yaml` (не только workspace path).

### Долгосрочно

7. Полноценный workflow engine (retry, branching, human-in-the-loop).
8. Knowledge layer с поиском для support-agent.

---

## Главный вывод

`data/` — это **задуманная, но не подключённая** конфигурационная плоскость платформы. Сейчас проект живёт на `workspaces/` + `awn-types/`, а `data/` описывает слой **поведения агентов, процессов и глобальных настроек**.

Самая ценная идея — не копировать файлы как есть, а **развести три слоя**:

```
workspaces/     → контент (что знает агент)
awn-types/      → схемы (как устроены записи)
data/           → платформа (кто действует, как, в каком порядке)
```
