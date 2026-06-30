# AWN V5 — Скомпилированная документация

- [1. Описание спецификации AWN V5](#1-описание-спецификации-awn-v5)
- [1.1. Awn-файлы в корне workspace](#11-awn-файлы-в-корне-workspace)
- [1.2. Файлы вида `*.combined.md`](#12-файлы-вида-combinedmd)
- [1.3. Файлы вида `*.configuration.md`](#13-файлы-вида-configurationmd)
- [1.4. Файлы вида `*.documentation.md`](#14-файлы-вида-documentationmd)
- [1.5. Ноды типа папка](#15-ноды-типа-папка)
  - [1.5.1. Workspace](#151-workspace)
  - [1.5.2. Space](#152-space)
  - [1.5.3. Cluster](#153-cluster)
  - [1.5.4. Book](#154-book)
  - [1.5.5. Collection](#155-collection)
- [1.6. Ноды типа файл](#16-ноды-типа-файл)
  - [1.6.1. Part](#161-part)
- [1.7. Типы памяти](#17-типы-памяти)
  - [1.7.1. Content/Inner](#171-contentinner)
  - [1.7.2. Content/Outer](#172-contentouter)
  - [1.7.3. Log](#173-log)
  - [1.7.4. Sidecar](#174-sidecar)
  - [1.7.5. Volume](#175-volume)
- [1.8. Команды](#18-команды)
  - [1.8.1. CRUD Node](#181-crud-node)
- [1.9. Шаблоны](#19-шаблоны)

---

## 1. Описание спецификации AWN V5

> **Роль файла:** принципы, термины, состав системы. Главный вход в спецификацию для человека и агента.

AWN — протокол взаимодействия **человек ↔ агент** в общем Obsidian Vault. Идея: и пользователь, и ИИ работают с одним и тем же содержимым (Markdown), но в двух взаимопроникающих слоях — человеческом смысле и машинной структуре.

### Контекст работы

- **Scope:** один Obsidian Vault.
- **Boundary:** агент не выходит за пределы vault без явного разрешения пользователя.
- **Модель:** Vault = OS для агента, файловая структура = машинный API.
- **Жёстких деревьев каталогов нет.** Допустимы любые папки и файлы; важны не шаблоны, а договорённости и явные ноды.

### Метафора: клетки и синергия

Нода — как клетка организма: самодостаточный атом знания с понятной ролью. Цифровая экосистема строится из таких узлов — агент фиксирует происходящее в нужном файле, правит релевантные заметки, ориентируется где что лежит.

Взаимодействие человека и ассистента — **синергия 1 + 1 > 2**: ясность агенту, опора и рост пользователю, без превращения памяти в кучу разрозненных дублей.

### Главные правила

1. **Не дублируй внутри файла.** Одна мысль — один раз. Не повторяй её разными словами в разных местах одной ноды.
2. **Не дублируй между файлами — давай ссылку.** Если факт уже есть в другой ноде, сошлись на неё. Копии расходятся со временем и создают противоречия.
3. **Не плоди иерархию папок без нужды.** Папка оправдана, если внутри несколько связанных файлов с общим контекстом. Одиночная нода живёт там, где логично, без своей папки.
4. **Безопасная маршрутизация.** Если нельзя однозначно определить целевую папку для нового файла — спроси пользователя. «Угадывать» при неоднозначности (2+ равновероятных мест, нет явных ключей в имени/контенте, конфликт правил) запрещено.

### Таблица принципов

| Принцип           | Суть                                                                              |
| ----------------- | --------------------------------------------------------------------------------- |
| **DRY**           | Один факт — один раз. Между файлами — ссылка, не копия.                           |
| **DDD**           | Domain-Driven Design: каждая область vault говорит на языке своего домена.        |
| **KISS**          | Нода должна быть понятна с первого прочтения.                                     |
| **YAGNI**         | Не создавать ноду «на будущее» — только когда реально нужна.                      |
| **SRP** (SOLID)   | Одна нода — одна договорённость. Несвязанные темы в одном файле — плохо.          |
| **APO**           | Atomicity / One Purpose — атом знания с понятной ролью.                           |
| **BDUF**          | Не строить вечную спецификацию заранее — держать договор в нодах, расти по факту. |
| **Occam's Razor** | Проще — вероятнее. Не плодить ноды и поля без реальной нужды.                     |

### Терминология

#### Нода

Базовая единица системы — `*.node.md`-файл с договорённостью: правило, профиль, навык, контекст. Нода — относительно **статичный** элемент, это логика поведения.

**Инварианты:**

- 1 нода = 1 атомарная идея = 1 место = 1 задача.
- Тип ноды задаёт её роль и поведение.
- Поля YAML-фронтматтера зависят от типа.
- `.md`-файлы вне реестра типов — **не ноды**.

#### Память

**Динамически** наполняемое и редактируемое содержимое, привязанное к ноде. Память сама по себе нодой не является — она про конкретный опыт, факты, следы взаимодействия.

#### Суффикс

Часть имени файла или папки, подсказывающая системе назначение (роль) элемента. Например: `*.node.md`, `*.documentation.md`, `*.configuration.md`, `*.combined.md`. По суффиксу агент определяет тип файла, не открывая его.

### Состав системы

Все элементы делятся на две большие группы:

- **Ноды** — содержат договорённости:
  - *ноды-папки* — описывают, что это за папка и как с ней работать;
  - *ноды-части* — когда сложная нода разбивается на несколько файлов.
- **Память** — воспоминания, прикреплённые к ноде (не нода).
- **Прочие файлы** — всё остальное (медиа, скрипты, конфиги): сырьё, в граф нод не входит.

### Дополнительные файлы (читать по необходимости)

| Файл (путь)          | Описание и назначение                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `HEARTBEAT.md`       | Операционный файл состояния/пульса системы: фиксирует текущий статус, контрольные сигналы и полезен для быстрой проверки «живости» процессов. |
| `README.md`          | Главный обзор проекта: концепция, структура, базовые правила и точки входа для онбординга.                                                    |
| `.gitignore`         | Правила исключения файлов из git: что не должно попадать в индекс и коммиты.                                                                  |
| `docker-compose.yml` | Описание локальной контейнерной инфраструктуры: какие сервисы запускаются вместе и с какими параметрами.                                      |
| `.env`               | Переменные окружения для локального запуска и интеграций; источник runtime-настроек и секретов (читать с осторожностью, не публиковать).      |

*Источник: [.awn-framework.project/00 Index.documentation.md](.awn-framework.project/00 Index.documentation.md) (строки 1-91)*

---

## 1.1. Awn-файлы в корне workspace

Системные файлы фреймворка AWN, живущие в корне workspace. Имеют общий префикс `awn.` — это отделяет их от пользовательского контента и `AGENTS.md`.

Все awn-файлы создаются и обновляются агентом по командам пользователя.

### Назначение awn-файлов

| Файл                            | Назначение                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `awn.settings.md`               | Базовые настройки workspace: рендеринг ссылок, naming, приветствие, voice. Редактируется человеком.                            |
| `awn.registry.md`               | Реестр `*.node.md` workspace. Таблица маршрутов: запрос → `AWN-TRIGGERS` → подгружаемые ноды. Обновляется по запросу.          |
| `awn.documentation.combined.md` | Скомпилированная документация: оглавление + содержимое всех `*.documentation.md`. Генерируется командой `DocumentationUpdate`. |
| `awn.dependencies.md`           | Системные зависимости (аналог `requirements.txt` для сервера). Заполняется при установке/изменении зависимостей.               |

### Правила

- Файл `awn.*` создаётся **только когда реально нужен** — пустых заглушек не плодим.
- Если файла нет, а команде он понадобился — агент создаёт его при первой необходимости.
- Содержимое генерируется/обновляется агентом; человек правит руками только `awn.settings.md`.

*Источник: [.awn-framework.project/02 Components/01 Awn-files/00 Index.documentation.md](.awn-framework.project/02 Components/01 Awn-files/00 Index.documentation.md) (строки 1-26)*

---

## 1.2. Файлы вида `*.combined.md`

Скомпилированный (склеенный) файл, собранный из нескольких источников в один.

Например, документация из всех файлов `*.documentation.md` собирается в один `awn.documentation.combined.md` в корне vault.

Содержимое генерируется автоматически по команде агента — вручную не редактируется.

*Источник: [.awn-framework.project/02 Components/01 Awn-files/Combined.documentation.md](.awn-framework.project/02 Components/01 Awn-files/Combined.documentation.md) (строки 1-11)*

---

## 1.3. Файлы вида `*.configuration.md`

Файл с конфигурацией для ноды.

- Может лежать рядом с нодой (`<имя>.configuration.md`) или произвольно — путь не фиксирован.
- Когда нода используется, агент подгружает её конфигурацию из соответствующего `*.configuration.md`.
- Содержимое файла может изменяться (в отличие от `*.documentation.md`).

*Источник: [.awn-framework.project/02 Components/01 Awn-files/Configuration.documentation.md](.awn-framework.project/02 Components/01 Awn-files/Configuration.documentation.md) (строки 1-9)*

---

## 1.4. Файлы вида `*.documentation.md`

Файл с документацией. YAML-свойства не используются и не собираются — обрабатывается только тело файла.

- Может лежать рядом с нодой (`<имя>.documentation.md`) или произвольно — путь не фиксирован.
- Тело всех `*.documentation.md` собирается в единый файл `./awn.documentation.combined.md` (корень vault) в виде оглавления с параграфами — по команде «обнови документацию».
- Содержимое этих файлов **меняется только человеком** — агент сам по себе их не редактирует.

*Источник: [.awn-framework.project/02 Components/01 Awn-files/Documentation.documentation.md](.awn-framework.project/02 Components/01 Awn-files/Documentation.documentation.md) (строки 1-10)*

---

## 1.5. Ноды типа папка

### Структура папки-ноды

Унифицированный словарь подпапок, которые могут жить внутри любой ноды-папки.

Подпапки создаются **по мере необходимости** — если их нет, ничего не ломается: агент работает с теми, которые есть.

### Подпапки

| Путь                  | Назначение                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `_Assets/`            | Вложения к записям ноды (изображения, PDF, медиа). По умолчанию раскладываются по подпапкам текущей даты `YYYY-MM-DD/`.      |
| `_Children/`          | Дочерние ноды-папки (Space, Cluster, Book, Collection внутри родительской ноды). Не для файлов-нод — для тех есть `Parts/`.  |
| `_Parts/`             | Ноды-части. Используется, когда сложная нода разбита на несколько `*.node.md`. Часть нод можно располагать и вне этой папки. |
| `_Scripts/`           | Скрипты ноды: bash, python и др.                                                                                             |
| `_Inbox/`             | Входящий поток — сырые заметки `*.note.md` ещё не разобранные по полкам. Здесь беспорядок разрешён.                          |
| `_Content/`           | Внешняя память ноды: переработанные знания, заметки, логи обсуждений, выводы.                                                |
| `_Content/Artifacts/` | Выходные данные агента: саммари, аналитика, спарсенные данные.                                                               |
| `_Content/Trash/`     | Корзина для удалённого контента.                                                                                             |
| `_References/`        | Внешние знания: переработанные чужие материалы — конспекты, цитаты, PDF из книг и статей.                                    |
| `_Temporary/`         | Черновой стол: временные файлы, скриншоты, эксперименты без постоянного места.                                               |
| `_Logs/`              | Логи.                                                                                                                        |
| `_Templates/`         | Локальные шаблоны ноды (Skeleton, Node, Memory, Sidecar и т.п.).                                                             |
| `_Vision/`            | Представления данных (Views): дашборды, канбаны, mindmap-обзоры, списки.                                                     |

### Специальные файлы

| Файл   | Назначение                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------- |
| `.env` | Переменные окружения для скриптов ноды: локальные ключи, пути. Не коммитить (см. `.gitignore`). |

### Правила

- Любая из перечисленных подпапок **опциональна** — создаётся только когда в ней появляется реальное содержимое.

*Источник: [.awn-framework.project/02 Components/02 Nodes-types/01 Folders/00 Index.documentation.md](.awn-framework.project/02 Components/02 Nodes-types/01 Folders/00 Index.documentation.md) (строки 1-33)*

### 1.5.1. Workspace

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "1f213379-7b1c-4fcb-8e1c-890685a5865f"
AWN-SLUG: COMPONENT/WORKSPACE
AWN-TYPE: Folder
AWN-ALLOW-CHILDREN: true
AWN-LAYER: 0
AWN-NAME: Workspace
AWN-DESC: Корень workspace — описание проекта и точка входа в vault.
AWN-REGISTRY: true
---
```

**Описание:** Workspace — корневой контейнер для всех остальных нод. В одном workspace может быть только **один** такой файл, и лежит он в самом корне.

Если в корне workspace нет `README.node.md` — это ошибка состояния «не понятно, что за проект». Агент при старте предлагает создать корневую ноду.

*Источник: [.awn-framework.project/02 Components/02 Nodes-types/01 Folders/01 Workspace.documentation.md](.awn-framework.project/02 Components/02 Nodes-types/01 Folders/01 Workspace.documentation.md) (строки 1-25)*

### 1.5.2. Space

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "c5c1f230-21cc-4b7f-8cd9-034d52a2da65"
AWN-SLUG: COMPONENT/SPACE
AWN-TYPE: Folder
AWN-ALLOW-CHILDREN: true
AWN-LAYER: 1
AWN-NAME: Space
AWN-DESC: Самостоятельная область знаний со своими правилами и контекстом.
AWN-REGISTRY: true
---
```

**Описание:** Space — самостоятельная область знаний со своими правилами и контекстом. Файл вида `<name>/Index.node.md` — нода-ориентир папки (область).

*Источник: [.awn-framework.project/02 Components/02 Nodes-types/01 Folders/02 Space.documentation.md](.awn-framework.project/02 Components/02 Nodes-types/01 Folders/02 Space.documentation.md) (строки 1-18)*

### 1.5.3. Cluster

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "10e9bbb6-458e-4b3f-923c-3588614f3999"
AWN-SLUG: COMPONENT/CLUSTER
AWN-TYPE: Folder
AWN-ALLOW-CHILDREN: true
AWN-LAYER: 1
AWN-NAME: Cluster
AWN-DESC: Папка-группировка однотипных нод.
AWN-REGISTRY: true
---
```

**Описание:** Cluster — папка-группировка однотипных нод. Файл вида `<name>/Index.node.md`.

*Источник: [.awn-framework.project/02 Components/02 Nodes-types/01 Folders/03 Cluster.documentation.md](.awn-framework.project/02 Components/02 Nodes-types/01 Folders/03 Cluster.documentation.md) (строки 1-16)*

### 1.5.4. Book

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "b8391a75-129c-440c-99ef-51c0198d27d6"
AWN-SLUG: COMPONENT/BOOK
AWN-TYPE: Folder
AWN-ALLOW-CHILDREN: true
AWN-LAYER: 1
AWN-NAME: Book
AWN-DESC: База знаний по одной теме — набор связанных заметок.
AWN-REGISTRY: true
---
```

**Описание:** Book — база знаний по одной теме: набор связанных заметок. Описывает, как с этой книгой работать и как добавлять в неё новые записи. Подходит для базы знаний по определённой тематике.

*Источник: [.awn-framework.project/02 Components/02 Nodes-types/01 Folders/04 Book.documentation.md](.awn-framework.project/02 Components/02 Nodes-types/01 Folders/04 Book.documentation.md) (строки 1-18)*

### 1.5.5. Collection

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "b619c6ef-53ed-4fc7-837e-78a73033f9b7"
AWN-SLUG: COMPONENT/COLLECTION
AWN-TYPE: Folder
AWN-ALLOW-CHILDREN: true
AWN-LAYER: 1
AWN-NAME: Collection
AWN-DESC: База данных однотипных записей — аналог таблицы в папке.
AWN-REGISTRY: true
---
```

**Описание:** Collection — база данных однотипных записей. Аналог базы данных в папке. Подходит для однотипных данных: задачи, дневник, история финансов, логи и т.п.

*Источник: [.awn-framework.project/02 Components/02 Nodes-types/01 Folders/05 Collection.documentation.md](.awn-framework.project/02 Components/02 Nodes-types/01 Folders/05 Collection.documentation.md) (строки 1-18)*

---

## 1.6. Ноды типа файл

### 1.6.1. Part

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "de53cb60-3245-4d67-a939-0b006084d051"
AWN-SLUG: COMPONENT/PART
AWN-TYPE: File
AWN-ALLOW-CHILDREN: false
AWN-LAYER: 2
AWN-NAME: Part
AWN-DESC: Атомарная нода-часть с одной задачей или правилом.
AWN-REGISTRY: true
---
```

**Описание:** Part — атомарная нода-часть. Содержит определённую логику или правило и выполняет одну конкретную задачу.

Может располагаться:

- в папке области напрямую (внутри Workspace, Space, Cluster, Book, Collection);
- в подпапке `_Parts/` родительской ноды — когда сложная нода разбита на несколько `*.node.md` частей.

*Источник: [.awn-framework.project/02 Components/02 Nodes-types/02 Files/01 Part.documentation.md](.awn-framework.project/02 Components/02 Nodes-types/02 Files/01 Part.documentation.md) (строки 1-21)*

---

## 1.7. Типы памяти

### 1.7.1. Content/Inner

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "99c80278-1c96-4f31-8aac-31a8b4ff13f8"
AWN-SLUG: MEMORY/CONTENT/INNER
AWN-TYPE: File
AWN-ALLOW-CHILDREN: false
AWN-LAYER: 3
AWN-NAME: Inner
AWN-DESC: Внутренняя память ноды в файле-спутнике <name>.node.content.md.
AWN-REGISTRY: false
---
```

**Описание:** Content/Inner — внутренняя память ноды. Пишется в файл вида `<name>.node.content.md` — файл-спутник, лежащий рядом с самой нодой `<name>.node.md`. YAML-свойства не используются.

*Источник: [.awn-framework.project/02 Components/03 Memories-types/Content/Inner.documentation.md](.awn-framework.project/02 Components/03 Memories-types/Content/Inner.documentation.md) (строки 1-11)*

### 1.7.2. Content/Outer

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: 639a6c6d-75cc-478f-8f24-69ac708b45c7
AWN-SLUG: MEMORY/CONTENT/OUTER
AWN-TYPE: File
AWN-ALLOW-CHILDREN: false
AWN-LAYER: 3
AWN-NAME: Outer
AWN-DESC: Внешняя память ноды — записи в папке Content/.
AWN-REGISTRY: false
---
```

**Описание:** Content/Outer — внешняя память ноды. Складывается в папку `Content/`. Базовый шаблон имеет свой набор собственных полей.

*Источник: [.awn-framework.project/02 Components/03 Memories-types/Content/Outer.documentation.md](.awn-framework.project/02 Components/03 Memories-types/Content/Outer.documentation.md) (строки 1-10)*

### 1.7.3. Log

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "9f7526d3-1ddb-4d75-8128-09d30e139c21"
AWN-SLUG: MEMORY/LOG
AWN-TYPE: File
AWN-ALLOW-CHILDREN: false
AWN-LAYER: 3
AWN-NAME: Log
AWN-DESC: Журнал событий и истории работы с нодой.
AWN-REGISTRY: false
---
```

**Описание:** Log — журнал событий и истории работы с нодой. Файл вида `*.log.md`. Обычно лежит в подпапке `Logs/` родительской ноды.

*Источник: [.awn-framework.project/02 Components/03 Memories-types/Log.documentation.md](.awn-framework.project/02 Components/03 Memories-types/Log.documentation.md) (строки 1-11)*

### 1.7.4. Sidecar

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "a1070b7f-cb36-40ba-a56d-d3ee19d3236e"
AWN-SLUG: MEMORY/SIDECAR
AWN-TYPE: File
AWN-ALLOW-CHILDREN: false
AWN-LAYER: 3
AWN-NAME: Sidecar
AWN-DESC: Метаописание не-md файла (изображения, документа, медиа).
AWN-REGISTRY: false
---
```

**Описание:** Sidecar — метаописание не-md файла. Файл вида `<filename.ext>.sidecar.md` для бинарного файла: изображения, документа, аудио, видео и т.п.

Sidecar именуется по **полному имени родителя**:

- `photo.jpg` → `photo.jpg.sidecar.md`
- `lecture.mp4` → `lecture.mp4.sidecar.md`

*Источник: [.awn-framework.project/02 Components/03 Memories-types/Sidecar.documentation.md](.awn-framework.project/02 Components/03 Memories-types/Sidecar.documentation.md) (строки 1-17)*

### 1.7.5. Volume

```yaml
---
AWN-SCHEMA: Type.schema
AWN-ID: "a817a592-da6b-4827-8435-3784bc87c3f9"
AWN-SLUG: MEMORY/VOLUME
AWN-TYPE: File
AWN-ALLOW-CHILDREN: false
AWN-LAYER: 3
AWN-NAME: Volume
AWN-DESC: Приватная память агента по ноде, рабочий конспект.
AWN-REGISTRY: false
---
```

**Описание:** Volume — приватная память агента по конкретной ноде. Создаётся рядом с нодой как файл-спутник.

Назначение: история взаимодействия агента с нодой — что обсуждалось, как агент рассуждал, какие были промежуточные выводы. Аналог Docker volumes для агента.

**Не является источником правды и договорённостей** — это рабочий конспект.

Volume применим только к нодам-папкам и нодам-частям (Part):

- `<name>.node.volume.md` — для Part-ноды.
- `Index.node.volume.md` — для папки-ноды.

*Источник: [.awn-framework.project/02 Components/03 Memories-types/Volume.documentation.md](.awn-framework.project/02 Components/03 Memories-types/Volume.documentation.md) (строки 1-27)*

---

## 1.8. Команды

Команды — это то, что **запрашивает пользователь**, и **подсказки агенту**, как с этим правильно работать.

Каждая команда — отдельный `*.documentation.md` файл в этой папке с пошаговым протоколом выполнения.

### Реестр команд

| Файл                                   | Команда (триггер пользователя) | Что делает                                                          |
| -------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| `01 CRUD Node.documentation.md`        | «создай ноду», «удали ноду»    | Создание, чтение, изменение и удаление нод `*.node.md`.             |
| `02 CRUD Memory.documentation.md`      | «запомни», «забудь», «измени»  | CRUD-операции с памятью нод.                                        |
| `02.02 CRUD Properties.md`            | «измени свойства»              | CRUD над свойствами (YAML-полями) ноды. *(заглушка)*                |

### Как добавить новую команду

1. Создать файл `<NN> <Имя команды>.documentation.md` в этой папке.
2. В теле описать:
   - **Триггер**: какие фразы пользователя её вызывают.
   - **Протокол**: пронумерованные шаги, что делает агент.
   - **Результат**: что меняется в vault.
3. Добавить строку в реестр выше.

*Источник: [.awn-framework.project/02 Components/04 Commands-types/00 Index.documentation.md](.awn-framework.project/02 Components/04 Commands-types/00 Index.documentation.md) (строки 1-24)*

### 1.8.1. CRUD Node

Базовые CRUD операции при работе с нодами.

#### Создание ноды

1. Спроси пользователя, о чём будет нода.
2. Если папка существует — создать в ней соответствующий файл.
3. Определи тип ноды.
4. Предложи создать соответствующий раздел и файл ноды.
5. Сгенерируй для новой ноды поле `AWN-ID` командой:

   ```bash
   uuidgen | tr 'A-Z' 'a-z'
   ```

   Результат — UUID v4 в нижнем регистре, формат `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.
   Записать в `AWN-ID` без кавычек. После создания **не менять**.

#### Удаление ноды

Удаление производи только с разрешения пользователя.

*Источник: [.awn-framework.project/02 Components/04 Commands-types/01 CrudNode.documentation.md](.awn-framework.project/02 Components/04 Commands-types/01 CrudNode.documentation.md) (строки 1-26)*

---

## 1.9. Шаблоны

Это порядок заполнения YAML-свойст и работы с ними. Схема описывает роль данного элемента в системе.

Канонические поля используют префикс `AWN-` — это отделяет системный контракт от пользовательских полей. Пользовательские поля (теги, заметки, метаданные проекта) пишутся без `AWN-`.

**Порядок ключей:** сначала все `AWN-*` поля, затем пользовательские. Состав полей может отличаться в зависимости от типа ноды.

### Контракт фронтматтера, формат шапки

В начале каждого файла-ноды и памяти ноды — блок YAML между `---`.

### Что без фронтматтера

- **External** — произвольные файлы, не ноды.
- **`SKILL.md`** и прочие артефакты скилла — по правилам скилла, не по этому контракту, если иное не зафиксировано отдельно.

*Источник: [.awn-framework.project/04 Templates/00 Index.documentation.md](.awn-framework.project/04 Templates/00 Index.documentation.md) (строки 1-17)*