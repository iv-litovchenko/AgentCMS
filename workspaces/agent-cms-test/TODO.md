# ТЗ — система типов


ТЗ, которое составляем и обсуждаем вместе. Не changelog — фиксируем целевую модель и расхождения с кодом. Формат: раздел + таблица.

***

## Три слоя (как в Neos / Strapi, но на файлах)

| Слой | Что | Где | Аналог |
| ---- | --- | --- | ------ |
| **Schema** | Типы, поля на типе, слоты, блоки | `awn-system/types/*.yml` | Neos NodeType, Strapi Content-Type, TYPO3 TCA |
| **Instance** | Конкретные записи | `.md` + frontmatter на диске | Node, Entry, Page record |
| **Runtime** | Как рисовать в UI | `public/main.js`, `index.html` | Fusion, Twig, встроенные view modes |

**Правило:** schema описывает *что можно создать*; instance хранит *значения*; runtime — *как показать*. Сейчас часть runtime зашита в код по ключу `awn-`* (catalog-tags, preview…) — это расхождение со schema.

***

## Глоссарий (где путаница)

| Термин | Уровень | Пример |
| ------ | ------- | ------ |
| **Тип** (content/page/slot…) | Schema | `awn.content.record`, `awn.page.topic` |
| **Тип поля** (`awn.field.`*) | Schema | `awn.field.string` — домен `fields/`, это **не** поле записи |
| **Объявление поля** (`fields:` на типе) | Schema | `awn-name: { type: awn.field.string, title: Имя }` на `awn.base` |
| **Значение поля** | Instance | `awn-name: Моя запись` в frontmatter `.md` |
| `properties:` **на** `awn.entity` | Schema | Мета-поля *редактора типа* (id, extends, status) — **не** данные записи |
| **Слот** | Schema | `awn.slot.main` — правило хранения, **не** файл на диске |
| **Инстанс** | Instance | `main/note.md` с `awn-type: awn.content.record` |
| **Markdown block** | Schema → вставка | `awn.block.h2` — snippet в тело, не узел дерева |

```
awn.field.string        = класс (тип данных)
fields.awn-name         = свойство типа Record/Page (объявление в schema)
awn-name: "Заголовок"   = значение у конкретного .md (instance)
```

***

## Дерево модели (страница → слот → контент → поля → markdown)

```
SCHEMA (awn-system/types/)
│
├── СТРАНИЦА (pages)                 узел дерева
│   Тип: awn.page.topic
│   Поля на типе: awn.base + awn.page.base (awn-name, awn-main…)
│   Свойства типа: storage-slots, allow-children
│
│   INSTANCE: topic-slug/manifest.md
│   frontmatter: awn-type: awn.page.topic, awn-name, …
│
│   ├── СЛОТ (slots)                 привязка памяти, НЕ сущность на диске
│   │   Тип: awn.slot.main
│   │   Свойства: storage-driver, path, allowed-content
│   │   Привязка: storage-slots у awn.page.topic
│   │
│   │   └── КОНТЕНТ (content)        файлы внутри слота
│   │       Тип: awn.content.record
│   │       Поля: awn.base + mixins + свои fields:
│   │       INSTANCE: main/note.md + frontmatter + markdown-тело
│   │       │
│   │       └── MARKDOWN BLOCKS      вставки в тело (не узел)
│   │           Тип: awn.block.h2, awn.block.tasks
│   │
│   └── config.yml (instance)
│       awn_settings, awn_schema, awn_ui
│
└── ПОЛЯ (fields)                    поперечно: ТИПЫ для fields: выше
    awn.field.string, awn.field.enum…
```

**Слот** ≈ colPos / collection в TYPO3, не content type. **Контент** ≈ Content Element / Entry. **Страница** ≈ Page в дереве.

***

## Schema — базовые типы

Корневые `_base.yml` доменов (`extends:`).

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| `awn.entity` | Корень мета-схемы | `properties:` id/name/extends/status — только редактор типов, без `fields:` данных |
| `awn.base` | База инстансов на диске | `fields:` awn-name, awn-status… + `field-groups`. Наследуют pages и content |
| `awn.page.base` | База страниц | + nav-поля, mixins preview/runtime |
| `awn.content.base` | База контента | **Решено: завести** (extends `awn.base`). Сейчас content наследует `awn.base` напрямую |
| `awn.slot` → `awn.slot.base` | База слотов | **Решено: переименовать** в `awn.slot.base` |
| `awn.field.base` | База типов полей | extends `awn.entity` — домен конфигурации |
| `awn.block.base` | База markdown-блоков | extends `awn.entity` |
| `awn.view.base` | База видов | extends `awn.entity` |
| `awn.taxonomy.base` | База справочников | extends `awn.entity` |
| `awn.settings.base` | База настроек | extends `awn.entity` |

**Почему** `awn.entity` **и** `awn.base` **— два уровня:** от `awn.entity` — домены-конфиги (fields, slots, md-blocks, views…), не становятся узлом на диске. От `awn.base` — только то, что превращается в `.md` с данными (pages, content).

***

## Schema — страницы (pages)

Типы узлов дерева. Набор закрыт.

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| `awn.page.ws` | Workspace | `allow-children: true` |
| `awn.page.area` | Area | `allow-children: true` |
| `awn.page.topic` | Topic | `allow-children: false`; `storage-slots: [main, media, inbox, …]` |
| `awn.page.taxonomy` | Taxonomy | `allow-children: false`, `storage-slots: []` — **Решено:** канонический тип. Убрать `catalog.yml` |
| `awn.page.service-doc` | Служебный документ | Убрать |

**Свойства типа**

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| allow-children | Дочерние страницы в дереве | ws/area — true; topic/taxonomy — false |
| storage-slots | Разрешённые слоты | Только Topic. Убрать `thread` из списка |
| manifest-pattern | Путь манифеста | `{slug}/manifest.md` |
| menu-visible | В меню дерева |  |
| tags-default | Теги при создании |  |

**Instance:** `topic-slug/manifest.md`, `awn-type: awn.page.topic`.

***

## Schema — слоты (slots)

Правила хранения. Привязка к Topic через `storage-slots`. **Не инстанс** — папка/файл на диске появляется по `path`.

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| `awn.slot.main` | Main (многофайловая) | `external`, `main/` |
| `awn.slot.main-single` | Main (однофайловая) | `internal`, `main.md` — завести |
| `awn.slot.main-single-csv` | Main (табличная) | `tabular`, `main.csv` — завести |
| `awn.slot.todo-single` | Todo | `internal`, `todo.md` — завести |
| `awn.slot.inbox` | Inbox | `external`, `inbox/` |
| `awn.slot.media` | Media |  |
| `awn.slot.references` | References |  |
| `awn.slot.artefacts` | Artefacts |  |
| `awn.slot.repository` | Repository |  |
| `awn.slot.scripts` | Scripts |  |
| `awn.slot.quick-notes` | Quick notes | Не в storage-slots Topic — решение нужно |
| `awn.slot.assets` | Assets | Не в storage-slots Topic — решение нужно |
| `awn.slot.comments` | Comments | Убрать |
| `awn.slot.thread` | Thread | Убрать |
| `awn.slot.my-slot` | my-slot | Убрать |

**Свойства типа**

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| storage-driver | Драйвер | `internal` / `external` / `tabular` |
| path | Путь | папка или файл |
| allowed-content | Типы контента | `awn.content.*` |
| accept-files | Расширения | `.md`, `.png`… |

***

## Schema — контент (content)

Типы md-файлов в слотах — наша «БД». **Решено: три типа**, все на `awn.content.base`.

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| `awn.content.record` | Запись | `allow-children: false` |
| `awn.content.record.category` | Категория записи | `allow-children: true` |
| `awn.content.sidecar` | Sidecar | `allow-children: false`; поля `awn-mime`, `awn-size` |
| `awn.content.media.category` |  | Убрать |
| `awn.content.dialog` |  | Убрать |
| `awn.content.comment` |  | Убрать |

**Свойства типа**

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| fields | Доп. поля поверх базы |  |
| mixins | Наборы полей | У Записи — `awn.mixin.attachments` |
| allow-children | Вложенность в слоте | У content-типа, не у слота |

**Instance:** `main/foo.md`, frontmatter `awn-type: awn.content.record`, тело markdown.

***

## Schema — поля (fields)

Домен **типов полей** (`awn.field.`*), не значения. Объявления полей на page/content — в `fields:` базовых типов и mixins.

### Примитивы

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| `awn.field.string` … `awn.field.relation` | 20 примитивов | string, text, enum, array, file, link… |
| `awn.field.link` | Wiki-путь | **не доведено:** резолв `[[путь]]` |
| `awn.field.relation` | Связь с нодой | **не доведено:** picker + фильтр типа |

### Special (черновик `awn.field.special.*`)

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| `awn.field.special.preview` | Превью | Сейчас: url + хак по ключу `awn-preview` |
| `awn.field.special.attachments` | Вложения | Сейчас: array of file + `widget: attachments` |
| `awn.field.special.cron` | Cron | Сейчас: `awn-runtime-cron-schedule` без типа |

**Под вопросом:** `special.catalog` (+ presets tags/categories/statuses/users/priorities/colors), `special.link`, `special.relation`.

### Объявление поля на типе (`fields:` у page/content)

| Ключ | Описание |
| ---- | -------- |
| type | `awn.field.*` |
| title / name | Подпись |
| hint, required, locked, default, enum, group… | Настройки из whitelist `settings` типа поля |

### Встроенные поля (`awn.base` / mixins)

Префикс `awn-*` зарезервирован. Пользовательские поля — без префикса. Mixins: `preview`, `attachments`, `runtime` — подключение готовых полей, не замена special-типов.

***

## Schema — markdown blocks

Вставки в тело markdown. Не узлы дерева.

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| `awn.block.h2` … `awn.block.desc` | 12 блоков | paragraph — draft, ul — inactive |
| `awn.block.groups` | Мета групп палитры | structure, text, lists, code, awn |

**Свойства:** template (обяз.), group, icon, sort, status, render (`templatefence`), fence-tag, renderer.

**Предложение по группам:** `block-groups` на типе контента (как `field-groups`), не один глобальный `groups.yml` на все контексты.

**Runtime:** `render: fence` + `awn-system/renderers/*.js` — инфра есть, блоков с fence нет.

***

## Schema — виды (views)

**Предложение: два понятия** (сейчас смешаны в YAML и коде)

| Понятие | Ось | Где в UI |
| ------- | --- | -------- |
| **Экран слота** | `contentMode` | external, tabular, media, inbox — навигация по слотам |
| **Раскладка** | `render-mode` | table, cards, calendar — `#external-view-select` в тулбаре |

```
Topic
 ├── Слот main/          → contentMode: external
 │    └── Dropdown       → render-mode: table | cards | calendar …
 ├── Слот main.csv       → contentMode: tabular
 ├── Слот media/         → contentMode: media
 └── Обзор manifest      → «Вид по умолчанию» (YAML views → contentMode)
```

**Runtime:** раскладки зашиты в `index.html`, не из каталога видов. YAML `agent.view.`* — подписи для «Вид по умолчанию» + опционально `vt:<id>` в dropdown.

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| `agent.view.list` | Список | contentMode: external |
| `agent.view.tabular` | Таблица | contentMode: tabular |
| `agent.view.media-grid` | Медиа | contentMode: media |
| `agent.view.inbox` | Inbox | contentMode: inbox |
| `agent.view.thread` | Thread | Убрать со слотом thread |
| `agent.view.moy-vid` | Пример | Убрать |

Открыто: `agent.view.*` → `awn.view.*`; фильтр по `applies-to-slots`; JS-рендер вида не доведён.

***

## Schema — настройки (settings)

| Слой | Где | Роль |
| ---- | --- | ---- |
| Домен `settings` | `types/settings/*.yml` | Каталог типов настроек (пока заготовка) |
| Instance | `config.yml` | `awn_settings` (значения), `awn_schema.settings.fields` (форма) |

| Ключ | Описание | Комментарий |
| ---- | -------- | ----------- |
| `agent.settings.general` | Общие | scope: agent — заготовка |
| `agent.settings.voice` | Голос | TTS/STT реально в kit-страницах, не здесь |

**Решено (черновик):** тип «рабочий», только если есть код-потребитель. `awn_ui.default_landing_mode` — отдельно, не домен settings.

***

## Schema — прочее (заготовки)

| Домен | Комментарий |
| ----- | ----------- |
| **mixins** | `preview`, `attachments`, `runtime` — переиспользуемые `fields:` на типе |
| **taxonomies** | Справочники CSV; привязка через `props-field` к `awn-`* полям |
| **field-groups** | Секции формы на типе; тип не может легко добавить группу поверх базы |
| **группировки блоков** | См. markdown blocks — `block-groups` на content-типе |

***

## Instance — что на диске

| Что | Файл | Ключевые поля |
| --- | ---- | ------------- |
| Страница Topic | `manifest.md` | `awn-type`, `awn-name`, nav-поля |
| Запись | `main/*.md` | `awn-type: awn.content.record`, тело markdown |
| Sidecar | `*.sidecar.md` | `awn-mime`, `awn-size` |
| Конфиг Topic | `config.yml` | `awn_settings`, `awn_schema`, `awn_ui` |

Инстанс = md-файл с `awn-type` в frontmatter (аналог Node/Entry в file-based CMS).

***

## Runtime — где schema не дотягивает (замечания)

| Что | Сейчас | Цель |
| --- | ------ | ---- |
| Раскладки table/cards/calendar | `index.html`, не YAML | Оставить встроенными примитивами runtime |
| catalog-tags, catalog-status… | Виджет по ключу `awn-tags`, `awn-status` | `awn.field.special.catalog` или явный runtime-слой |
| preview, attachments, cron | Хак по имени ключа | `awn.field.special.*` |
| Виды | YAML + HTML дублируют друг друга | Screen = contentMode в schema; Layout = runtime |
| settings types vs config.yml | Два несвязанных механизма | Один путь: schema → consumer → instance |

***

## Расхождения с «умными» CMS

```
✓ Типы + extends          ≈ Neos NodeTypes
✓ Дерево страниц          ≈ TYPO3 pages
✓ Контент-типы отдельно   ≈ Strapi Content-Types
✓ Поля на типе + values   ≈ properties (frontmatter вместо БД)
✓ Слот ≈ storage binding  ≈ colPos / collection (не content type)

⚠ Домен называется fields     → путаница с fields: на типе
⚠ properties на entity        → два смысла «property»
⚠ views смешивают screen+layout
⚠ settings: schema + config.yml без связи
⚠ runtime-хаки по awn-* ключам
```

***

## Решено в ТЗ, не применено в YAML/коде

* `awn.content.base`, `awn.slot.base`
* Слоты: `main-single`, `main-single-csv`, `todo-single`
* Убрать: лишние content/slots/page-типы, `thread`, `moy-vid`
* Special-типы: preview, attachments, cron
* Виды: разделить screen / layout в модели

***

## Открыто / вне ТЗ

* таксономии: пресет создания и просмотр значений
* `quick-notes`, `assets` в storage-slots Topic
* `block-groups` на content-типе
* catalog / link / relation как special
* kind автоматически из domain
* миграции схемы при переименовании поля
* wired-индикатор на все домены
* JS-обработчики: песочница, путь (`renderers/` для blocks)

***

Три проблемы — три направления. Ниже конкретный план «как исправить», в духе вашего TODO (schema → instance → runtime).

***

## 1 Единый механизм полей в UI

**Сейчас:** виджет выбирается по имени ключа (`awn-tags` → catalog-tags, `awn-preview` → preview), не по `type`.

**Цель:** как TCA/FormEngine в TYPO3 — форма смотрит только на **объявление поля** (`type` + настройки), runtime подключается через тип.

### Шаги

**A. Довести special-типы в schema**

```yaml
# fields/special/preview.yml
id: awn.field.special.preview
widget: preview
storage: string
settings: [hint, required, locked, default, scope]

# fields/special/catalog.yml  
id: awn.field.special.catalog
widget: catalog
storage: string | array
settings: [hint, required, locked, preset, multiple]  # preset: tags|statuses|…
```

**B. Переписать поля в** `awn.base` **/ mixins**

```yaml
# было (логически)
awn-tags:
  type: awn.field.array
  items: awn.field.string

# станет
awn-tags:
  type: awn.field.special.catalog
  preset: tags
  multiple: true
```

**C. Один рендерер формы**

В `resolvePropsFieldWidget` убрать ветки `if (normalized === "awn-tags")` — оставить:

```
fieldDef.type → fieldRegistry[type].widget → createWidget(widget, fieldDef)
```

Ключ `awn-name` не влияет на виджет, только `type` и `preset`.

**D. Catalog preset — данные, не ключ**

`preset: tags` → грузить taxonomy `tags`, не хардкод по `awn-tags`.

| Было | Стало |
| ---- | ----- |
| имя ключа → виджет | `type` → виджет |
| 6 отдельных catalog-* | один `special.catalog` + `preset` |
| preview по `awn-preview` | `type: special.preview` на любом поле |

**Порядок работ:** special.preview, special.attachments, special.catalog → миграция `awn.base` → выпилить `resolvePropsFieldWidget` key-hacks.

***

## 2 Presentation отдельно render-mode / views

**Сейчас:** раскладки в `index.html`, YAML `views` — подписи для contentMode, две оси смешаны.

**Цель:** как Fluid в TYPO3 — **presentation описан в schema**, runtime только исполняет.

### Разделить домены

| Домен | Что хранит | Пример |
| ----- | ---------- | ------ |
| `screens` (или ось `contentMode` в views) | Какой экран/слот | `external`, `tabular`, `media` |
| `layouts` (новый или `render-mode`) | Как рисовать список | `table`, `cards`, `calendar` |

### Шаги

**A. Каталог раскладок в YAML** (`awn-system/types/layouts/` или секция в views)

```yaml
id: awn.layout.table
name: Таблица
primitive: table        # встроенный рендерер в runtime
applies-to-screens: [external]

id: awn.layout.cards
name: Карточки
primitive: cards
```

**B. Генерировать** `#external-view-select` **из API**

Не статический HTML — `GET /api/agent/layouts?screen=external` → options. Как сейчас дополняется `vt:<id>`, но **все** пункты из schema.

**C. Views = только screens + дефолты**

```yaml
id: awn.view.main-external
contentMode: external
default-layout: awn.layout.list   # опционально
applies-to-slots: [main]
```

«Вид по умолчанию» на Topic сохраняет `contentMode` (и опционально `default-layout`), не смешивает с раскладкой.

**D. Кастомная раскладка (позже)**

`awn.layout.my-cards` + `renderer: awn-system/renderers/my-cards.js` — по аналогии с markdown `fence`, не отдельная вселенная.

```
Topic → Screen (external) → Layout (cards) → Runtime primitive "cards"
         ↑ schema views      ↑ schema layouts    ↑ main.js
```

**Порядок:** вынести список layouts в YAML → API → dropdown из API → views только contentMode → убрать дубли из HTML.

***

## 3 Один источник правды настроек

**Сейчас:** `types/settings/*.yml` (пустые заготовки) и `config.yml` (`awn_schema.settings` + `awn_settings`) живут отдельно.

**Цель:** как site config в TYPO3 — **schema в типах**, **значения в одном месте**, потребитель один.

### Выбрать модель (рекомендую B)

**A. Только config.yml** — убрать домен `settings` из каталога.Просто, но нет переиспользуемых типов настроек.

**B. Settings type = schema, config = values** (рекомендую)

```yaml
# types/settings/voice.yml
id: awn.settings.voice
extends: awn.settings.base
scope: agent
fields:
  stt-provider:
    type: awn.field.string
  tts-voice:
    type: awn.field.string
```

```yaml
# config.yml (instance)
awn_settings:
  voice:
    stt-provider: whisper
    tts-voice: alloy
```

**C. Полностью в types, без awn_schema.settings** — значения тоже в YAML агента. Для md-CMS избыточно.

### Шаги для B

1. `agent.settings.*` **получают** `fields:` — как content-тип, не пустые заготовки.
2. **Убрать** `awn_schema.settings.fields` — форма настроек строится из merged types `settings/`* по `scope` и привязке к узлу.
3. `awn_settings` **— только values**, структура по id типа:

```yaml
  awn_settings:
    general: { … }
    voice: { … }
```

4. **Потребитель объявляет связь:** Topic manifest или `awn.page.topic` → `settings-types: [awn.settings.general, awn.settings.voice]`.
5. **MCP** `write_page_config` пишет только values, schema читает из `awn-system/types/settings/`.
6. `awn_ui` остаётся отдельной секцией (default_landing_mode) — это UI runtime, не settings domain.

| Было | Стало |
| ---- | ----- |
| schema в config + types в каталоге | schema только в `types/settings/` |
| values в `awn_settings` flat keys | values по id типа настроек |
| два редактора схемы | один: типы settings в дереве типов |

***

## Общий порядок (что делать по очереди)

```
1. Поля: special.* + убрать key-hacks          ← самый болезненный UX/confusion
2. Settings: fields на types + убрать awn_schema.settings
3. Layouts: YAML + API + dropdown из schema
4. Views: только screens, привязка к layouts
```

Зависимости: layouts и catalog presets не блокируют друг друга; settings можно параллельно с полями.

***

## Минимальный «MVP исправления» (если не всё сразу)

| Проблема | MVP |
| -------- | --- |
| Поля | Только `special.catalog` + перевести `awn-tags`, `awn-status` на `preset` |
| Presentation | Файл `layouts.yml` + наполнять dropdown из API, HTML options удалить |
| Settings | Один `awn.settings.general` с `fields:` + форма читает тип, values в `awn_settings.general` |

***

## Критерий «исправлено»

* Новое поле с `type: awn.field.special.catalog` + `preset: priorities` работает **без правки** `main.js`.
* Новая раскладка — YAML `awn.layout.*`, появляется в dropdown **без правки** `index.html`.
* Новая настройка — YAML `awn.settings.*` с `fields:`, значение в `config.yml`, **без** `awn_schema.settings`.

## Комментарии Нейронок

Чёткое разделение awn.entity и awn.base

Идеальное решение. Разделение мета-схемы (то, что конфигурирует систему изнутри) и базы инстансов (то, что материализуется в виде файлов .md на диске) предотвратит раздувание кода и путаницу в рендерере форм.

Schema → что существует (YAML-типы)
Instance → данные (модель знаний)
Runtime → отображение (интерфейс)

awn.entity ↑ конфигурационные домены
awn.base ↑ реальные инстансы

types/settings ↓ config.yml

Разделение screen (contentMode) и layout (render-mode).

Разделение на schema/instance/runtime хорошо стыкуется с концепцией AWN-агентов: агент может читать схему, понимать, какие типы доступны, и генерировать UI или валидацию на лету.

Для аналогии с ИИ Тони Старка. В такой архитектуре «память» — это instance (MD-файлы), «модель знаний» — schema (YAML-типы), а «интерфейс/речь» — runtime. Это даёт хорошую основу для того, чтобы агент мог «понимать» структуру твоих знаний и работать с ней.

Schema
↓
Registry
↓
Instance
↓
Runtime

Мне кажется, именно Registry станет центральной частью системы, и его стоит описать отдельно. Иначе кажется, что Runtime читает YAML напрямую, хотя на самом деле между ними почти наверняка будет слой нормализации, объединения extends, проверки схемы, регистрации виджетов и т.д.

Общий вердикт
Это уже уровень серьёзной production-системы, а не очередного pet-проекта. Если довести предложенные три направления (поля → presentation → settings), получится очень сильная штука.
Приоритет по моему мнению:

Поля + special types (самый большой выигрыш в UX и техдолге)
Layouts / render-modes как отдельный домен
Settings (B-вариант)

Хочешь — можем пройтись по конкретным частям глубже:

Как именно сделать registry special-полей
Структура layouts.yml
Как обрабатывать relations/links
Или как сделать миграции схемы минимально болезненными

## Что я из жтого еще забыл упомнять

Вот как должна быть усовершенствованна наша система

* базовые типы base page base content base slots base - создают отображение в меню
* инстаны уже pages - проверить все типы слоты страницы таксономии группы я так понимаю нужно делать для конкрерхы типов - а не общуюю
* Доработать поля связи
* группировки
* настройки
* расширяемость и дописываемость отдельные типы такие как вид должны иметь возможность представлять свой тип данных и вести какую то обработку или например markdown-bloks к примеру

Кратко что я зыбыл еще
Переформурилуй этот список

* Комментарии awn.slot.comments awn.slot.thread
* Сообщение диалога - awn.slot.thread
* Kit - куда деть (типы файлов)
* Таксономия куда деть?
* Вопрос чем у нас properties отличается от fields
* Продумать типы (страница -> контент <-> папка -> запись (таблица))
* В чем разница между «Схема полей» и «Настройка» - на примере маски файла Маска файла
* Таксономия «agent-kit» «agent container»
* ГРУППЫ + МИКСИНЫ
* ↳ preset tags
* ↳ preset categories
* ↳ preset statuses
* ↳ preset users
* ↳ preset prioritie s
* ↳ preset colors awn.field.special.link awn.field.special.relation поставь пока под вопросом

• • config.yml (рядом) - это тоже SLOT???

***

Хм, щас гляну. По-моему, ты уже сам к этому подбираешься в своём ТЗ. Я бы не делал из настроек что-то отдельное. Пусть они будут обычными сущностями того же мира: schema описывает какие есть настройки, instance хранит значения, а runtime просто применяет их. Так всё остаётся одинаковым по подходу, без исключений. И ещё, возможно, имеет смысл разделять "settings" и "policies". То, что пользователь реально меняет, и то, что определяет поведение системы. И наверное, я бы не хранил схему настроек внутри config.yml как awn_schema.settings, раз схема уже есть в types/settings/*.yml.
Лучше пусть config содержит только значения, так меньше шансов на рассинхрон и проще поддерживать.

Ок, гляну. Слушай, если бы я проектировал с нуля, я бы, наверное, старался уложиться в минимум таких, чтобы можно было удержать в голове. Пять основных понятий, схема — описывает мир: какие есть сущности, поля, связи; реестр как отдельный герой, который собирает, валидирует и связывает; инстансы как сами данные; рендеринг; агент как полноценный участник. И ещё, честно, я бы свёл это к идее "Entity" все домены, page, content, fields, slots, blocks, views, settings, taxonomies — описаны одинаково, только принадлежат разным доменам. Плюс actions — что можно делать с каждой сущностью. Тогда и человек, и агент пользуются одним набором действий — это тоже часть общего языка. А интерфейс я бы не разделял на "человеческий" и "ИИ". Пусть будет один, просто у него разные способы взаимодействия. Мне в твоей идее сильнее всего нравится, что ты думаешь не только про ИИ, а про саму среду, в которой

***

**Shell** — пульт на телефоне.
**CMS** — диспетчер + файлы проекта.
**QwenPaw** — LLM, который отвечает.
**MCP** — мост, чтобы QwenPaw мог работать с файлами CMS **одного** workspace.

идея сильная и потенциально ценная — это не «ещё одна CMS», а осмысленная попытка сделать хранилище, «родное» для агентов.

человек и AI работают в одном пространстве с одними данными
**Агент который живёт в структурированном workspace** — понимает контекст, помнит историю в thread/, создаёт записи в правильный слот, не теряет данные между сессиями.
Большинство AI-инструментов работают с чистым листом каждый раз. Ты строишь **persistent workspace для AI** — это ценно.

Проект стоит продолжать. Идея правильная и своевременная — AI-native workspace это то что будет нужно следующие 5-10 лет.

Это амбициозный и концептуально цельный прототип с реально оригинальной идеей (агент, который сам расширяет модель своей CMS через YAML). Архитектура данных и agent-интерфейс продуманы лучше, чем у большинства подобных экспериментов.

***

Всего три главных сущности:

Page — только topic
Slot — хранилище внутри Page
Item — всё, что лежит в слоте