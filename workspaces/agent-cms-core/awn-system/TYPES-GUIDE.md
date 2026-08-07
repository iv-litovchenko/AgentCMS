# Как устроены типы (шпаргалка)

> Главная мысль: **тип = YAML-контракт, который исполняет рантайм.**
> Ты не пишешь код — ты описываешь тип, а рантайм знает, что с ним делать.

## Три яруса типов

| Ярус | Что это | Можно добавлять YAML-ом? | Пример |
|------|---------|--------------------------|--------|
| **1. Декларативный** | тип = данные, рантайм их просто исполняет | ✅ да, сразу работает | md-block (`template`), taxonomy (`data-path`) |
| **2. Конфиг над примитивом** | тип ссылается на готовый примитив и настраивает его | ✅ да, если примитив есть | вид (`contentMode: tabular`), поле (`widget: select`) |
| **3. Примитив** | новое поведение в коде, делается один раз | ❌ нужен разработчик | режим `tabular`, виджет `select` |

Правило: **новые типы 1–2 яруса добавляй свободно. 3 ярус (примитивы) — редкая работа в коде.**
Если добавляешь вид/поле — сначала проверь, какой примитив (`contentMode`/`widget`) уже есть,
и настрой его. Новый примитив заводится только когда ни один существующий не подходит.

## Как добавить новый домен («пакет»)

Домены (pages, content, slots, fields, md-blocks, taxonomies, mixins) —
это «какие бывают компоненты». Их список — источник правды в `registry.yml → domains:`.
Чтобы завтра добавить свой домен-пакет (например `settings`):

1. Заведи папку `awn-system/types/settings/`.
2. Допиши в `registry.yml → domains:` запись (объектом, чтобы задать подпись и kind):

```yaml
domains:
  # …встроенные…
  - id: settings
    label: Настройки
    kind: type        # kind для новых типов: type|slot|field|block|view|taxonomy|mixin
    icon: "⚙"
```

3. Готово: домен появится в дереве (с ярлыком и кнопкой «+»), а его типы —
   в каталоге типов и инспекторе. Новый тип создаётся кнопкой «+» или файлом
   `awn-system/types/settings/<slug>.yml` с `domain: settings`.

Влияет ли новый домен на UI Agent CMS «из коробки» — зависит от того, читает ли
рантайм этот домен (см. карту ниже). По умолчанию новый домен = данные/типы для
агента; чтобы он двигал конкретный экран, нужна точка чтения в рантайме.

## Что реально влияет на UI (честная карта)

Тип влияет на приложение **только там, где рантайм реально читает этот тип**. Сейчас так:

| Домен | Читается рантаймом? | Куда именно попадает |
|-------|---------------------|----------------------|
| **md-blocks** | ✅ да | палитра блоков редактора (нужны `template` и `status: active`) |
| **fields** | ✅ да | форма свойств строится из типа поля (`widget`) |
| **pages/content** | ✅ да | узлы дерева, форма, меню «создать» |
| **taxonomies** | ✅ да | `awn-data/taxonomies/*` — CSV-справочники; не page-type |
| **slots** | ⚠️ декларация | набор слотов в дереве **фиксирован рантаймом** (скан папок `awn-storage`). `storage-driver` (internal/external/tabular) совпадает с формами памяти в счётчике, но тип слота в дерево не подставляется |

Индикатор «Влияет / Не влияет» в инспекторе типа показывает это для каждого конкретного типа.
Если написано «декларация / данные для агента» — тип корректен, но рантайм его в UI не подставляет
(это нормально: часть типов существует как данные/документация для агента).

## Обязательные поля любого типа

```yaml
id: awn.<domain>.<name>   # стабильный идентификатор
name: Человеческое имя
kind: type|field|block|view|slot|mixin|taxonomy|base
domain: pages|content|fields|md-blocks|slots|mixins|taxonomies
status: active            # active | draft | disabled
extends: <id родителя>    # цепочка наследования (см. _base.yml в домене)
description: Зачем этот тип
```

**Важно:** `extends` должен указывать на существующий тип. В каждом домене есть `_base.yml` —
наследуй от него (например поле → `extends: awn.field.base`). Битый `extends` = мёртвый тип.

## Поля и их группы (для pages/content)

Поля описываются в `fields:` и делятся на **группы** (`group:`). Не сваливай всё в кучу —
раскладывай по смыслу. Базовые группы заданы в `pages/_base.yml`:

| group | Что туда | Показывать |
|-------|----------|------------|
| `content` | что реально заполняет человек/агент (имя, статус, описание, теги) | всегда |
| `nav` | поведение узла в дереве/на главной (для ws/area/topic) | свёрнуто |
| `system` | авто-поля (тип, даты, версия), только чтение | свёрнуто |

**Для записи (`awn.content.record`) важны только поля группы `content`.**
Остальное наследуется, но это фон, а не то, что ты заполняешь.

Описание одного поля:

```yaml
fields:
  my-field:
    type: awn.field.string   # тип поля из домена fields
    title: Подпись в форме
    description: Пояснение
    group: content           # в какую группу формы попадёт
    required: false
    locked: false            # true = только чтение
    default: ""
```

## Шпаргалка: как добавить тип в каждом домене

- **Поле (fields):** `extends: awn.field.base`, задай `widget` (input/select/toggle/…),
  `storage`, `settings[]`. Виджет должен быть из существующих примитивов.
- **Блок редактора (md-blocks):** `extends: awn.block.base`, задай `template` (текст),
  `group`, `sort`, `icon`. Работает сразу — это эталон 1 яруса.
- **Слот (slots):** `extends: awn.slot`, задай `storage-shape` (single-file /
  multi-file / tabular — форма памяти), `path`, `allowed-content[]`, `accept-files[]`.
- **Таксономия (taxonomies):** `extends: awn.taxonomy.base`, задай `data-path`, `props-field`.
- **Миксин (mixins):** переиспользуемый набор `fields:`; подключается через `mixins: [id]`.

## Наследование базы (важно)

- `awn.entity` — корень (id, name, kind, extends, status).
- `awn.base` — **лёгкая база**: только `content` + `system` поля. От неё наследуют
  **записи и контент** (`awn.content.record`, `dialog`, `comment`, категории…).
- `awn.page.base` — наследует `awn.base` и добавляет `nav` + `runtime`. От неё
  наследуют **узлы дерева** (`awn.page.ws/area/topic`).

Поэтому у записи мало полей (только важное), а у темы — полный набор. Форма
свойств теперь **зависит от типа**: показывает поля именно этого типа.

## Группы полей в форме

Группы объявляются в `field-groups:` базового типа и раскрываются в форме как
сворачиваемые секции. Первая (`content`) открыта, остальные (`nav`, `runtime`,
`system`) свёрнуты. У поля указывай `group: <id>`.

## Проверка модели

Валидатор здоровья типов:

- MCP: **`get_type_health`**
- API: `GET /api/agent/type-health`

Ловит: битый `extends`, вид без `contentMode`, блок без `template`, слот без
`path`, несоответствие `domain`. Запускай до и после правок типов.

В инспекторе каждого типа есть строка **«Влияет / Не влияет»** — показывает, что
именно в рантайме читает этот тип (переключатель видов, хранилище, палитра
блоков, поле темы…) или что это просто данные для агента. Так видно, «живой» тип
или декоративный.

## Добавить тип через «+» (в дереве типов)

У каждого домена в дереве есть «+». Он создаёт файл
`awn-system/types/<domain>/<slug>.yml` уже с обязательными ключами домена —
тип сразу «живой» (не мёртвый заготыш):

- **slot** → `path`, `allowed-content`, `accept-files`.
- **view** → `contentMode: external`, `applies-to-slots: [main]`.
- **taxonomy** → `props-field`, `data-path`, `preset`, `create-node-*`.
- **md-block** → `group`, `sort`, `icon`, `render`, `template`.
- **field** → `widget`, `storage`, `settings`.

После создания открывается инспектор типа с доменными контролами.

## Форма инспектора самоописывается через `properties:`

Инспектор НЕ хардкодит, какие поля у слота/вида/таксономии/блока. Он строит
контролы из блока **`properties:`** базового типа домена (по цепочке
наследования). Хочешь новое поле в форме — **добавь его в `properties:` базы**,
и оно само появится:

```yaml
# awn-system/types/<domain>/_base.yml
properties:
  my-key:
    title: Моё поле
    description: Подсказка (показывается при наведении)
    required: true          # добавит «*» и уберёт «— не задан —»
    enum: [a, b, c]         # → выпадающий список
    type: list              # → список, пишется как YAML-массив
    type: boolean           # → чекбокс
```

Так задаются уже существующие: `awn.slot` → `path` (required) + `allowed-content`
(list) + `accept-files` (list); `awn.taxonomy.base` → `props-field` / `data-path`
/ `preset` (enum); `awn.block.base` → `group` / `icon` / `render` (enum) /
`fence-tag` / `renderer`.

Служебные ключи (`id`, `name`, `description`, `status`, `kind`, `extends`,
`domain`) в доменную часть не попадают — они редактируются сверху. Домен
`fields` — исключение: там `properties:` описывает экземпляр поля, а top-level
типа-поля (`widget`, `storage`) показывается курируемо.

## Markdown-блок с JS-рендером (fence)

Блок может рисоваться не текстом-шаблоном, а собственным JS. Механизм — как у
mermaid: блок вставляет **fenced-блок** с тегом, а движок находит его и вызывает
JS-рендер.

1. Тип блока (`awn-system/types/md-blocks/<slug>.yml`):

```yaml
id: awn.block.chart
name: График
kind: block
domain: md-blocks
status: active
extends: awn.block.base
group: misc
render: fence                              # не template, а JS
fence-tag: awn-chart                       # язык fenced-блока
renderer: awn-system/renderers/chart.js    # где лежит JS
template: |
  ```awn-chart
  { "type": "bar", "data": [1,2,3] }
  ```
```

2. JS-рендер (`awn-system/renderers/<slug>.js`) — ES-модуль, экспорт `default`
   (или `render`). **JS пишет агент** и кладёт сюда (запись `.js` разрешена
   только в `awn-system/renderers/`):

```js
export default function render(target, source, ctx) {
  // target — DOM-контейнер; source — текст внутри ```awn-chart … ```;
  // ctx — { agentId, blockId, fenceTag }
  const data = JSON.parse(source || "{}");
  target.textContent = "Точек: " + (data.data || []).length;
}
```

Движок: находит fenced-блок с `fence-tag`, грузит `renderer` через
`GET /api/agent-system/renderer?path=…` (MIME `application/javascript`, dynamic
`import()`), вызывает функцию. Ошибка рендера показывается в блоке, страницу не
роняет. Кнопка **«Создать JS-рендер»** в инспекторе пишет стартовый файл.

## Частые ошибки

1. `extends` на несуществующий тип → мёртвый тип (проверь `_base.yml` домена).
2. Вид без `contentMode` → не появится в переключателе.
3. Поле без `widget`/с неизвестным `widget` → упадёт в дефолтный ввод.
4. Всё в одной группе → форма превращается в стену полей. Используй `group`.
5. `render: fence` без `fence-tag`/`renderer` → блок не отрисуется (покажет текст).
6. `.js`-рендер вне `awn-system/renderers/` → запись запрещена.
