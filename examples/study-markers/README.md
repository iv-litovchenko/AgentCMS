# Пометки в markdown-конспектах

Система личных пометок `[повторить]:` и `[вопрос]:` для отслеживания того, что нужно повторить или доизучить.

## Синтаксис

Маркер — отдельная строка сразу после фрагмента конспекта:

```markdown
## Типы данных

`==` сравнивает ссылки, `.equals()` — содержимое.

[повторить]: разница между == и equals для объектов

[вопрос]: когда использовать bounded wildcard extends?
```

## Запуск

### HTML-пример (дашборд)

```bash
open examples/study-markers/03-study-markers.html
# или
npx serve examples/study-markers
```

### CLI-скрипт

```bash
cd examples/study-markers

# все пометки в консоль
node collect-markers.js --input sample-notes/

# только вопросы
node collect-markers.js -i sample-notes/ -t вопрос

# только повторение
node collect-markers.js -i sample-notes/ -t повторить

# экспорт в HTML / Markdown / JSON
node collect-markers.js -i sample-notes/ -o report.html
node collect-markers.js -i sample-notes/ -o report.md -f md
node collect-markers.js -i sample-notes/ -o report.json -f json
```

## Что собирает скрипт

Для каждой пометки:

| Поле | Описание |
|------|----------|
| `type` | `повторить` или `вопрос` |
| `text` | текст после двоеточия |
| `fileName` | исходный файл |
| `line` | номер строки |
| `section` | цепочка заголовков (`H1 → H2 → H3`) |
| `href` | ссылка обратно: `file.md#якорь-раздела` |

Группировка: **тип маркера** → **файл** → список пометок.

## Файлы

| Файл | Назначение |
|------|------------|
| `collect-markers.js` | CLI-скрипт сканирования |
| `sample-notes/*.md` | Примеры конспектов с пометками |
| `03-study-markers.html` | Интерактивный дашборд |
| `markers-renderer.js` | Рендер списка в браузере |
