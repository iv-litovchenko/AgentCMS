# Спецификация 2026 (итоговая, черновик, архив)

> Канон для агента: [GLOBAL_MCP_DOC.md](../../../GLOBAL_MCP_DOC.md). Полная спецификация: [SPEC.md](./SPEC.md).

> **Фокус этапа:** расположение и определение файлов в `awn-data/` — откуда система подцепляет типы и схемы.  
> **ID = путь.** Отдельных `awn-id` / `awn-type-id` нет.

Система, где всё в Markdown, схемы наследуются, co-location, тип в `awn-data/` → экземпляр снаружи.

---

## 1) Все md-файлы — один механизм

- Объект без `awn-*` — plain markdown
- **ID = путь к файлу / папке store**

---

## 2) Ключи

| Ключ | Где | Смысл |
|------|-----|-------|
| `awn-super-type` | базовый тип (`collection.md`) | **кто я** — id = путь этого файла |
| `awn-supertype` | store manifest, запись | **от кого наследую** — путь базового типа или store; **заменяет `awn-extends`** |
| `awn-data-elements-schema` | базовый тип collection | какие ключи у manifest collection-store |
| `awn-data-elements-schema-extends` | store manifest | базовая схема **записей** |
| `awn-data-elements-schema-mixins` | store manifest | примеси для записей |
| `awn-data-elements-schema` | store manifest | fields + tabs **записей** |
| `awn-fields` | store (каталог типов) | поля item-описания типа (`awn-system/types/pages/topic.yml`) |

> **`awn-extends`**, **`awn-type`**, дубль **`awn-fields`** — не нужны: структуру manifest и допустимые ключи задаёт **`awn-supertype`** (файл базового типа).

---

## 3) `cms-base/` — фундамент

```
cms-base/
├── base
├── data-containers/              store id: awn-data/cms-base/data-containers
│   ├── manifest.md               supertype → collection.md
│   ├── collection.md             id: …/data-containers/collection.md
│   ├── group.md
│   ├── single.md
│   └── mixin.md
├── data-elements/                store id: awn-data/cms-base/data-elements
│   ├── manifest.md
│   └── default.md                id: …/data-elements/default.md
└── mixins/                       каталог примесей
```

`collection.md` → **шаблон manifest** (ключи `awn-record-id-mode`, `awn-data-elements-schema`, …).  
Store заполняет только своё поверх supertype.

---

## 4) Пример: tasks

```
data-containers/collection.md     ← базовый тип + шаблон manifest
data-elements/default.md          ← базовая схема записи

tasks/manifest.md
  awn-supertype: …/data-containers/collection.md
  awn-record-id-mode: numeric
  awn-data-elements-schema-extends: …/data-elements/default.md
  awn-data-elements-schema: { fields задачи }

tasks/1.md
  awn-supertype: awn-data/tasks
  id = awn-data/tasks/1.md
```

---

## 5) Пример: page types (каталог типов)

```
awn-system/types/pages/topic.yml            ← чертёж awn.page.topic (источник рантайма)
awn-container/…/manifest.md                 ← item: живая тема (за пределами awn-system)
```

---

## 6) `awn-data/` — остальные домены

```
awn-data/
├── sort.json
├── cms-base/          ← §3
├── settings/          collection
├── settings-global/   single
├── taxonomies/        group → внутри collection+csv
├── tasks/             collection → данные (§4)
└── agent-registry/    group
```

---

## 7) Co-location

`manifest.md` в той же папке, что и записи. Перенос = копирование папки.

---

## Вопросы

- override любой части схемы, а не только fields???? Нужно ли это
- Как делать override схемы? — в дереве (на уровне WS, AREA, раздела-категории)
  - Префиксы типа того:
    - `awn-core-*` — уровень Ядра
    - `awn-ws-*` — уровень WS
    - `awn-x-*` — пользовательские свойства
- Должен ли быть общий список типов (domains), где-то зарегистрировать то, что мы определяем в системе, чтобы система ориентировалась в том, какими сущностями она оперирует
- Как делать схему с произвольными свойствами для записи (они уникальны) — это типа что-то вроде `attr_*`, те уникально заполняется для записей и имеет разные комбинации типа serialize json
- kind + type + role — три поля или одно составное `awn-type`?
- какие поля item (`awn-tags`, `awn-emoji` …) — всегда системные, а какие только в `awn-schema`?
- - ⁃ Появилась идея что тема может содержать такой тип слота как «Структурированные данные» — пример (по идее мы можем создать инфоблок (новый тип) в **любом месте**, а не только в awn-data)

- Шаблон agent-kit-например для user???
