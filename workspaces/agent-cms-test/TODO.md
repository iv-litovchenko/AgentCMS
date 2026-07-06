# ТЗ — система типов

Это не список доработок задним числом, а ТЗ, которое мы составляем и обсуждаем вместе, по параграфам. Формат: заголовок-раздел + описание + таблица пунктов.

---

## Базовые типы

Базовый тип — корневой YAML для домена (`_base.yml`), от которого наследуются все конкретные типы этого домена (`extends:`). Это первоисточник всего: имя, id и структура базового типа определяют, как называется и наследуется вся семья типов под ним.

| Ключ | Описание | Комментарий |
|---|---|---|
| `awn.entity` | Корень всей системы, domain: base, kind: entity | От него наследуют pages, content, fields, md-blocks и всё остальное |
| `awn.base` | База сущности, domain: base, kind: base, extends `awn.entity` | Общие поля контента и узла (отображение, системные) |
| `awn.page.base` | База страниц, domain: pages | |
| `awn.content.base` | База контента, domain: content | **Решено: завести.** Сейчас файла `_base.yml` у домена `content` нет — Запись/Категория записи/Sidecar наследуют `awn.base` напрямую. Нужно создать `awn.content.base` (extends `awn.base`) и перевести все три типа на него |
| `awn.slot` | База слотов, domain: slots | **Решено: переименовать в `awn.slot.base`** — для единообразия с паттерном `awn.<домен>.base` (сейчас единственное исключение без суффикса `.base`) |
| `awn.field.base` | База полей, domain: fields | |
| `awn.view.base` | База видов, domain: views | |
| `awn.taxonomy.base` | База справочников, domain: taxonomies | |
| `awn.block.base` | База markdown-блоков, domain: md-blocks | |
| `awn.settings.base` | База настроек, domain: settings | |

**Почему `awn.entity` и `awn.base` — два разных уровня, а не дублирование:** `awn.entity` не содержит `fields:`, только мета-схему («из чего состоит любая декларация типа»: id/name/description/extends/status/kind). `awn.base` добавляет поверх настоящие data-поля контента (awn-name, awn-status, awn-tags, awn-create, awn-update, awn-version). От `awn.entity` напрямую наследуют домены-конфигурации, которые сами являются декларацией, но не становятся узлом на диске: `fields`, `taxonomies`, `md-blocks`, `views`, `settings`, `slots`. От `awn.base` наследуют только те, кто реально превращается в файл/узел на диске: `pages` и `content`. Если убрать `awn.base` и оставить один `awn.entity` — все 6 доменов-конфигов получат ненужные им поля `awn-name/awn-tags/awn-status/...`.

---

## Типы страницы

Конкретные типы домена `pages` (наследуют `page-base`). Добавлять новые можно, но особого смысла пока нет — набор закрыт.

| Ключ | Описание | Комментарий |
|---|---|---|
| `awn.page.ws` | Workspace | `allow-children: true` — дочерние страницы (area, topic, taxonomy…) |
| `awn.page.area` | Area | `allow-children: true` — дочерние страницы (topic, taxonomy…) |
| `awn.page.topic` | Topic | `allow-children: false` — не может содержать дочерние страницы (topic внутри topic); `storage-slots: [main, media, inbox, …]` |
| `awn.page.taxonomy` | Taxonomy (он же справочник) | `allow-children: false`, `storage-slots: []` — **Решено: один тип.** Канонический — `awn.page.taxonomy`. Убрать `catalog.yml`, поправить 2 манифеста |
| `awn.page.service-doc` | ~~Служебный документ~~ | Решено: не нужен как тип страницы — убрать из набора / переклассифицировать |

**Свойства**

| Ключ | Описание | Комментарий |
|---|---|---|
| allow-children | Разрешены ли дочерние страницы в дереве | Workspace, Area — `true` (могут содержать topic, taxonomy и др.). Topic, Taxonomy — `false` (topic не может содержать topic) |
| storage-slots | Какие слоты памяти разрешены у страницы | Только у Topic. Список ключей слотов: main, media, inbox, thread, references, scripts, artefacts, repository (убрать `thread`). У Taxonomy — `[]` |
| menu-visible | Показывать ли тип в дереве меню | |
| manifest-pattern | Путь к файлу манифеста | Например `{slug}/manifest.md` |
| tags-default | Теги по умолчанию при создании узла | |

---

## Content

Это всё про md-файлы — по сути наша база данных. **Решено: оставляем три, все наследуются от `awn.content.base`** (extends `awn.base`).

| Ключ | Описание | Комментарий |
|---|---|---|
| `awn.content.record` | Запись | `allow-children: false` — лист, не содержит дочерних элементов |
| `awn.content.record.category` | Категория записи | `allow-children: true` — раздел, может содержать записи внутри |
| `awn.content.sidecar` | Sidecar | `allow-children: false` |
| ~~`awn.content.media.category`~~ | Категория медиа | Убрать — дублирует «Категорию записи» |
| ~~`awn.content.dialog`~~ | Сообщение диалога | Убрать |
| ~~`awn.content.comment`~~ | Комментарий | Убрать |

**Свойства**

| Ключ | Описание | Комментарий |
|---|---|---|
| fields | Собственные дополнительные поля типа поверх базовых | У Sidecar — `awn-mime`, `awn-size` |
| mixins | Подключение общего набора полей | У Записи — `awn.mixin.attachments`, добавляет `awn-attachments` |
| allow-children | Разрешены ли дочерние элементы в многофайловой памяти | Определяется у content-типа, не у слота. Категория — `true`; Запись, Sidecar — `false` |

---

## Слоты памяти

Конкретные типы домена `slots` (наследуют `awn.slot` / будущий `awn.slot.base`). Слоты привязываются только к страницам — свойство `storage-slots` есть только у `awn.page.topic`.

| Ключ | Описание | Комментарий |
|---|---|---|
| `awn.slot.main` | Main (многофайловая) | `storage-driver: external`, `path: main/` — есть в типах |
| `awn.slot.main-single` | Main (однофайловая) | `storage-driver: internal`, `path: main.md` — завести |
| `awn.slot.main-single-csv` | Main (табличная) | `storage-driver: tabular`, `path: main.csv` — завести |
| `awn.slot.todo-single` | Todo | `storage-driver: internal`, `path: todo.md` — завести |
| `awn.slot.inbox` | Inbox | `storage-driver: external`, `path: inbox/` |
| `awn.slot.quick-notes` | Quick notes | Быстрые заметки — не привязан к Topic, решение нужно |
| `awn.slot.references` | References | Ссылки и источники |
| `awn.slot.artefacts` | Artefacts | Артефакты и экспорты |
| `awn.slot.repository` | Repository | `storage-driver: external`, `path: repository/`, `allowed-content: [awn.file]`, `accept-files: [*]` — есть в типах |
| `awn.slot.scripts` | Scripts | Скрипты и автоматизация |
| `awn.slot.assets` | Assets | Вложения и вставки — не привязан к Topic, решение нужно |
| `awn.slot.media` | Media | Медиа-файлы и sidecar |
| ~~`awn.slot.comments`~~ | Comments | Убрать |
| ~~`awn.slot.thread`~~ | Thread | Убрать |
| ~~`awn.slot.my-slot`~~ | my-slot | Убрать |

**Свойства**

| Ключ | Описание | Комментарий |
|---|---|---|
| storage-driver | Драйвер памяти | `internal` / `external` / `tabular` |
| path | Куда кладётся контент | `external` — папка (`main/`, `media/`); `internal` — файл (`main.md`); `tabular` — файл (`main.csv`) |
| allowed-content | Разрешённый контент | Список `awn.content.*` типов, которые можно класть в слот |
| accept-files | Принимаемые файлы | Список расширений (`.md`, `.png`, `.sidecar.md`…) |

---

## Группировки — делать для конкретных типов, а не общую

| Ключ | Описание | Комментарий |
|---|---|---|
| field-groups | Группы полей внутри формы | Сейчас: заданы в `awn.base`, наследуются, поля ссылаются через `group:` — уже "по типу", но конкретный тип не может добавить свою группу поверх базовой |
| `awn.block.groups` | Группы палитры markdown-блоков | Сейчас: один общий список (structure/text/lists/code/awn) на все контексты. Нужно — группы, зависящие от типа/контекста |

---

## Поля

Домен `fields` — типы данных для свойств контента и страниц. Наследуют `awn.field.base` (extends `awn.entity`): это декларации, не узлы на диске. В схеме типа (`fields:` у content/page) поле ссылается на `awn.field.*` и задаёт свои настройки из whitelist `settings` этого типа.

**Примитивы** (домен `fields`, `fields/*.yml`)

| Ключ | Описание | Комментарий |
|---|---|---|
| `awn.field.string` | Строка | widget: input, storage: string |
| `awn.field.text` | Текст (многострочный) | widget: textarea |
| `awn.field.markdown` | Markdown с превью | widget: markdown |
| `awn.field.slug` | URL-слаг | widget: slug |
| `awn.field.email` | Email | widget: email |
| `awn.field.url` | Внешняя ссылка | widget: url |
| `awn.field.integer` | Целое число | widget: number, storage: number |
| `awn.field.number` | Число с дробной частью | widget: number |
| `awn.field.boolean` | Логическое (да/нет) | widget: checkbox, storage: bool |
| `awn.field.date` | Дата | widget: date, format: YYYY-MM-DD |
| `awn.field.datetime` | Дата и время | widget: datetime, format: ISO-8601 |
| `awn.field.color` | Цвет #RRGGBB | widget: color |
| `awn.field.enum` | Одно из списка | widget: select (или radio через переопределение widget) |
| `awn.field.array` | Несколько из списка | widget: checkbox (или select-multiple) |
| `awn.field.tags` | Свободные теги | widget: tags, storage: array |
| `awn.field.file` | Файл / вложения | widget: file |
| `awn.field.image` | Изображение | widget: image |
| `awn.field.json` | JSON-редактор | widget: json |
| `awn.field.link` | Связь по пути | widget: link, значение `[[путь]]` — **не доведено:** нет резолва и подсветки битых ссылок |
| `awn.field.relation` | Семантическое отношение | widget: relation — **не доведено:** нет выбора целевого типа и списка нод |

**Специальные типы** — отдельная семья с собственным виджетом и логикой, не примитив + хак по имени ключа `awn-*`. Именование `awn.field.special.*` — черновик.

| Ключ | Описание | Комментарий |
|---|---|---|
| `awn.field.special.preview` | Превью-изображение | **Сейчас:** `awn.field.url` + виджет по ключу `awn-preview` |
| `awn.field.special.attachments` | Вложения (список файлов) | **Сейчас:** `awn.field.array` of file + `widget: attachments` + ключ `awn-attachments` |
| `awn.field.special.cron` | Расписание cron | **Сейчас:** `awn-runtime-cron-schedule` без типа в схеме, виджет `cron-schedule` по ключу |

**Под вопросом** (нужна отдельная проработка)

| Ключ | Описание | Комментарий |
|---|---|---|
| `awn.field.special.catalog` | Значение из справочника (taxonomy) | Один тип с `preset` или иная схема — не решено. **Сейчас:** 6 виджетов по ключу |
| ↳ preset `tags` | Теги (мульти) | Ключ `awn-tags` → `catalog-tags` |
| ↳ preset `categories` | Категория (одно) | Ключ `awn-category` → `catalog-category` |
| ↳ preset `statuses` | Статус (одно) | Ключ `awn-status` → `catalog-status` (дубль inline-enum в `awn.base`) |
| ↳ preset `users` | Пользователь / владелец | Ключ `awn-owner` → `catalog-users` |
| ↳ preset `priorities` | Приоритет | Ключ `awn-priority` → `catalog-priorities` |
| ↳ preset `colors` | Цвет из справочника | Ключ `awn-color` → `catalog-colors` |
| `awn.field.special.link` | Wiki-ссылка `[[путь]]` | Остаётся примитивом `awn.field.link` или выносится в special — не решено |
| `awn.field.special.relation` | Связь с нодой + фильтр типа | Остаётся примитивом `awn.field.relation` или выносится в special — не решено |

**Примитивы с заявленным виджетом, но без рабочего UI** (кандидаты в special или доработка виджета)

| Ключ | Описание | Комментарий |
|---|---|---|
| `awn.field.markdown` | Markdown-редактор | widget: markdown — в форме свойств не подключён |
| `awn.field.json` | JSON-редактор | widget: json — не подключён |
| `awn.field.image` | Изображение | widget: image — не отделён от file |
| `awn.field.slug` | Слаг | widget: slug — не подделён, обычный input |
| `awn.field.tags` | Свободные теги | widget: tags — не подключён (работает только catalog-tags по ключу `awn-tags`) |

Открыто: `runtime-load` / `runtime-heartbeat` — остаются enum/boolean или тоже special; flat-имена (`awn.field.preview`) vs `special.*`. Миксины после появления special-типов — только способ подключить готовый набор полей.

**Свойства типа поля** (в `fields/*.yml`)

| Ключ | Описание | Комментарий |
|---|---|---|
| widget | Виджет формы по умолчанию | input, textarea, select, checkbox, file, image, relation… |
| storage | Как сериализуется в YAML/markdown | string / number / bool / array |
| mdbase | Базовый тип для markdown-frontmatter | string, text, enum, list, link, file, image, date, datetime, color, url, integer, number, boolean |
| format | Формат по умолчанию | У date/datetime/чисел — шаблон (YYYY-MM-DD, ISO-8601) |
| settings | Whitelist настроек при объявлении поля в схеме | Список ключей, доступных в редакторе типа. Базовый набор: hint, required, locked, default; у enum/array — +widget, enum; у file — +multiple, accept, upload, insertInText, scope |

**Свойства объявления поля** (в `fields:` у content/page)

| Ключ | Описание | Комментарий |
|---|---|---|
| type | ID типа поля | Обязательно. `awn.field.string`, `awn.field.enum`… |
| name / title | Подпись в форме | Обязательно (в YAML — `title` или `name`) |
| description | Пояснение для схемы | Есть в `_base`, но не во всех `settings[]` типов — уточнить единый набор |
| hint | Подсказка / placeholder | |
| required | Обязательное | default: false |
| locked | Только чтение | default: false |
| format | Шаблон заполнения | Для string, date, integer, number |
| default | Значение при создании | |
| widget | Переопределить виджет типа | Для enum (select/radio), array (checkbox/select-multiple) |
| enum | Варианты key/name | Для enum и array |
| items | Тип элементов списка | Для array и relation (`awn.field.string`, `awn.field.link`…) |
| multiple | Несколько файлов | Для file, image, relation |
| accept | Допустимые расширения | Для file, image — `.pdf, image/*` |
| upload | Загрузка с диска | Для file, image |
| insertInText | Вставка в редактор | Для file |
| scope | Область поиска файлов | topic / area / system — для file |
| group | Секция формы | Ссылка на `field-groups` базового типа (см. раздел Группировки) |

**relation vs link:** `link` — текстовая wiki-ссылка в markdown; `relation` — типизированная связь с фильтром по целевому типу ноды. Оба в наборе, доработка — в первую очередь `relation` (picker + фильтр), затем резолв `link`.

---

## Настройки

| Ключ | Описание | Комментарий |
|---|---|---|
| settings | Домен настроек агента | Создан как пример (данные для агента), сам по себе ни на что не влияет. Нужно решить, какие настройки станут "рабочими" (кто их читает) vs просто данные |

---

## Расширяемость и дописываемость

| Ключ | Описание | Комментарий |
|---|---|---|
| views | Тип вида представляет свой тип данных и раскладку | Должен уметь нести свой рендер |
| md-blocks | Тип блока представляет свой формат отображения | render: fence + renderer — заготовка, не доведена до рабочего |
| JS-обработчики | Общий механизм для views и md-blocks | Куда кладём, как грузим, какие ограничения (песочница) |

---

## Что рядом всплыло, но в исходное ТЗ не входило

- таксономии: нет своего пресета создания и своего просмотра значений
- kind — дублирует domain в большинстве случаев, можно выводить автоматически
- миграции схемы при изменении типа (что с данными при переименовании поля)
- wired-индикатор — сделать единообразным на все домены, включая новые пакеты
