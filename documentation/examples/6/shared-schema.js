/**
 * Определения полей для демо example/6.
 * Держите в синхроне с node-props.schema.yaml
 */

/** @typedef {{ id: string, num: string, title: string, desc: string, schemaYaml: string, frontmatterYaml: string, storageKind: string, status: 'now'|'planned', widgetHtml: string }} FieldDemo */

/** @type {FieldDemo[]} */
export const FIELD_DEMOS = [
  {
    id: "01-string",
    num: "01",
    title: "string",
    desc: "Короткая строка: title, slug, имя. В CMS — однострочный input.",
    storageKind: "string",
    status: "now",
    schemaYaml: `title:
  type: string
  key: title
  title: Название ноды
  constraints:
    minLength: 1
    maxLength: 120
  ui:
    widget: input
    placeholder: "Дальнобойщики-2"`,
    frontmatterYaml: `title: Дальнобойщики-2`,
    widgetHtml: `<label class="field-row">
  <span class="field-key">title</span>
  <input type="text" class="field-control" value="Дальнобойщики-2" />
</label>`
  },
  {
    id: "02-text",
    num: "02",
    title: "text (multiline)",
    desc: "Длинный текст: summary с literal block | в YAML. В форме — textarea.",
    storageKind: "string",
    status: "planned",
    schemaYaml: `summary:
  type: text
  key: summary
  title: Краткое описание
  ui:
    widget: textarea
    rows: 4`,
    frontmatterYaml: `summary: |
  Нода про маршруты и логистику.
  Используется агентом-координатором.`,
    widgetHtml: `<label class="field-row field-row--stack">
  <span class="field-key">summary</span>
  <textarea class="field-control" rows="4">Нода про маршруты и логистику.
Используется агентом-координатором.</textarea>
</label>`
  },
  {
    id: "03-number",
    num: "03",
    title: "integer / number",
    desc: "Число без кавычек: priority, weight. Парсер распознаёт integer и float.",
    storageKind: "number",
    status: "now",
    schemaYaml: `priority:
  type: integer
  key: priority
  title: Приоритет
  default: 0
  constraints:
    minimum: 0
    maximum: 100
  ui:
    widget: number`,
    frontmatterYaml: `priority: 10`,
    widgetHtml: `<label class="field-row">
  <span class="field-key">priority</span>
  <input type="number" class="field-control field-control--narrow" value="10" min="0" max="100" />
</label>`
  },
  {
    id: "04-boolean",
    num: "04",
    title: "boolean",
    desc: "true / false без кавычек. В форме — checkbox или toggle.",
    storageKind: "bool",
    status: "now",
    schemaYaml: `published:
  type: boolean
  key: published
  title: Опубликовано
  default: false
  ui:
    widget: toggle`,
    frontmatterYaml: `published: true`,
    widgetHtml: `<label class="field-row field-row--bool">
  <span class="field-key">published</span>
  <input type="checkbox" class="field-toggle" checked />
  <span class="field-bool-label">true</span>
</label>`
  },
  {
    id: "05-null",
    num: "05",
    title: "null",
    desc: "Пустое значение: null или ~. Для опциональных ссылок на родителя.",
    storageKind: "null",
    status: "now",
    schemaYaml: `parent:
  type: "null"
  key: parent
  title: Родительская нода
  description: null если корневая
  ui:
    widget: nullable-input`,
    frontmatterYaml: `parent: null`,
    widgetHtml: `<label class="field-row">
  <span class="field-key">parent</span>
  <input type="text" class="field-control field-control--muted" placeholder="(пусто)" value="" />
  <button type="button" class="field-chip">null</button>
</label>`
  },
  {
    id: "06-array-block",
    num: "06",
    title: "array (block)",
    desc: "Список через дефисы — предпочтительный формат для tags.",
    storageKind: "array",
    status: "now",
    schemaYaml: `tags:
  type: array
  key: tags
  title: Теги
  items:
    type: string
  ui:
    widget: tags
    allowInline: false`,
    frontmatterYaml: `tags:
  - логистика
  - маршрут
  - demo`,
    widgetHtml: `<label class="field-row field-row--stack">
  <span class="field-key">tags</span>
  <div class="field-tags">
    <span class="tag-pill">логистика <button type="button" aria-label="Удалить">×</button></span>
    <span class="tag-pill">маршрут <button type="button" aria-label="Удалить">×</button></span>
    <span class="tag-pill">demo <button type="button" aria-label="Удалить">×</button></span>
    <input type="text" class="tag-input" placeholder="+ тег" />
  </div>
</label>`
  },
  {
    id: "07-array-inline",
    num: "07",
    title: "array (inline)",
    desc: "Короткий список в одну строку: [a, b]. Парсер main.js поддерживает.",
    storageKind: "array",
    status: "now",
    schemaYaml: `aliases:
  type: array
  key: aliases
  title: Псевдонимы
  items:
    type: string
  ui:
    widget: comma-separated
    allowInline: true`,
    frontmatterYaml: `aliases: [truckers, routes]`,
    widgetHtml: `<label class="field-row">
  <span class="field-key">aliases</span>
  <input type="text" class="field-control" value="truckers, routes" />
  <span class="field-hint">через запятую → YAML [a, b]</span>
</label>`
  },
  {
    id: "08-enum",
    num: "08",
    title: "enum",
    desc: "Ограниченный набор строк: status. В YAML — обычная строка, валидация по enum в схеме.",
    storageKind: "string",
    status: "now",
    schemaYaml: `status:
  type: enum
  key: status
  title: Статус ноды
  enum: [draft, active, archived]
  default: draft
  ui:
    widget: select`,
    frontmatterYaml: `status: active`,
    widgetHtml: `<label class="field-row">
  <span class="field-key">status</span>
  <select class="field-control">
    <option>draft</option>
    <option selected>active</option>
    <option>archived</option>
  </select>
</label>`
  },
  {
    id: "09-date",
    num: "09",
    title: "date",
    desc: "Дата ISO YYYY-MM-DD. Хранится как string, проверяется по format.",
    storageKind: "string",
    status: "planned",
    schemaYaml: `due_date:
  type: date
  key: due_date
  format: date
  title: Срок
  constraints:
    format: YYYY-MM-DD`,
    frontmatterYaml: `due_date: "2026-06-01"`,
    widgetHtml: `<label class="field-row">
  <span class="field-key">due_date</span>
  <input type="date" class="field-control field-control--narrow" value="2026-06-01" />
</label>`
  },
  {
    id: "10-datetime",
    num: "10",
    title: "datetime",
    desc: "Дата-время с таймзоной. В YAML — строка в кавычках.",
    storageKind: "string",
    status: "planned",
    schemaYaml: `scheduled_at:
  type: datetime
  key: scheduled_at
  format: date-time
  title: Запланировано`,
    frontmatterYaml: `scheduled_at: "2026-05-26T14:30:00+03:00"`,
    widgetHtml: `<label class="field-row">
  <span class="field-key">scheduled_at</span>
  <input type="datetime-local" class="field-control" value="2026-05-26T14:30" />
</label>`
  },
  {
    id: "11-url",
    num: "11",
    title: "url",
    desc: "Ссылка https://. Валидация URI, в storage — string.",
    storageKind: "string",
    status: "planned",
    schemaYaml: `homepage:
  type: url
  key: homepage
  title: Ссылка
  ui:
    widget: url`,
    frontmatterYaml: `homepage: "https://example.com/nodes/dalnoboy"`,
    widgetHtml: `<label class="field-row">
  <span class="field-key">homepage</span>
  <input type="url" class="field-control" value="https://example.com/nodes/dalnoboy" />
</label>`
  },
  {
    id: "12-color",
    num: "12",
    title: "color",
    desc: "HEX-цвет для UI ноды в дереве/карточках.",
    storageKind: "string",
    status: "planned",
    schemaYaml: `accent_color:
  type: color
  key: accent_color
  title: Акцент
  constraints:
    pattern: "^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$"
  ui:
    widget: color`,
    frontmatterYaml: `accent_color: "#2563eb"`,
    widgetHtml: `<label class="field-row">
  <span class="field-key">accent_color</span>
  <input type="color" class="field-color" value="#2563eb" />
  <input type="text" class="field-control field-control--narrow" value="#2563eb" />
</label>`
  },
  {
    id: "13-object",
    num: "13",
    title: "object (nested)",
    desc: "Вложенный объект — планируется. Пока только raw YAML или подформа.",
    storageKind: "object",
    status: "planned",
    schemaYaml: `metadata:
  type: object
  key: metadata
  title: Метаданные
  properties:
    source:
      type: string
    revision:
      type: integer
  ui:
    widget: yaml-block`,
    frontmatterYaml: `metadata:
  source: import
  revision: 3`,
    widgetHtml: `<div class="field-row field-row--stack">
  <span class="field-key">metadata</span>
  <textarea class="field-control field-control--mono" rows="4">source: import
revision: 3</textarea>
  <p class="field-note">🔜 parsePropsYaml пока не разбирает вложенность</p>
</div>`
  },
  {
    id: "14-full-node",
    num: "14",
    title: "Полный frontmatter ноды",
    desc: "Все типы в одном _.node.md — эталон для агента и тестов.",
    storageKind: "mixed",
    status: "now",
    schemaYaml: `# См. examples.node_dalnoboy в node-props.schema.yaml`,
    frontmatterYaml: `title: Дальнобойщики-2
slug: dalnoboyshchiki-2
summary: |
  Нода про маршруты и логистику.
status: active
priority: 10
published: true
parent: null
tags:
  - логистика
  - маршрут
aliases: [truckers, routes]
due_date: "2026-06-01"
scheduled_at: "2026-05-26T14:30:00+03:00"
homepage: "https://example.com/nodes/dalnoboy"
accent_color: "#2563eb"`,
    widgetHtml: `<p class="field-note">Откройте демо 01–13 для отдельных контролов или каталог 15.</p>`
  },
  {
    id: "15-catalog",
    num: "15",
    title: "Каталог виджетов",
    desc: "Все контролы на одной странице — для сравнения плотности и выравнивания.",
    storageKind: "mixed",
    status: "now",
    schemaYaml: `# Агрегация definitions из node-props.schema.yaml`,
    frontmatterYaml: `# См. пример 14-full-node`,
    widgetHtml: `<!-- built dynamically in app.js -->`
  }
];

export function getCatalogWidgetHtml() {
  return FIELD_DEMOS.filter((d) => d.id !== "15-catalog" && d.id !== "14-full-node")
    .map((d) => d.widgetHtml)
    .join("\n");
}
