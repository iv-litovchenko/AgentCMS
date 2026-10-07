# Agent CMS Voice — картинка агента (preview)

10 живых макетов: **куда** в интерфейсе Agent CMS / Voice можно подставить изображение агента (тот же источник, что `#agent-preview-thumb` в сайдбаре Editor).

Открыть (нужен запущенный `npm start`):

```
/examples/agent-cms-voice-agent-image/
```

Порт смотрите в выводе терминала (`Agent CMS HTTP at http://…`). В `.env` часто **не** 3000, а например `3001`. Если включён редирект HTTP→HTTPS — откройте тот же путь на **HTTPS** (часто `https://127.0.0.1:3443/examples/agent-cms-voice-agent-image/`).

Без сервера: двойной клик по `examples/agent-cms-voice-agent-image/index.html` (макеты 01–10 откроются; абсолютные URL вида `/shell/…` в паре демо не подгрузятся).

Symlink: `public/examples/agent-cms-voice-agent-image` → `examples/agent-cms-voice-agent-image`.

## Откуда берётся картинка

| Способ | Путь / API |
|--------|------------|
| Превью workspace | `preview.jpg` / `preview.png` в bundle `_Storage` (см. AWN Storage `_Preview`) |
| API (как в проде) | `GET /api/agents/workspace-preview?path=workspaces%2F…&thumb=1&max=800` |
| Слайдер вдохновения | `awn-media/slider/awn-storage/files/*` (медиатека «Слайдер») — ротация в `#agent-preview-wrap` |
| Фон окна Voice | поле «Своя картинка (URL)» в настройках окна Shell |

DOM в Editor (текущая точка):

`div#app-root → aside.sidebar → #agent-preview-wrap → img#agent-preview-thumb`

## 10 точек в UI

| # | Папка | Идея |
|---|--------|------|
| 01 | `01-sidebar-portrait` | Как сейчас: портрет 279×148 над селектором агента |
| 02 | `02-discuss-voice-strip` | Полоса сверху панели Agent CMS Voice (iframe) |
| 03 | `03-shell-hero-poster` | Центр главного экрана Voice вместо/поверх облачка |
| 04 | `04-shell-header-avatar` | Круглый чип в шапке Shell рядом с `#shell-header-agent` |
| 05 | `05-shell-chat-avatar` | Аватар у каждого ответа агента в ленте |
| 06 | `06-shell-window-bg` | Full-bleed фон окна (настройка background image) |
| 07 | `07-settings-character-duo` | Постер рядом с 3D-персонажем в настройках «Окно» |
| 08 | `08-pet-desktop` | Окно pet «поверх окон» |
| 09 | `09-extension-sidepanel` | Шапка sidepanel browser extension |
| 10 | `10-registry-slider` | Карточка в реестре агентов + слайдер кадров |

Галерея **15 идей композиции** (кадрирование, не зона UI): [`layout-ideas.html`](layout-ideas.html).

## 15 идей — как расположить персонажа в кадре

1. **Cover, лицо сверху** — `object-fit: cover; object-position: center 20%` (портрет в сайдбаре).
2. **Как в discuss-aside** — `object-position: center 28%`, высота 120px (уже в `styles.css`).
3. **Полный баннер 16:9** — широкий кадр, обрезка по поясницу.
4. **Вертикальный 3:4** — постер в герое Voice, лицо в верхней трети.
5. **Круг 1:1** — аватар в шапке и в чате (`border-radius: 50%`).
6. **Contain + поля** — целый персонаж без обрезки (pet, прозрачный PNG).
7. **Blur backdrop** — размытая копия + чёткий центр (фон окна).
8. **Градиент вниз** — fade в цвет панели чата, текст читается поверх.
9. **Слайдер кадров** — несколько эмоций/ракурсов из `slider/`.
10. **Ken Burns / orbit** — лёгкое движение при `is-revealed` (как shine в сайдбаре).
11. **Нижний якорь** — `object-position: center bottom` для роста «из-за» панели микрофона.
12. **Левый профиль** — `object-position: 25% center` для диалога «смотрит на чат».
13. **Правый профиль** — зеркально, если чат слева.
14. **Монохром / silhouette** — для компакт-режима, меньше шума.
15. **Lightbox** — миниатюра в сайдбаре, клик → полный `data-full-src` без `thumb=1`.

См. визуально: [layout-ideas.html](layout-ideas.html).
