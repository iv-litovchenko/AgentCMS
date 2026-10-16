# Рефакторинг — часть 3

**Задача:** единый префикс **`a0-`** у **всех системных / preset / platform** slug (папки hub, заготовки UI, встроенные store). Пользовательский контент — **без** префикса.

**✅** сделано · **❌** не сделано.

**Связано:** часть 7 — **`awn-topics/`**, **`awn-topics/agent-kit/`**, **`awn-topics/shared/`** (корни ✅). Legacy read-aliases на старые slug и пути.

---

## Правило **`a0-`**

| Да (`a0-{name}`) | Нет |
| ---------------- | --- |
| Заготовки kit / shared / channel / media | Темы пользователя (`finansy`, `php`, …) |
| Системные group/store в **`awn-databases/`** | Store пользователя (`personal-finance`, …) |
| Экземпляр канала/медиатеки, созданный из **builtin preset** | Кастомный channel `slider`, произвольный repo |
| Локальный **`…/agent-kit/a0-taxonomies/`** (справочники workspace) | Корни hub: `awn-topics`, `awn-channels`, … |

**Зачем:** сортировка вверху, **MySQL-safe** идентификаторы (`a0_agent`), один сигнал агенту «platform».

**Реализация:** slug в **`lib/config/*-presets.js`**, **`SHARED_*_THEMES`** (`server.js`, `public/main.js`), bootstrap kit/shared, **`is*BuiltinSlug`**, MCP hardcoded paths → **aliases** со старых имён на переход.

---

## Карта hub (где живут `a0-*`)

```
awn-topics/
├── agent-kit/
│   ├── a0-agent, a0-user, a0-users, …
│   └── a0-taxonomies/          … локальные CSV (быв. taxonomies/, catalog/)
└── shared/
    ├── a0-inbox, a0-notes, … a0-context, a0-downloads
    └── …

awn-channels/
└── a0-telegram, a0-forum, …     … все CHANNEL_BUILTIN_PRESETS

awn-media/
└── a0-documents, a0-market, a0-scripts, a0-slider

awn-databases/
├── a0-taxonomies/               … глобальные CSV (быв. taxonomies/, awn-taxonomies)
├── a0-contents/                 … group (быв. contents/)
│   ├── a0-facts/
│   ├── a0-glossary/
│   └── a0-reference/
└── a0-ui/                       … platform UI store (быв. ui/)
```

---

## `awn-topics/agent-kit/`

| Статус | Slug (сейчас)     | Slug (план)              |
| ------ | ----------------- | ------------------------ |
| ❌      | `agent`           | **`a0-agent`**           |
| ❌      | `user`            | **`a0-user`**            |
| ❌      | `users`           | **`a0-users`**           |
| ❌      | `agent-rules`     | **`a0-agent-rules`**     |
| ❌      | `agent-voice-tts` | **`a0-agent-voice-tts`** |
| ❌      | `agent-voice-stt` | **`a0-agent-voice-stt`** |
| ❌      | `devices`         | **`a0-devices`**         |
| ❌      | `taxonomies`      | **`a0-taxonomies`**      | локальные справочники (не путать с **`awn-databases/a0-taxonomies`**) |
| ❌      | `catalog`         | *(legacy → a0-taxonomies)* | |

**Код:** `get_agent_identity` / `get_user_identity`, voice defaults, `WORKSPACE_TAXONOMY_FOLDER`, scaffolds в **`agent-registry.js`**.

---

## `awn-topics/shared/`

| Статус | Slug (сейчас) | Slug (план)        |
| ------ | ------------- | ------------------ |
| ❌      | `inbox`       | **`a0-inbox`**     |
| ❌      | `notes`       | **`a0-notes`**     |
| ❌      | `references`  | **`a0-references`** |
| ❌      | `artefacts`   | **`a0-artefacts`** |
| ❌      | `scripts`     | **`a0-scripts`**   |
| ❌      | `media`       | **`a0-media`**     |
| ❌      | `downloads`   | **`a0-downloads`** | только в **`SHARED_DEFAULT_THEMES`** (`server.js`) — синхронить с UI |
| ❌      | `context`     | **`a0-context`**   | **`always-context-ws-folder`** → `…/a0-context/awn-storage/` |

**Код:** `SHARED_THEME_PRESETS` (`public/main.js`), `SHARED_DEFAULT_THEMES` (`server.js`), bootstrap shared.

---

## `awn-channels/` (все builtin presets → **`a0-{slug}`**)

Источник списка: **`lib/config/channel-presets.js`** ↔ **`CHANNEL_BUILTIN_PRESETS`** (`public/main.js`).

| Статус | Пример (сейчас → план) |
| ------ | ---------------------- |
| ❌      | `telegram` → **`a0-telegram`**, `forum` → **`a0-forum`**, … **все ~40 slug** из presets |

Группы каталога (**`CHANNEL_BUILTIN_PRESET_GROUPS`**) — только UI; на диске всегда **`awn-channels/a0-…/`**.

**Кастом** без preset (напр. уже созданный `slider`) — **не** переименовывать автоматически; правило: **preset = a0-**, custom = на усмотрение.

---

## `awn-media/` (builtin mediatheques)

Источник: **`lib/config/media-library-presets.js`**.

| Статус | Slug (сейчас) | Slug (план)        |
| ------ | ------------- | ------------------ |
| ❌      | `documents`   | **`a0-documents`** |
| ❌      | `market`      | **`a0-market`**    |
| ❌      | `scripts`     | **`a0-scripts`**   |
| ❌      | `slider`      | **`a0-slider`**    |

**Код:** `isMediaLibraryBuiltinSlug`, delete/rename 403 для builtin.

---

## `awn-databases/` (platform store / group)

| Статус | Путь (сейчас)        | Путь (план)                    |
| ------ | -------------------- | ------------------------------ |
| ⚠️→❌   | `taxonomies/`        | **`a0-taxonomies/`**           | было ✅ `awn-taxonomies`→`taxonomies`; **следующий шаг — a0-** |
| ❌      | `contents/`          | **`a0-contents/`**             | group |
| ❌      | `contents/facts`     | **`a0-contents/a0-facts`**     | MCP facts tools |
| ❌      | `contents/glossary`  | **`a0-contents/a0-glossary`**  | MCP glossary |
| ❌      | `contents/reference` | **`a0-contents/a0-reference`** | справочник |
| ❌      | `ui/`                | **`a0-ui/`**                   | home-titles, slogans, … |

Пользовательские **`finansy`**, **`personal-finance`**, … — **без** `a0-`.

**Код:** `isBuiltinAwnDataGroupRel` (сейчас `top.startsWith("awn-")` — расширить под **`a0-`** group), `awn-data-loader`, **`mcp-server/lib/facts-tools.js`**, **`glossary-tools.js`**, reference tools.

---

## `awn-topics/` (корень тем)

| Статус | Slug (сейчас)   | Slug (план)     |
| ------ | --------------- | --------------- |
| ✅      | `awn-container` | **`awn-topics`** | REFACTOR-7 §1 |

---

## Вне правила `a0-` (проверено по проекту)

| Область | Почему не `a0-` slug |
| ------- | -------------------- |
| **`awn-repositories/`** | Нет **`REPOSITORY_BUILTIN_PRESETS`** — только пользовательские repo/group; platform-шаблоны — **если появятся → a0-** |
| **`awn-system/`** | Каталог типов платформы, не slug темы |
| **`awn-dialogs/`**, **`awn-storage/`** (корень ws), **`.agent-cms/`** | Служебные корни workspace |
| **`awn-dashboards/`**, **`awn-vendor/`**, **`awn-temp/`**, **`awn-scripts/`** | Sidebar/platform roots (имя **hub-папки**, не child preset) |
| **`awn-channels/…` кастом** | Не из `CHANNEL_BUILTIN_PRESETS` |
| **Корневые файлы** | `AGENTS.md`, `SKILL.md` — не папки |

---

## Источники правды (что править при миграции)

| Область | Файлы |
| ------- | ----- |
| Channels | `lib/config/channel-presets.js`, `public/main.js`, `channel-preset-icon-map.js` |
| Media | `lib/config/media-library-presets.js`, `lib/services/awn-media-service.js` |
| Shared themes | `server.js` (`SHARED_DEFAULT_THEMES`), `public/main.js` (`SHARED_THEME_PRESETS`) |
| Agent kit | `lib/agents/agent-registry.js`, identity/voice paths, `mcp-server/lib/agent-utils-tools.js` |
| Databases | workspaces `awn-databases/**`, facts/glossary MCP, UI create-group helpers |
| Index / search | `lib/config/index-policy.js`, hardcoded paths в docs |

---

## Риски

- **Коллизии имён между hub:** `a0-market` в channels и media — **OK** (разные prefix path).
- **Коллизии с legacy:** `a0-notes` (shared theme) vs channel preset `notes` → **`a0-notes`** только в своём hub.
- **Объём:** channels (~40 slug) + workspace paths + MCP — **один migration script** + rebuild indexes.

---

## Чат (Cursor)

`c2a29c0b-9f8c-49e2-a31d-0bdc4802b609`

Черновик **свойств** (не slug папок): `a-cms-*`, `a-topic`, `a-area` — отдельно от REFACTOR-3.
