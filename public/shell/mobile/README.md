# Mobile web Shell

Облегчённый клиент Agent Shell для iPhone Safari и «На экран Домой».

## URL

```
http://<IP-Mac>:3000/shell/mobile/
```

Пример: `http://192.168.0.102:3000/shell/mobile/index.html`

## Общий код с iOS

| Файл | Назначение |
|------|------------|
| `public/shell/shell-contract.js` | константы API, фазы, SSE |
| `public/shell/shell-client.js` | HTTP + SSE клиент (web) |
| `mobile/SHELL-API.md` | контракт для Swift |

iOS: `mobile/iphone-shell/AgentShell/Services/` — те же endpoints.

## Возможности

- Hold-to-talk + **подтверждение текста** перед отправкой
- История диалога (сессия), «Вы спросили»
- TTS/STT: **только чтение** — подтягиваются из Agent Shell (desktop) / `.agent-shell/settings.json`
- TTS на mobile: Safari или сервер CMS (edge/say — как в desktop settings)
- Markdown в ответах, Share, копирование
- Pull-to-refresh (потяните вниз), отмена отправки
- Chip workspace + QwenPaw, справка ?
- **Device-чипы**: время, батарея, ориентация (компас + наклон; на iOS — нажмите 🧭 для разрешения)
- **3D-персонаж** (те же GLB, что desktop Shell) + CSS «облачко»; кнопка 🎭 — выбор модели
- **Подложка персонажа** — обои или тёмный градиент только в сцене над микрофоном

## Персонаж

Над микрофоном — сцена с анимацией по фазам (ожидание / слушаю / думаю / говорю). Модель та же, что в desktop Shell (`shell-character.js`); выбор сохраняется в `localStorage` (`shell-character-model`).

На слабом Wi‑Fi или без WebGL — автоматически CSS-облачко.

## Подложка персонажа

Обои (`/shell/wallpaper.png`) или тёмный градиент — **только в сцене персонажа**, не на всей странице. Переключение в ⚙️, сохраняется локально на устройстве.

## Mac

```bash
HOST=0.0.0.0 npm start
```

### iPhone: микрофон — HTTPS на порту **3443**

Safari не спрашивает микрофон по `http://192.168.x.x:3000`. Нужен **HTTPS на 3443**.

**Терминал 1** — CMS как обычно:
```bash
HOST=0.0.0.0 npm start
```

**Терминал 2** — добавить HTTPS:
```bash
npm run start:https
```

**На iPhone:**
```
https://192.168.0.102:3443/shell/mobile/
```
(не `:3000`!)

Сертификат: **Подробнее → Перейти на сайт**. Потом удерживайте 🎤.

После изменений в JS/CSS — обновите страницу на iPhone (pull-to-refresh).
