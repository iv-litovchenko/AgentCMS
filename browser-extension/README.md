# Agent Shell Companion

Расширение Google Chrome: **Side Panel** с Agent Shell на любой странице в интернете + плавающие кнопки «Страница» / «Выделение».

## Требования

- Google Chrome (Manifest V3, Side Panel API)
- Запущенный Agent CMS: из корня репозитория `npm start` → http://localhost:3000

## Установка

1. `chrome://extensions` → **Режим разработчика** → **Загрузить распакованное расширение**
2. Выберите эту папку: `browser-extension/`
3. **Параметры расширения** → URL CMS (`http://localhost:3000`) и при необходимости `agent` id

Подробная инструкция также в CMS: кнопка с иконкой Shell в шапке (после **WEB**).

## Использование

| Действие | Результат |
|----------|-----------|
| Клик по иконке расширения | Side Panel с `/shell` |
| **Страница** на toolbar | URL, заголовок и excerpt → `/api/shell/message` |
| **Выделение** | Выделенный текст + URL → Shell |
| Иконка на toolbar | Открыть Side Panel |

Toolbar **не** инжектится на `localhost:3000` — там уже есть встроенная панель Discuss → Agent Shell.

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

- `POST /api/shell/message?agent=`
- Side Panel: `GET /shell?agent=`

Автор сообщений из расширения: `companion`.
