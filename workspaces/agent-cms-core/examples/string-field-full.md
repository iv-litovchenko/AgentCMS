---
awn-preview: ""
awn-emoji: 📝
awn-name: Полный пример awn.string
awn-status: 🟢 Открыта
awn-type: awn.topic
awn-create: "2026-06-22T12:00"
awn-update: 2026-06-22T12:00:00.000Z
awn-description: От awn.component → field-def → awn.string → configuration → запись → UI
awn-main: true
awn-category: examples
awn-owner: ""
awn-priority: ""
awn-tags:
  - example
  - string
  - schema
awn-color: ""
awn-version: 1
awn-sort: ""
---

# Полный пример: `awn.string`

Рабочая демо-тема в агенте **Platform core**. Открой файлы в дереве и пройди UI по шагам ниже.

---

## Карта файлов (что где лежит)

```
agent-cms-core/
│
├── types-of-components/                    ← КАТАЛОГ ТИПОВ (эталон)
│   ├── awn-storage/_base/configuration/schema.yml     → awn.component
│   ├── fields/awn-storage/_base/configuration/schema.yml → awn.field-def
│   └── fields/awn-storage/string/configuration/schema.yml → awn.string
│
└── examples/                               ← ЭТОТ ПРИМЕР (живое использование)
    ├── string-field-full.md                → тема (этот файл)
    └── awn-storage/string-field-full/
        ├── configuration.yml               → awn_schema + demo_string
        └── content/sample-record.md        → запись со значениями
```

Runtime **сейчас** читает типы из `awn-types/` в корне репо (те же id, что в catalog).

---

## Уровень 1 · `awn.component` (базовый компонент для всех)

**Файл:** `types-of-components/awn-storage/_base/configuration/schema.yml`

```yaml
id: awn.component
kind: component
properties:
  id: ...
  name: ...
  kind: ...
```

**Роль:** мета-модель «любой компонент в каталоге».  
**Не участвует** в форме свойств записи.

---

## Уровень 2 · `awn.field-def` (как описывать поле в configuration)

**Файл:** `types-of-components/fields/awn-storage/_base/configuration/schema.yml`

```yaml
id: awn.field-def
properties:
  type:     { required: true }    # awn.string, awn.boolean…
  title:    { required: true }
  hint:     { type: awn.string }
  required: { type: awn.boolean }
  # ...
```

**Роль:** какие ключи можно писать внутри каждого поля в `awn_schema`.

---

## Уровень 3 · `awn.string` (конкретный тип)

**Файл:** `types-of-components/fields/awn-storage/string/configuration/schema.yml`  
**Runtime:** `awn-types/fields/string.yml` (то же содержимое)

```yaml
id: awn.string
kind: field
widget: input
storage: string
settings: [description, hint, required, locked, format, default]
```

**Роль:** при `type: awn.string` UI рисует **однострочный input** и разрешает только ключи из `settings`.

---

## Уровень 4 · `configuration.yml` (схема этой темы)

**Файл:** `examples/awn-storage/string-field-full/configuration.yml`

```yaml
awn_schema:
  record:
    fields:
      demo_string:
        type: awn.string
        title: Демо-строка
        hint: Короткая однострочная строка
      demo_subtitle:
        type: awn.string
        title: Подзаголовок
```

**Роль:** «у записей этой темы есть поля `demo_string` и `demo_subtitle`».

---

## Уровень 5 · Запись (значения)

**Файл:** `examples/awn-storage/string-field-full/content/sample-record.md`

```yaml
---
awn-type: awn.record
awn-name: Пример записи
demo_string: Привет, Agent CMS
demo_subtitle: Полный пример awn.string
---
```

**Роль:** frontmatter хранит **значения**; схema приходит из configuration.

---

## Как посмотреть в UI

### A. Редактор схемы темы (описание полей)

1. Агент: **[Agent CMS] Platform core**
2. Тема: **examples → Полный пример awn.string** (этот файл)
3. Открой панель **схемы темы** (configuration / topic schema)
4. Вкладка **record** — строки:
   - `demo_string` · тип `awn.string` · название «Демо-строка»
   - `demo_subtitle` · тип `awn.string`
5. **Настройки** на строке → hint, description, format (из `field-def`)

Здесь редактируется **configuration.yml**, не значения записей.

### B. Форма свойств (значения полей)

1. В дереве: **examples → content → sample-record** (или `Пример записи`)
2. Вкладка **Свойства**
3. Должны быть строки:
   - **Демо-строка** → input с `Привет, Agent CMS`
   - **Подзаголовок** → input с `Полный пример awn.string`
4. Плюс стандартные поля из `awn.base` (имя, статус, теги…)

---

## Цепочка в коде (кратко)

```
string.yml
  → awn-fields-loader → fieldRegistry["awn.string"]

configuration.yml
  → getTopicSchemaPayload → merged.record.fields.demo_string

sample-record.md
  → getActiveAwnTypeDef → getPropsFieldDef("demo_string")
  → resolvePropsFieldWidget → "text" (input)
  → createPropsFormFieldRow → одна строка формы
```

---

## Что изменить для эксперимента

| Действие | Где | Эффект |
|----------|-----|--------|
| Добавить поле | configuration.yml или UI схемы | новая строка в Props |
| Поменять `title` | configuration.yml | новая подпись в форме |
| Поменять значение | sample-record.md → Свойства | frontmatter |
| Новый тип | `awn-types/fields/` + catalog | новый пункт в type select |

---

## Связанные топики

- [types-of-components/fields/string.md](../types-of-components/fields/string.md)
- [types-of-components/fields/base.md](../types-of-components/fields/base.md) — field-def
- [platform-map.md](../platform-map.md)
