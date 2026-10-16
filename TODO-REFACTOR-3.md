# Рефакторинг — часть 3

**Задача:** единый префикс **`0-`** у **всех системных / preset / platform** slug (папки hub, заготовки UI, встроенные store). Пользовательский контент — **без** префикса `0-`.

**✅** сделано · **❌** не сделано · **⚠️** промежуточно (другой префикс / частично).

**Выбор префикса:** **`0-`** (долгосрок, напр. **`0-agent-kit`**, **`0-inbox`**). Цель — **вверху в Finder/диске** (зона цифр/символов). **Все platform / preset slug — `0-{name}`** на **каждом** уровне пути: секции (`0-shared/0-inbox`), group/store в **`awn-databases/`** (`0-contents/0-facts`, `0-ui/0-home-titles`), без «коротких» детей без префикса.

**Не путать:** slug папок (`0-agent-kit`) и **SQL-имена таблиц** — если понадобятся таблицы с slug, начинающимся с цифры, в MySQL — **отдельный префикс/кавычки** (`0_agent` → `` `0_agent` `` или `t_0_agent`). Внутри store чаще **записи**, не таблицы с именем папки.

**Сортировка в CMS:** slug на диске ≠ порядок в UI. Системные секции — **`pinned`** / **`sort.json`**; пользовательские **`01-slug`, `02-slug`** — разрешены; **чисто цифровой** slug (`009`, `777`) — **запретить** (MySQL + путаница с «номером без имени»).

**Связано:** часть 7 — **`awn-topics/`**, секции **`0-agent-kit`**, **`0-shared`** (§1–§2 ✅). Legacy read-aliases на старые slug и пути.

**Legacy read:** kit — `agent-kit`, `awn-agent-kit`, **`a0-*`**; shared — **`shared/`**, **`awn-shared/`** → канон **`0-*`**.

---

## Правило **`0-`**

| Да (`0-{name}`) | Нет |
| ---------------- | --- |
| Заготовки kit / shared / channel / media | Темы пользователя (`finansy`, `php`, …) |
| Системные group/store в **`awn-databases/`** | Store пользователя (`personal-finance`, …) |
| Экземпляр канала/медиатеки, созданный из **builtin preset** | Кастомный channel `slider`, произвольный repo |
| Локальный **`…/0-agent-kit/0-taxonomies/`** (справочники workspace) | Корни hub: `awn-topics`, `awn-channels`, … |
| **`0-shared/0-inbox`**, **`0-agent-kit/0-agent`**, **`0-contents/0-facts`**, … | Папки **`shared/`**, **`inbox/`**, **`contents/facts`** без `0-` (legacy → **`0-*`**) |

**Зачем:** сортировка **на диске** вверху, один сигнал агенту «platform». В приложении — дополнительно **pinned**.

**Реализация:** slug в **`lib/config/*-presets.js`**, **`SHARED_*_THEMES`** (`server.js`, `public/main.js`), bootstrap kit/shared, **`is*BuiltinSlug`**, MCP hardcoded paths → **aliases** со старых имён (`agent-kit`, `a0-*`, …) на переход.

**Не использовать:** ведущий `-0-…` (URL/slug); **`_0-…`** — ниже по сортировке, хуже читается.

---

## Карта hub (где живут `0-*`)

```
awn-topics/
├── 0-agent-kit/                 … секция (legacy agent-kit/, awn-agent-kit/, a0-agent-kit/)
│   ├── 0-agent, 0-user, 0-users, …
│   └── 0-taxonomies/            … локальные CSV (legacy taxonomies/, catalog/, a0-taxonomies/)
└── 0-shared/                    … секция (legacy shared/, awn-shared/)
    ├── 0-inbox, 0-notes, 0-references, 0-artefacts, 0-scripts, 0-media, 0-downloads, 0-context
    └── …

awn-channels/
└── 0-telegram, 0-forum, …       … все CHANNEL_BUILTIN_PRESETS

awn-media/
└── 0-documents, 0-market, 0-scripts, 0-slider

awn-databases/
├── 0-taxonomies/                … глобальные CSV (быв. taxonomies/, awn-taxonomies)
├── 0-contents/                  … group (быв. contents/)
│   ├── 0-facts/
│   ├── 0-glossary/
│   └── 0-reference/
└── 0-ui/                        … platform UI store (быв. ui/)
    ├── 0-home-titles/
    └── 0-slogans/
```

---

## `awn-topics/0-agent-kit/` ✅ (REFACTOR-3 §1)

| Статус | Slug (было) | Slug (канон **`0-*`**) |
| ------ | ----------- | ---------------------- |
| ✅ | `agent-kit` (секция) | **`0-agent-kit`** |
| ✅ | `agent` | **`0-agent`** |
| ✅ | `user` | **`0-user`** |
| ✅ | `users` | **`0-users`** | scaffold / новые ws |
| ✅ | `agent-rules` | **`0-agent-rules`** | scaffold |
| ✅ | `agent-voice-tts` | **`0-agent-voice-tts`** | scaffold |
| ✅ | `agent-voice-stt` | **`0-agent-voice-stt`** | scaffold |
| ✅ | `devices` | **`0-devices`** |
| ✅ | `taxonomies` | **`0-taxonomies`** |
| ✅ | `catalog` | *(legacy → 0-taxonomies)* | read-alias |
| ✅ | **`a0-*`** (промежуточный шаг) | → **`0-*`** | read-alias |

**Код:** `manifest-paths`, `agent-registry`, identity/voice, **`agent-cms-test`** на диске.

**После деплоя:** restart CMS/MCP + rebuild index.

---

## `awn-topics/0-shared/` ✅ (REFACTOR-3 §2)

| Статус | Slug (было) | Slug (канон **`0-*`**) |
| ------ | ----------- | ---------------------- |
| ✅ | `shared` (секция) | **`0-shared`** | legacy `awn-topics/shared`, `awn-shared/` |
| ✅ | `inbox` | **`0-inbox`** | **`0-shared/0-inbox/`** |
| ✅ | `notes` | **`0-notes`** | scaffold / новые ws |
| ✅ | `references` | **`0-references`** | |
| ✅ | `artefacts` | **`0-artefacts`** | |
| ✅ | `scripts` | **`0-scripts`** | |
| ✅ | `media` | **`0-media`** | |
| ✅ | `downloads` | **`0-downloads`** | **`agent-cms-test`** на диске |
| ✅ | `context` | **`0-context`** | **`always-context-ws-folder`** → `awn-topics/0-shared/0-context/awn-storage/` |

**Как kit:** каждая заготовка shared — **`0-{theme}`**; legacy `inbox/` → read-alias на **`0-inbox`**. Preset в UI (`inbox`) → канон через `resolveSharedThemeCanonicalSlug`.

**Код:** `manifest-paths` (`rewriteLegacyShared*`), `agent-registry`, `SHARED_*_THEMES`, index-policy, settings.

**После деплоя:** restart CMS/MCP + rebuild index.

---

## `awn-channels/` ✅ (REFACTOR-3 §4)

Источник списка: **`lib/config/channel-presets.js`** ↔ **`CHANNEL_BUILTIN_PRESETS`** (`public/main.js`).

| Статус | Пример (было → канон **`0-*`**) |
| ------ | ------------------------------- |
| ✅ | `telegram` → **`0-telegram`**, `forum` → **`0-forum`**, … **все slug** из presets |

Группы каталога (**`CHANNEL_BUILTIN_PRESET_GROUPS`**) — только UI; на диске всегда **`awn-channels/0-…/`**.

**Кастом** без preset — **не** переименовывать автоматически; правило: **preset = `0-`**, custom = на усмотрение (напр. **`slider`** в **`agent-cms-test`**).

**Код:** `channel-presets.js` (`canonChannelPresetSlug`, `CHANNEL_LEGACY_SLUG_TO_CANON`), `rewriteLegacyChannelsInRelPath`, `awn-channels-service` (legacy lookup + `register` → канон), UI (`resolveChannelCanonicalSlug`, `isChannelBuiltinSlug`).

**После деплоя:** `refresh_channels_index_toc` + rebuild index.

---

## `awn-media/` (builtin mediatheques) ✅ (REFACTOR-3 §3)

Источник: **`lib/config/media-library-presets.js`**.

| Статус | Slug (было) | Slug (канон **`0-*`**) |
| ------ | ----------- | ---------------------- |
| ✅ | `documents` | **`0-documents`** |
| ✅ | `market` | **`0-market`** |
| ✅ | `scripts` | **`0-scripts`** | scaffold / новые ws |
| ✅ | `slider` | **`0-slider`** | **`agent-cms-test`** на диске |

**Код:** `media-library-presets.js`, `rewriteLegacyMediaLibraryInRelPath`, `awn-media-service`, UI слайдера, delete/rename 403 для builtin (+ legacy slug).

**После деплоя:** `refresh_media_library_index_toc` + rebuild index.

---

## `awn-databases/` ✅ (REFACTOR-3 §5)

**Правило:** как kit/shared/channels — **каждый** сегмент platform-пути **`0-{name}`**, в том числе дети **group** (`0-contents/0-facts`). Legacy read: `contents/facts` → **`0-contents/0-facts`**, `taxonomies/tags` → **`0-taxonomies/0-tags`**.

| Статус | Путь (было) | Путь (канон **`0-*`**) |
| ------ | ----------- | ---------------------- |
| ✅ | `taxonomies/` | **`0-taxonomies/`** |
| ✅ | `contents/` | **`0-contents/`** | group |
| ✅ | `contents/facts` | **`0-contents/0-facts`** | MCP facts |
| ✅ | `contents/glossary` | **`0-contents/0-glossary`** | MCP glossary |
| ✅ | `contents/reference` | **`0-contents/0-reference`** | справочник |
| ✅ | `taxonomies/tags` … | **`0-taxonomies/0-tags`**, **`0-categories`**, **`0-colors`** | scaffold CSV |
| ✅ | `ui/` | **`0-ui/`** | group (**`agent-cms-core`**) |
| ✅ | `ui/home-titles`, `ui/slogans` | **`0-ui/0-home-titles`**, **`0-ui/0-slogans`** | rotators |

Пользовательские **`finansy`**, **`kollektsiya-1`**, **`priorities`** под group — **без** лишнего `0-` (только platform group/child presets).

**Код:** `database-platform-paths.js`, `rewriteLegacyDatabasesInRelPath`, `awn-data-loader` (scaffold + `storeSchemaExists`), `platform-ui-rotators`, taxonomies bridge, MCP facts/glossary/reference, UI hints.

**После деплоя:** refresh databases index + rebuild index; restart CMS/MCP.

---

## `awn-topics/` (корень тем)

| Статус | Slug (сейчас) | Slug (план) |
| ------ | ------------- | ----------- |
| ✅ | `awn-container` | **`awn-topics`** | REFACTOR-7 §1 |

---

## Slug пользователя (не platform)

| Правило | Пример |
| ------- | ------ |
| ✅ | `finansy`, `01-vvedenie`, `02-praktika` |
| ❌ | `009`, `777` (только цифры) |
| ❌ | `0-agent`, `0-shared`, … (зарезервировано под platform-секции) |

---

## Вне правила `0-` (проверено по проекту)

| Область | Почему не `0-` slug |
| ------- | ------------------- |
| **`awn-repositories/`** | Нет builtin presets; platform-шаблоны — **если появятся → `0-`** |
| **`awn-system/`** | Каталог типов платформы |
| **`awn-dialogs/`**, **`awn-storage/`**, **`.agent-cms/`** | Служебные корни workspace |
| **`awn-dashboards/`**, **`awn-vendor/`**, … | Sidebar roots (имя hub-папки `awn-*`) |
| **`awn-channels/…` кастом** | Не из presets |

---

## Источники правды (что править при миграции)

| Область | Файлы |
| ------- | ----- |
| Channels | `lib/config/channel-presets.js`, `public/main.js` |
| Media | `lib/config/media-library-presets.js`, `lib/services/awn-media-service.js` |
| Shared | `manifest-paths.js` (`rewriteLegacyShared*`), `server.js`, `public/main.js`, `workspace-agent-settings` |
| Agent kit | `lib/agents/agent-registry.js`, `manifest-paths.js`, identity/voice, MCP |
| Databases | `database-platform-paths.js`, `awn-data-loader`, facts/glossary MCP |
| Slug policy | `slug-translit.js`, `create_topic` / rename validation |
| Index / search | `lib/config/index-policy.js`, docs |

---

## Риски

- **Коллизии между hub:** `0-market` в channels и media — **OK** (разный path).
- **Коллизии с user `01-*`:** platform только **`0-{platform-name}`**; user **`01-slug`** — другой паттерн.
- **Finder vs CMS:** `0-*` не гарантирует порядок относительно **`009`** / **`01-slug`** — **pinned** в UI.
- **Объём:** channels (~40) + ws paths + MCP — migration script + rebuild indexes.

---

## Чат (Cursor)

`c2a29c0b-9f8c-49e2-a31d-0bdc4802b609`

Черновик **свойств** (не slug папок): `a-cms-*`, `a-topic`, `a-area` — отдельно от REFACTOR-3.

**Отменено:** префикс **`a0-`** (только legacy alias → **`0-`**).
