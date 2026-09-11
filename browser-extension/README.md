# Agent Shell Companion

Расширение Google Chrome: **Side Panel** с Agent Shell на любой странице в интернете + плавающая панель Companion (вставка контекста в compose без отправки).

## Требования

- Google Chrome (Manifest V3, Side Panel API)
- Запущенный Agent CMS: `npm run start:https` → CMS `https://localhost:3443`, Voice `https://localhost:3488`

## Установка

1. `chrome://extensions` → **Режим разработчика** → **Загрузить распакованное расширение**
2. Выберите эту папку: `browser-extension/`
3. **Параметры расширения** → URL CMS (`https://localhost:3443`) и при необходимости `agent` id
4. После обновления файлов нажмите **↻** у расширения — Chrome запросит доступ **«Читать и изменять данные на всех сайтах»** (нужен для скриншота вкладки и page picker)

Подробная инструкция также в CMS: кнопка с иконкой Shell в шапке (после **WEB**).

## Использование

| Действие | Результат |
|----------|-----------|
| Клик по иконке расширения | Side Panel с Voice `/{agent}/extension/` |
| Иконка на toolbar (свёрнута) | Развернуть капсулу |
| Иконка на toolbar (уже открыта) | Открыть Side Panel |
| Перетащить иконку / капсулу | Сдвинуть влево, вправо или вверх, если перекрывает текст |
| ▾ справа | Свернуть капсулу |
| **Выбор** | Page picker — клик по блоку на странице |
| **Скрин ▾** | **Экран** или **Область** (выделить прямоугольник) → в чат, в буфер или скачать PNG |
| **Буфер ▾** | История последних копирований → в чат или снова в буфер (нужно включить в настройках) |
| **Страница ▾** | Заголовок и ссылка / текст страницы / Markdown |
| **Текст ▾** | Вставить выделение или промпт (прочитай, объясни, конспект, перевод, задача) |

Toolbar инжектится на обычных сайтах и на localhost, включая CMS/Voice.

## Настройки URL

В **Настройки расширения** (иконка ⚙ в Side Panel):

- **Читаемые URL** — `%D0%…` → кириллица в адресной строке, чате и «Страница ▾`
- **История буфера обмена** — последние 25 записей в «Буфер ▾» (локально в `chrome.storage`, не в cookies)

## Структура

```
browser-extension/
├── manifest.json
├── background.js       # мост к /api/shell/message
├── content-script.js   # toolbar на страницах
├── content-script.css
├── sidepanel.html      # iframe Agent Shell
├── sidepanel.js
├── options.html
├── options.js
└── icons/
```

## Связь с CMS

Тот же API, что и web Shell:

- `POST /api/shell/message?agent=` (на CMS `:3443`)
- Side Panel: `GET https://localhost:3488/{agent}/extension/`

Автор сообщений из расширения: `companion`.
