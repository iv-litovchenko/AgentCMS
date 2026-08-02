# Накопители информации (`awn-data/`)

> Черновик v0.2 · 2026-08-02  
> Два вида накопителей: **коллекция** и **одиночка**.

## Два вида

### 1. Коллекция (`kind: collection`)

Много записей. Может быть **плоской** или **иерархической**.

```
awn-data/tasks/
├── manifest.md                  ← описание (markdown, без свойств записей)
├── configuration-schema.yml     ← схема полей
├── sort.json                    ← порядок корневых id (опционально)
├── 1.md
├── 2.md
└── 1/                           ← вложенность: дочерние записи
    └── 3.md                     ← parent: "1" в frontmatter
```

| Файл | Роль |
|------|------|
| `manifest.md` | Только текст для человека — **без** frontmatter полей записей |
| `configuration-schema.yml` | `kind: collection`, поля, правила id |
| `{id}.md` | Запись: YAML-frontmatter + тело markdown |

**Иерархия** — два способа (можно вместе):

1. **Поле `parent`** — id родительской записи в frontmatter.
2. **Вложенные папки** — `{parentId}/{id}.md` (физическое дерево).

Loader собирает дерево: сначала `parent`, затем путь папки как fallback.

### 2. Одиночка (`kind: singleton`)

Ровно **одна** запись — обычно настройки.

```
awn-data/settings-global/
├── configuration-schema.yml
└── main.md                      ← единственный файл данных
```

| Файл | Роль |
|------|------|
| `configuration-schema.yml` | `kind: singleton`, поля |
| `main.md` | Единственная запись (frontmatter + тело) |

У одиночки **нет** `manifest.md` — описание можно в `configuration-schema.yml` (`description`) или в теле `main.md`.

---

## Базовая схема

```yaml
# awn-data/_base/configuration-schema.yml
version: 1
layer: awn-data-base
fields:
  id: { type: awn.string, title: ID, locked: true }
  created: { type: awn.datetime, title: Создано }
  updated: { type: awn.datetime, title: Обновлено }
```

Коллекции могут добавить:

```yaml
fields:
  parent:
    type: awn.string
    title: Родитель
    description: id родительской записи (иерархия)
```

---

## Примеры configuration-schema.yml

### Коллекция

```yaml
version: 1
kind: collection
id: tasks
name: Задачи
extends: ../_base/configuration-schema.yml
record:
  id-mode: numeric
  file: "{id}.md"
  hierarchy: true          # разрешить parent + вложенные папки
fields:
  title: { type: awn.string, title: Название, required: true }
  parent: { type: awn.string, title: Родитель }
  status: { type: awn.enum, enum: [open, done], default: open }
```

### Одиночка

```yaml
version: 1
kind: singleton
id: settings-global
name: Глобальные настройки
extends: ../_base/configuration-schema.yml
record:
  file: main.md
fields:
  site-name: { type: awn.string, title: Название сайта }
  maintenance-mode: { type: awn.boolean, title: Режим обслуживания, default: false }
```

---

## Расположение

```
{agentRoot}/awn-data/
├── manifest.md              # area (опционально)
├── _base/
├── tasks/                   # collection
├── settings-global/         # singleton
└── taxonomies/statuses/     # collection (taxonomy convention)
```

---

## API

| Endpoint | Назначение |
|----------|------------|
| `GET /api/awn-data` | список накопителей |
| `GET /api/awn-data?store=tasks` | meta + schema + records/singleton |

Loader: `awn-data-loader.js`

---

## MVP

1. ✅ SPEC + примеры  
2. ✅ `awn-data-loader.js` + `GET /api/awn-data`  
3. Sidebar — динамический список  
4. Tabular / form UI — позже
