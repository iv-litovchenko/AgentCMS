# Как описывать структуру базы данных (схему)

> То же содержание встроено в панель RecordPilot: страница **`/docs`** (`php-record-pilot/views/docs/index.php`). При правках желательно обновлять оба места.

Черновик для RecordPilot: несколько слоёв, которые **не подменяют друг друга**, а дополняют.

---

## 1. Зачем не одним файлом

| Слой | Назначение | Где живёт |
|------|------------|-----------|
| **Физическая схема** | Реальные таблицы, типы, индексы, FK, миграции | `sql/`, миграции, `SHOW CREATE TABLE` |
| **Логическая / связи** | «Как сущности связаны», ER, кардинальность | диаграммы, отдельный JSON/YAML, комментарии в DDL |
| **Админ/UI (метаданные)** | Список, форма, фильтры, подписи полей | `*.schema.idea.json` в `metadata/` |

Истина для **данных** — БД и миграции. Истина для **интерфейса** — метаданные; они должны **соответствовать** физике (имена колонок, типы для виджетов).

---

## 2. Физический уровень

- **DDL** в репозитории: например `sql/schema.sql`, далее `sql/migrations/NNN_description.sql`.
- Версионирование: номер/имя файла миграции + при необходимости таблица `schema_migrations` (позже в ядре).
- Минимум в комментариях SQL: назначение таблицы, важные ограничения.

Этого достаточно, чтобы **воспроизвести** БД на стенде.

---

## 3. Логическая схема (связи и целостность)

Опционально, но полезно для обсуждений и ИИ:

- **Связи**: `services.category_id → categories.id`, `ON DELETE`, уникальные пары.
- **Форматы описания** (на выбор проекта):
  - блок `relations` в общем JSON схемы БД (не обязательно в `schema.idea` на сущность);
  - Mermaid `erDiagram` в Markdown;
  - экспорт из IDE / dbdiagram.io / встроенный экран «Схема БД» в панели (макет в `EXAMPLE.html`).

Здесь фиксируем **смысл** связей, не дублируем полный DDL.

---

## 4. Метаданные для панели (`*.schema.idea.json`)

Уже заложенный формат (см. `Documentation/services.schema.idea.json`):

- **`meta`** — версия, сущность, назначение.
- **`physicalSchema`** — привязка к таблице: `table`, `primaryKey`, `columns[]` с `dbType`, `nullable`, и т.д.  
  Это **снимок/контракт** «какие колонки ожидает UI», а не замена миграций.
- **`adminSchema`** — подписи, виджеты, обязательность, правила для формы и списка.

Правило: при изменении DDL обновлять **physicalSchema** (и при необходимости **adminSchema**), иначе панель и валидация разъедутся с БД.

### 4.1. Типы полей: три уровня

Одна колонка в БД описывается **тремя связанными, но разными** вещами:

| Уровень | Что фиксируем | Пример |
|--------|----------------|--------|
| **Физика** | Реальный SQL-тип, `NULL`, `DEFAULT`, длина | `decimal(10,2)`, `tinyint(1) NOT NULL DEFAULT 1` |
| **Смысл (опционально)** | Логический тип для домена и ИИ | «деньги», «флаг активности», «мягкое удаление» — в `comment` колонки или в `meta.notes` |
| **UI** | Виджет и правила формы/списка | `uiType: "number"`, `step`, `maxLength` |

В `physicalSchema.columns[]` храним **`name`**, **`dbType`** (как в DDL, строкой), **`nullable`**, при необходимости **`default`**, **`autoIncrement`**, **`comment`**.

В `adminSchema.formView.fieldConfig` — **`uiType`** и параметры виджета (`maxLength`, `step`, `rows`, `allowedMime` и т.д.).  
Связи не являются колонкой таблицы: они описываются в **`relations`** и в `fieldConfig` как `relation-multi`, `file-relation-multi` и т.п.

### 4.2. Возможные поля и блоки (`schema.idea.json`)

Ориентир по структуре файла (как в `Documentation/services.schema.idea.json`). Ядро RecordPilot **жёстко проверяет** только часть ключей (`MetadataLoader`); остальное — для генераторов, спецификации и будущего UI.

**Корень документа**

| Блок | Валидатор ядра | Назначение |
|------|----------------|------------|
| `meta` | обязателен | Тип документа, версия, сущность, назначение, заметки |
| `physicalSchema` | обязателен | Таблица, ключ, колонки, индексы |
| `relations` | опционально | Связи M:N и др. (pivot, ключи) |
| `adminSchema` | обязателен | Список, форма, фильтры, импорт/экспорт |
| `virtualFields` | опционально | Вычисляемые поля без колонки в БД |
| `apiDraft` | опционально | Чертёж REST-эндпоинтов (документация) |

**`meta`:** `documentType` (для RecordPilot: `"schema-idea"`), `version`, `project`, `entity`, `purpose`, `notes[]`.

**`physicalSchema`:** `table`, `primaryKey` (обязательны); опционально `titleField`, `softDeleteField`, `timestamps` (`createdAt` / `updatedAt`); `columns[]`; `indexes[]` (`name`, `type`: `unique` / `index`, `columns[]`).  
Элемент **`columns[]`:** `name`, `dbType`, `nullable`; опционально `default`, `autoIncrement`, `comment`.

**`relations[]`:** типично `name`, `type` (напр. `belongsToMany`), `targetTable`, `pivotTable`, `sourceKey`, `targetKey`, `pivotColumns[]`.

**`adminSchema`:**

- `navigation` — `module`, `group`, `icon`.
- `listView` — `defaultColumns[]`, `compactColumns[]`, `defaultSort[]` (`field`, `direction`), `searchableFields[]`, `facets[]`, `bulkActions[]`.
- `formView` — `sections[]` (`id`, `title`, `fields[]`), **`fieldConfig`** (обязателен для загрузчика).
- `filters` — `allowedOperators`: объект «имя поля → массив операторов».
- `importExport` — блоки `import` / `export` (форматы, колонки, `upsertBy`, `includeRelationsAs` и т.д.).

**`formView.fieldConfig`** (ключ = имя поля): `uiType`; опционально `required`, `unique`, `label`, `hint`, `modelHint`, `maxLength`, `rows`, `step`, `min`, `max`, `relationName`, `displayField`, `allowedMime[]`.

**Типичные `uiType`:** `text`, `slug`, `textarea`, `number`, `switch`, `date`, `datetime`, `select`, `multi-select`, `relation`, `relation-multi`, `file-relation-multi`, `file`. Новые типы вводить согласованно с таблицей «БД ↔ UI» и реализацией в ядре.

**`virtualFields[]`:** например `name`, `type` (`computed-int`), `source` (`relation_count:…`), `description`.

**Операторы фильтров** (пример набора): строки — `contains`, `starts_with`, `equals`, `empty`; числа — `equals`, `gt`, `gte`, `lt`, `lte`, `between`, `empty`; даты — `date_between`, `date_before`, `date_after`, `empty`; связи — `has_any`, `has_all`, `not_has`.

### Соответствие «тип БД → подсказка для UI»

Ниже не жёсткий стандарт СУБД, а **соглашение для RecordPilot**: при смене `dbType` проверяйте совместимый `uiType` и фильтры.

| Группа физики (типичный `dbType`) | Замечания | Типичный `uiType` / поведение |
|-----------------------------------|-----------|-------------------------------|
| Целые: `tinyint`, `smallint`, `int`, `bigint` | `tinyint(1)` часто = булев флаг | число: `number` (целое); флаг: **`switch`** |
| Вещественные / деньги: `decimal`, `float`, `double` | Для денег предпочтительно `DECIMAL` | `number` + `step` (напр. `0.01`) |
| Строки: `char`, `varchar` | Длина в DDL и `maxLength` в UI | короткий текст: **`text`**; URL/slug: **`slug`** |
| Длинный текст: `text`, `mediumtext`, `longtext` | | **`textarea`** (`rows`) |
| Булевы: `tinyint(1)`, `boolean` | Единый стиль в проекте (0/1 или true/false) | **`switch`** |
| Дата/время: `date`, `datetime`, `timestamp` | Часовой пояс — политика приложения | `date` / **`datetime`** / при необходимости отдельный `time` |
| JSON: `json` | Валидация схемы — в коде или метаданных позже | заготовка: `textarea` (сырой JSON) или редактор JSON в ядре |
| Бинарные: `blob`, `binary` | Обычно не редактируют как текст | вложения через **`file`** / отдельная таблица файлов |
| Перечисления СУБД: `enum`, `set` | Альтернатива — справочник + FK | **`select`** / `multi-select` + список допустимых значений в метаданных |

### Связи и «виртуальные» поля

- **FK в одной таблице** (`category_id`): в физике — `int`/`bigint` + индекс; в UI — **`relation`** / **`select`** с подгрузкой целевой сущности (`displayField`).
- **M:N** (pivot): в `relations` — `belongsToMany`; в форме — **`relation-multi`**, **`file-relation-multi`** и т.д.
- **Вычисляемые поля** (нет колонки в БД): блок **`virtualFields`** (`computed-int`, счётчики связей и т.п.) — в списке/фильтрах согласовать с запросами, не путать с реальными колонками.

### Фильтры и операторы

Тип физики задаёт **допустимые операторы** в `adminSchema.filters.allowedOperators` (см. пример в `services.schema.idea.json`):

- строки — `contains`, `equals`, `empty`, …;
- числа — `gt` / `gte` / `lt` / `lte` / `between`;
- даты — `date_between`, `date_before`, `date_after`;
- связи — `has_any`, `has_all`, `not_has`.

При добавлении нового `dbType` или `uiType` **расширяйте** этот блок, иначе фильтры в спецификации и в UI разойдутся.

---

## 5. Рекомендуемый порядок работ

1. Меняем БД через миграцию (или ручной `schema.sql` на старте).
2. Обновляем **`physicalSchema.columns`** (`dbType`, `nullable`, …) в JSON сущности (или генерируем черновик скриптом из `INFORMATION_SCHEMA`).
3. Для каждой колонки выставляем **`uiType`** и параметры виджета; для связей — **`relations`** + поле в `fieldConfig`.
4. Настраиваем **`filters.allowedOperators`** под классы типов (строка / число / дата / связь).
5. (Опционально) обновляем диаграмму связей / `relations` и `virtualFields`.

---

## 6. Что может добавить ядро позже

- Импорт структуры из БД → черновик `physicalSchema`.
- Валидация: JSON метаданных против реальных колонок.
- Единый файл **`database.schema.json`** на весь проект (все таблицы + relations) — если понадобится ER и отчёты; до тех пор достаточно **per-entity** `*.schema.idea.json`.

---

## Ссылки

- Пример метаданных сущности: `Documentation/services.schema.idea.json`
- Идея обсуждения схемы с ИИ: `Documentation/IDEA_AI_SCHEMA_COLLABORATION.md`
- Макеты UI схемы в панели: `Documentation/EXAMPLE.html` (разделы про схему БД / обзор)
