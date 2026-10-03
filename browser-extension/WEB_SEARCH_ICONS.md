# Иконки сервисов в пикере поиска

## Рекомендуемый пакет: [Simple Icons](https://github.com/simple-icons/simple-icons)

- **GitHub:** https://github.com/simple-icons/simple-icons (~3400+ брендов)
- **Лицензия:** CC0-1.0 (свободно для UI)
- **Каталог:** https://simpleicons.org
- **npm:** `simple-icons` (tree-shake при импорте по slug)

### Как сейчас в Companion

1. **`ICON_SLUG`** — только slug, для которых в пакете есть `icons/<slug>.svg` (проверять на [simpleicons.org](https://simpleicons.org) или в npm-пакете).  
   Пример ошибки: **`yandex` в Simple Icons нет** (есть только `yandexcloud` — это другой бренд).

2. **`ICON_LOCAL`** — свои файлы в `browser-extension/icons/brands/` + `chrome.runtime.getURL` (Яндекс и т.п.).

3. CDN: `https://cdn.jsdelivr.net/npm/simple-icons@<version>/icons/<slug>.svg`

4. Нет slug / 404 на CDN → **иконка-лупа** по умолчанию (`img` `error`).

### Альтернативы

| Пакет | GitHub | Заметка |
|--------|--------|---------|
| **thesvg** / `@thesvg/icons` | [glincker/thesvg](https://github.com/glincker/thesvg) | 6500+ брендов, MIT (код), tree-shake |
| **@icons-pack/react-simple-icons** | обёртка над Simple Icons | если понадобится React |
| **Tabler Icons** | [tabler/tabler-icons](https://github.com/tabler/tabler-icons) | не бренды, общие UI-иконки |

### Вендоринг (без CDN)

1. `npm install simple-icons` в корне репо.
2. Скрипт копирует нужные SVG в `browser-extension/icons/brands/`.
3. В каталоге `getIconUrl` → `chrome.runtime.getURL('icons/brands/google.svg')`.
4. Добавить файлы в `manifest.json` → `web_accessible_resources`.

Так надёжнее для офлайн и CSP.

### Добавить иконку сервису

1. Найти slug на simpleicons.org (например `googlemaps`).
2. Добавить в `ICON_SLUG` в `web-search-catalog-global.js`.
3. Перезагрузить расширение.
