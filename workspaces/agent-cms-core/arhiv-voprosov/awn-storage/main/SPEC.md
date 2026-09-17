# YamlCMS / Agent-CMS — Спецификация модели данных v0.1

> Собрано из `Формируем вопросы.md` и `REZ_COPY.md`.  
> Канон реализации platform: `awn-data/cms-base/`.  
> **Архив.** Канон для агента: [GLOBAL_MCP_DOC.md](../../../GLOBAL_MCP_DOC.md).  
> Детали runtime: [IBLOCK-MODEL.md](./IBLOCK-MODEL.md), [TYPES-GUIDE.md](./TYPES-GUIDE.md). Живая шпаргалка YAML-типов: [awn-system/TYPES-GUIDE.md](../../../awn-system/TYPES-GUIDE.md).

---

## 1. Миссия

Единая модель, в которой **все `.md`-файлы живут по одним принципам**:

- тип определяется **путём / пакетом** (Neos-style), не произвольным id в файле;
- **схемы лежат рядом с папкой** — перенос = копирование папки;
- **инфоблок** можно создать в `awn-data` **и** внутри темы / слота;
- **дерево страниц** (WS → Area → Topic) живёт в workspace, не в `awn-data`;
- система одновременно CMS, база знаний и память для ИИ.

Цепочка runtime:

```
Workspace → Section → Area → Topic → Slot → [Container] → Row
```

---

## 2. Три слоя системы

| Слой | Где | Роль |
|------|-----|------|
| **Platform (Core)** | `agent-cms-core/awn-data/` | Канон типов для всех агентов |
| **Agent (WS)** | `{agent}/` + `{agent}/awn-data/` | Живое дерево, локальные инфobлоки, override |
| **Runtime** | `topic/awn-storage/…` | Файлы, записи, вложенные коллекции |

### 2.1. Platform vs Agent

| Источник | Когда редактируешь |
|----------|-------------------|
| `agent-cms-core/awn-data/` | Меняешь **базовую платформу** для всех агентов |
| `{agent}/awn-data/` | Настраиваешь **конкретного агента** (слот, mixin, kit-страница) |
| `configuration-schema.yml` на уровне WS / Area / Section | Override схемы **в дереве** |

**Правило:** типы страниц (`awn.page.*`) — в **`awn-system/types/pages/`** (YAML).  
**Живые узлы** — в дереве workspace. Узел хранит `awn-type` → runtime ищет тип в каталоге → строит форму и меню.

---

## 3. Онтология: Node → Container → Row

### 3.1. Синонимы и технические имена

| Роль в системе | Синонимы | Тех. имя (целевое) | Сейчас в коде |
|----------------|----------|-------------------|---------------|
| Корень | Entity, Object, Node, Element | `awn.base.node` | `entities/base.md` → `awn.base` |
| Схема / таблица | Container, Table, Model, Class, **Инфobлок** | `awn.base.container` | `entities/table.base.md` → `awn.table.base` |
| Инстанс | Row, Record, Item, Post, Material, **Запись** | `awn.base.row` | `entities/row.base.md` → `awn.row.base` |
| Миксин | Trait, Fragment, Partial | `awn.base.container.mixin` | `cms-base/mixins/` |

### 3.2. Дерево базовых типов

```
awn.base.node
├── awn.base.container
│   ├── .collection     ← N элементов (.md в папке)
│   ├── .single         ← 1 элемент (настройки / конфиг)
│   └── .mixin          ← чертёж полей для подмешивания
└── awn.base.row
    ├── awn.page.*      ← узлы дерева (topic, area, ws…)
    ├── awn.content.*   ← контент в слотах
    ├── awn.slot.*      ← слоты
    └── {package}.*     ← пользовательские (acme.news.record)
```

### 3.3. Kind + Type + Role

**Kind** — поведение (как работать с объектом).  
**Type** — структура (из каталога типов).  
**Role** — смысл / schema-id (локальная специализация).

| Kind | Type (пример) | Role (пример) | Реальность |
|------|---------------|---------------|------------|
| `container` | `collection` | `news` | Инфobлок «Новости» |
| `container` | `single` | `news` | Настройки модуля «Новости» |
| `row` | `item` | `news` | Одна новость |
| `container` | `collection` | `tasks` | Инфobлок «Задачи» |
| `row` | `item` | `tasks` | Одна задача |

**Spec v0.1:** минимум **`awn-kind`** + **`awn-type`**.  
**`awn-role`** — опционально, когда нужна локальная схема (инфobлок внутри темы).

Упрощённая альтернатива (если три поля окажутся тяжёлыми): одно составное `awn-type: container.collection.news`.

---

## 4. Классификация `.md`-файла

```
.md
 ├─ нет frontmatter           → обычный markdown
 ├─ frontmatter без awn-*     → обычный markdown
 └─ есть awn-*                → типизированный объект CMS
       ├─ awn-kind: container → инфobлок (схема + дети)
       └─ awn-kind: row       → элемент (данные)
```

**Объект без `awn-*`-свойств** = просто документ, не инфobлок и не запись.

---

## 5. Идентификация

### 5.1. Type ID — из пути / пакета

Формат (Neos-style):

```
<vendor>.<domain>.<entity>
agent-cms-core.pages.topic
ws.myproject.news.record
```

Type ID **не произвольный slug в файле**, а пространство имён из расположения и пакета.

### 5.2. Object ID — **не хранить в frontmatter**

- **ID элемента** = путь от корня контейнера или slug имени файла (`news/2024/hello-world`).
- **`awn-id` в frontmatter не пишем** — конфликты при копировании/дублировании.
- Runtime вычисляет id при индексации.

> **Миграция:** сейчас в коде `awn-id` ещё есть в frontmatter — целевое состояние: убрать.

### 5.3. Реестр типов (гибридный)

- **Core registry** — базовые типы (`awn.base.*`) в `awn-data/cms-base/entities/`.
- **Auto-discovery** — при загрузке WS сканировать `awn-kind: container`, регистрировать `awn-role` / type path.
- **Индекс-кэш** (опционально): `/.awn/registry.json` — не source of truth, а ускоритель.

Пример индекса:

```json
{
  "types": {
    "acme.news.record": {
      "path": "/ws/main/data/news/_container.md",
      "package": "acme.news",
      "kind": "container"
    }
  }
}
```

---

## 6. Инфobлок (Container)

### 6.1. Три слоя файла (как в Битриксе)

Файл контейнера: `manifest.md` или `_container.md` в папке с элементами.

| Слой | Где | Содержимое |
|------|-----|------------|
| **1. Настройки** | frontmatter | `awn-kind`, `awn-type`, `awn-role`, `awn-name`, `awn-record`, `awn-extends` |
| **2. Свойства** | frontmatter | `awn-schema-fields:` — схема полей элементов |
| **3. Описание** | body (markdown) | Текст после `---` |

Пример:

```yaml
---
awn-kind: container
awn-type: awn.base.container.collection
awn-role: schema.news
awn-name: "Инфobлок: Новости"
awn-record:
  id-mode: slug
  file: "{id}.md"

awn-schema-tabs:
  main: "Основное"
  seo: "SEO"

awn-schema-fields:
  attr_author:
    type: string
    label: "Автор"
    tab: main
  attr_publication_date:
    type: datetime
    tab: main
---
# Инфobлок «Новости»
Официальное хранилище. Все `.md` в папке наследуют схему `schema.news`.
```

> **Сейчас в коде:** ключ `awn-fields` вместо `awn-schema-fields` — см. §12 (миграция).

### 6.2. UI редактирования инфobлока

Вертикальный поток (одна колонка):

1. **Настройки инфobлока** — параметры manifest  
2. **Описание** — body manifest (markdown)  
3. **Свойства элементов** — таблица `awn-schema-fields`  
4. **Элементы** — список `.md` / CSV

---

## 7. Элемент (Row)

### 7.1. Структура

| Слой | Содержимое |
|------|------------|
| **Настройки** | `awn-kind: row`, `awn-type`, `awn-name`, `awn-status`, timestamps… |
| **Заполненные свойства** | `attr_*` по схеме контейнера |
| **Описание** | body markdown |

Пример:

```yaml
---
awn-kind: row
awn-type: acme.news.record
awn-name: "Запуск версии 3.0"
awn-status: published

attr_author: "Алексей"
attr_publication_date: "2026-08-02"
attr_views_count: 142
---
# Запуск версии 3.0
Текст новости…
```

### 7.2. Произвольные свойства (`attr_*`)

- **`awn-*`** — только система.
- **`attr_*`** или блок **`attributes:`** — бизнес-данные по схеме инфobлока.

```yaml
attributes:
  custom_score: 98.5
  payload:
    gate_id: 12
    tags: ["fast", "cron"]
```

Элемент **не наследует типы** как container — это instance, `extends` у записи нет.

---

## 8. Co-location: схема рядом с папкой

**Решение spec:** схема **внутри переносимой папки**, не в одном корневом файле.

```
/news/
  manifest.md          ← container (схема)
  hello-world.md       ← row
  2024/
    q1-report.md       ← row
```

**Монолитный корневой YAML запрещён** как единственный source — теряется переносимость.

---

## 9. Override chain

Effective Schema собирается по дереву каталогов:

```
Core Schema
  ← WS (awn-ws-*)
  ← Area (awn-area-*)
  ← Section (awn-section-*)
  ← Local container (manifest.md)
```

| Префикс | Уровень | Переопределяемо |
|---------|---------|-----------------|
| `awn-core-*` | Ядро | нет |
| `awn-ws-*` | Workspace | да |
| `awn-area-*` | Area | да |
| `awn-section-*` | Section / Category | да |
| `attr_*` / `awn-x-*` | Пользовательские | да, на записи |

```
core → ws → area → section → local node (итоговая схема)
```

Наследование **по пути папок** + явный **`awn-extends`** для ссылок на родительский тип/схему.

---

## 10. Два режима инфobлоков в `awn-data`

| Режим | extends | Примеры | Элемент = |
|-------|---------|---------|-----------|
| **Каталог типов** | `table.base.md` | pages, slots, content | описание типа (`topic.md`) |
| **Данные** | `row.base.md` | tasks, taxonomies | строка данных (`1.md`) |
| **Presets** | — | `awn-data/system-presets/` | пресеты (`.env`, `SKILL.md`, …) |
| **Mixins** | `base.md` | cms-base/mixins | примесь полей |

---

## 11. Локальные инфobлоки в теме (Structured Data)

Инфobлок **не обязан** жить только в `awn-data/`.  
Слот типа «structured-data» — mount point для локального container.

```
topic «Поток 1» (topic.md)
├── _data_participants.md    awn-kind: container, awn-role: flow.participants
│   ├── student_01.md        awn-kind: row
│   └── student_02.md
└── _data_homeworks.md       awn-kind: container, awn-role: flow.hw
    ├── hw_lesson1.md
    └── hw_lesson2.md
```

---

## 12. Структура репозитория (target)

```
agent-cms-core/
├── arhiv-voprosov/awn-storage/main/  ← архив спецификаций и карт
│   ├── SPEC.md
│   └── MAP_2.md
├── awn-data/                       ← PLATFORM (накопители данных + cms-base)
│   ├── cms-base/
│   │   ├── entities/               ← awn.base, table.base, row.base
│   │   └── mixins/
│   ├── tasks/                      ← platform data
│   └── taxonomies/
├── awn-system/                     ← PLATFORM: канон типов (pages, content, slots, …)
│   └── types/{pages,content,slots}/ ← источник для рантайма
│
└── workspaces/{agent}/
    ├── manifest.md                 ← WS
    ├── areas/…/topics/…            ← живое дерево
    │   └── awn-storage/
    │       ├── inbox/…             ← файловые слоты
    │       └── _data_news/         ← локальный container
    └── awn-data/                   ← agent overrides (опционально)
```

Kit-области (`awn-agent-kit`, `awn-container`, `awn-shared`) — те же **Area**, но с заготовкой структуры.

---

## 13. Вкладки форм (TYPO3 TCA)

```yaml
awn-schema-tabs:
  main: "Основное"
  seo: "SEO и Мета"
  access: "Права доступа"

awn-schema-fields:
  attr_title:       { type: string, tab: main }
  attr_meta_keywords: { type: string, tab: seo }
  attr_roles:       { type: array, tab: access }
```

---

## 14. Pipeline загрузки объекта

```
Файл .md
  → есть frontmatter?
      нет  → обычный markdown
      да   → есть awn-*?
               нет  → обычный markdown
               да   → awn-kind: container | row
                      → type из path / manifest / registry
                      → загрузить схему типа
                      → применить override-слои
                      → runtime-объект → индекс / дерево / форма / рендер
```

---

## 15. Gap: spec vs текущая реализация

| Тема | Spec v0.1 | Сейчас в коде |
|------|-----------|---------------|
| Container + Row | `awn-kind` container/row | `table.base` + `row.base` ✅ |
| UI инфobлока | настройки → описание → свойства → элементы | одна колонка ✅ |
| ID из пути | не хранить `awn-id` | `awn-id` в frontmatter ⚠️ |
| Co-location | manifest рядом с папкой | `manifest.md` в store ✅ |
| `awn-schema-fields` | целевое имя | `awn-fields` ⚠️ |
| `awn-kind` + `awn-type` + `awn-role` | целевая модель | `awn-typeId`, `awn-kind` смешаны ⚠️ |
| Локальные infoblocks в topic | да | не реализовано ❌ |
| Override WS→Area→Section | префиксы + path | только `awn-extends` chain ⚠️ |
| Registry index | `/.awn/registry.json` + discover | loader discover частично ⚠️ |
| `attr_*` | конвенция | нет в loader ⚠️ |

---

## 16. План миграции (фазы)

### Фаза A — документировано, частично в коде
- [x] `entities/`: base, table.base, row.base
- [x] `manifest.md` + `awn-extends` chain
- [x] UI: инфobлок (настройки, описание, свойства, элементы)

### Фаза B — ближайшее
- [ ] `awn-id` → path-derived, убрать из frontmatter
- [ ] `awn-fields` → `awn-schema-fields` (loader читает оба)
- [ ] `awn-kind: container|row` в manifest и записях
- [ ] `awn-schema-tabs` в формах

### Фаза C — дерево workspace
- [ ] Override chain: `awn-ws-*`, `awn-area-*`, `awn-section-*`
- [ ] `configuration-schema.yml` на уровнях дерева
- [ ] Structured-data slot → локальный container в topic

### Фаза D — registry
- [ ] `/.awn/registry.json` как кэш
- [ ] Auto-discovery container по WS

---

## 17. Открытые решения (зафиксировать до v1.0)

| # | Вопрос | Варианты |
|---|--------|----------|
| 1 | Три поля или одно? | `awn-kind` + `awn-type` + опц. `awn-role` **vs** `awn-type: container.collection.news` |
| 2 | Имя файла container | `manifest.md` **vs** `_container.md` |
| 3 | Переименование `awn-fields` | сразу **vs** dual-read период |
| 4 | Первый MVP structured-data | слот в topic **vs** только awn-data |
| 5 | Override | только `awn-extends` **vs** сразу префиксы по дереву |

**Рекомендация v0.1:**  
- `awn-kind` + `awn-type`, `awn-role` опционально  
- `manifest.md` (уже в коде)  
- dual-read `awn-fields` / `awn-schema-fields`  
- structured-data — фаза C  
- override — сначала `awn-extends`, затем префиксы  

---

## 18. Связанные документы

| Файл                                                    | Назначение                                |
| ------------------------------------------------------- | ----------------------------------------- |
| [SPEC.md](./SPEC.md)                                    | **этот документ** — итоговая спецификация |
| [Формируем вопросы.md](./Формируем%20вопросы.md) | исходные Q&A, примеры Gemini (архив) |
| [REZ_COPY.md](./REZ_COPY.md) | исходные заметки, дерево WS, вопросы (архив) |
| [IBLOCK-MODEL.md](./IBLOCK-MODEL.md) | краткая карта инфobлок+элемент (архив) |
| [TYPES-GUIDE.md](./TYPES-GUIDE.md) | шпаргалка по entities и extends (архив) |
| [awn-system/TYPES-GUIDE.md](../../../awn-system/TYPES-GUIDE.md) | YAML-типы pages/slots/fields |
| [GLOBAL_MCP_DOC.md](../../../GLOBAL_MCP_DOC.md) | карта MCP (канон для агента) |
| [MAP_2.md](./MAP_2.md) | архивная карта workspace (устарела) |
| [SPEC_2026_itogovaya.md](./SPEC_2026_itogovaya.md) | черновик спецификации 2026 |

---

## 19. Итог в одной строке

**`manifest.md` = схема инфobлока (настройки + свойства + описание); `.md` в папке = элементы; `awn.base.container` + `awn.base.row` = онтология; живые страницы — в workspace, не в awn-data.**
