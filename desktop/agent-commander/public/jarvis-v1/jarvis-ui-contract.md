# Jarvis UI Kit — контракт для агента

Агент возвращает **HTML-фрагмент** (не полную страницу) для панели HUD / Shell.

## Обёртка

```html
<div class="jui-root jui-stack">
  <!-- контент -->
</div>
```

Подключение стилей: `jarvis-ui-kit.css` (рядом с `index.html` в `jarvis-v1/`)

## Правила

1. Только классы с префиксом **`jui-`**. Без произвольных inline-стилей (кроме высоты столбцов `.jui-bar` и `conic-gradient` у donut).
2. Таблицы: `.jui-table-wrap` > `table.jui-table`.
3. Формы: `.jui-form` + `.jui-field` + `label` + input/select/textarea.
4. KPI: `.jui-card.jui-stat` + `.jui-stat-val` + `.jui-stat-label`.
5. Markdown: передайте **markdown-текст** — HUD вызовет `jarvisRenderPanel({ kind: 'markdown', content: '...' })`.
6. Mermaid: `kind: 'mermaid'`, content — исходник диagram.

## API в браузере (JARVIS HUD)

```js
jarvisRenderPanel({
  title: "Результаты поиска",
  kind: "html",       // html | markdown | mermaid
  content: "<div class=\"jui-root\">…</div>"
});
```

Откроет/обновит окно **«Панель агента»** в секции окон внизу.

## Каталог примеров

Файл `jarvis-ui-samples.js` — эталоны. В HUD: **Окна → UI Kit · галерея**.

## Классы (кратко)

| Класс | Назначение |
|-------|------------|
| `jui-stack`, `jui-row`, `jui-grid`, `jui-grid-2/3/4` | Сетка |
| `jui-card` | Блок |
| `jui-stat`, `tone-ok`, `tone-warn` | KPI |
| `jui-table`, `jui-table-wrap` | Таблица |
| `jui-form`, `jui-field`, `jui-btn` | Форма |
| `jui-bars`, `jui-bar` | Столбчатый график |
| `jui-sparkline` | SVG линия |
| `jui-donut`, `jui-donut-inner` | Кольцо % |
| `jui-timeline`, `jui-timeline-item` | Лента |
| `jui-alert`, `warn`, `danger` | Статус |
| `jui-kv` | dl метаданных |
| `jui-kanban`, `jui-kanban-col`, `jui-kanban-card` | Доска |
| `jui-md` | Обёртка после markdown-it |
| `jui-mermaid` | Обёртка mermaid |
| `jui-badge`, `ok`, `warn`, `danger` | Бейдж |

## Voice / Shell

Текст для экрана после `VOICE-END` / marker TTS break может содержать этот HTML — Shell/HUD рендерит в панель.
