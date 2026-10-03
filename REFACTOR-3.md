# Рефакторинг — часть 3

Префикс `0-` (план) — **только** системные store внутри `awn-databases/`.  
Имена **`awn-agent-kit`** и **`awn-shared`** — зарезервированные корни workspace, **не переименовываем**.

**✅** — есть в `agent-cms-core` или стабильно автосоздаётся · **❌** — только пресет в коде / в sort, без данных в core.

Справочники для `awn-taxonomy` — **только** `awn-databases/…` (план: `0-taxonomies/…`).  
`awn-agent-kit/taxonomies/…` и `awn-shared/taxonomies/…` — **устарели**, миграция → `/api/platform/catalogs/migrate`.

## Таксономии (`awn-databases`)

| Статус | Slug (сейчас) | Slug (план) |
|--------|---------------|-------------|
| ✅ | `awn-taxonomies` (группа) | `0-taxonomies` |

Подколлекции (`tags`, `categories`, `colors`, …) — **актуальная** модель: CSV в `…/{slug}/main.csv`, ключ в `awn-taxonomy` = slug папки. В refactor меняется только **имя группы**; slug коллекций **без** `0-` (например `0-taxonomies/tags`, не `0-tags`).

Автосид при scaffold группы: **tags, categories, colors** — ✅; остальные коллекции — по необходимости (`priorities` есть в core, `statuses` в sort без папки).

## `awn-agent-kit` (корень без изменений)

| Статус | Slug (сейчас) | Slug (план) |
|--------|---------------|-------------|
| ❌ | `agent` | `0-agent` |
| ❌ | `user` | `0-user` |
| ❌ | `users` | `0-users` |
| ❌ | `agent-rules` (`agent.rules`) | `0-agent-rules` |
| ❌ | `agent-voice-tts` (`agent.voice.tts`) | `0-agent-voice-tts` |
| ❌ | `agent-voice-stt` (`agent.voice.stt`) | `0-agent-voice-stt` |
| ❌ | `devices` | `0-devices` |

Корень kit в **core нет**. Темы service-doc в корне kit — пресеты `SYSTEM_REFERENCE_SCAFFOLDS`.

## `awn-shared` (корень без изменений)

| Статус | Slug (сейчас) | Slug (план) |
|--------|---------------|-------------|
| ❌ | `inbox` | `inbox` |
| ❌ | `notes` | `notes` |
| ❌ | `references` | `references` |
| ❌ | `artefacts` | `artefacts` |
| ❌ | `scripts` | `scripts` |
| ❌ | `media` | `media` |
| ❌ | `context` | `context` |

В **core** только корень. Темы — `SHARED_THEME_PRESETS`, по кнопке; slug пресетов пока **без** `0-`.
