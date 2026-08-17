# Agent Shell — миграция в единый клиент

Цель: один универсальный Agent Shell для **desktop · browser · mobile · companion**.  
Отдельный `/shell/mobile/` — **deprecated**, функционал переносится в `/shell/`.

Статусы: ❌ нет · ⚠️ частично · ✅ есть

---

## Mobile → Universal Shell (нет в desktop)

Сортировка: по **Категория**. Номера `#` сохранены для ссылок в плане.

| # | Категория | Функция | Desktop |
|---|-----------|---------|---------|
| 1 | Диалог | Единая лента «Диалог» (вопрос + ответ в одном scroll) | ✅ |
| 2 | Диалог | Блок «Ваш вопрос» (последнее сообщение пользователя) | ✅ |
| 3 | Диалог | История сессии (до 12 пар Q/A, sessionStorage) | ✅ |
| 4 | Диалог | Sheet «История» со списком и ролями | ✅ |
| 5 | Диалог | Сворачивание диалога + preview в свёрнутом виде | ✅ |
| 6 | Диалог | Copy ответа в буфер | ✅ |
| 7 | Диалог | Share ответа (Web Share API) | ✅ |
| 8 | Диалог | Pull-to-refresh → reconnect | ✅ |
| 9 | Диалог | Кнопка ↻ переподключения | ✅ |
| 10 | Диалог | Status dot (online / offline / error) | ✅ |
| 11 | Диалог | Баннер ошибок с подсказками | ✅ |
| 48 | Диалог | pushHistory при каждой паре Q/A | ✅ |
| 49 | Диалог | lastReplyRaw для copy/share | ✅ |
| 12 | Голос | Tap-микрофон (тап → запись → тап → стоп) | ❌ (есть PTT) |
| 13 | Голос | Диалог подтверждения голоса (edit / send / retry / cancel) | ❌ |
| 14 | Голос | Настройка «Подтверждать голос перед отправкой» | ❌ |
| 15 | Голос | Прогрев микрофона (warmUpMicrophone) | ❌ |
| 16 | Голос | Авто-restart STT при длинной записи | ❌ |
| 17 | Голос | Кнопка ✕ отмены отправки в hero | ⚠️ (есть stop в compose) |
| 18 | Голос | Wake Lock экрана на время сессии | ❌ |
| 19 | Голос | Haptic feedback | ❌ |
| 20 | TTS | AudioContext unlock по жесту (iOS) | ❌ |
| 21 | TTS | iOS-safe server TTS (Audio + WebAudio) | ❌ |
| 22 | TTS | Safari speechSynthesis fallback с таймаутами | ❌ |
| 23 | TTS | Понятные hint'ы при ошибках TTS | ❌ |
| 24 | TTS | Обрезка длинного текста для TTS | ❌ |
| 36 | Сессия | visibilitychange → soft reconnect | ❌ |
| 37 | Сессия | Dedup ответов (displayed/spoken ids) | ⚠️ (другая логика) |
| 38 | Сессия | Throttled render стрима | ⚠️ (есть stream, без throttle UI) |
| 39 | Сессия | UI lock на время активной сессии | ❌ |
| 50 | SSE | Явный reconnect при возврате на вкладку | ⚠️ (silent retry) |
| 40 | Layout | Адаптация к клавиатуре (visualViewport, dock) | ❌ |
| 41 | Layout | Dismiss клавиатуры по тапу вне поля | ❌ |
| 42 | Layout | Однострочный compose-dock | ❌ |
| 43 | Layout | Кнопка камеры в compose (stub) | ❌ |
| 44 | Layout | Embed-режим CSS для iframe | ⚠️ (shell-embed есть) |
| 35 | UI | Mobile-theme / cosmic background | ❌ |
| 45 | UI | Диалог справки «?» | ❌ |
| 46 | UI | Упрощённые настройки в modal | ⚠️ (desktop — полная панель) |
| 33 | Персонаж | Подложка сцены отдельно от фона страницы | ❌ |
| 34 | Персонаж | CSS-fallback «облачко» без WebGL | ⚠️ (частично) |
| 30 | Устройство | Чип компаса / ориентации (🧭) | ✅ |
| 31 | Устройство | Чип server URL в шапке | ✅ |
| 32 | Устройство | Компактные chips agent + route в шапке | ✅ |
| 51 | Устройство | Чип GPS 📍 + «↗ агенту» в `/api/shell/message` | ✅ |
| 25 | Permissions | Баннер «Нужен HTTPS» для микрофона | ✅ |
| 26 | Permissions | Диалог помощи по микрофону Safari | ✅ |
| 27 | Permissions | getMobileHttpsUrl (порт 3443) | ✅ |
| 28 | PWA | Баннер «Добавь на экран Домой» | ✅ |
| 29 | PWA | manifest + apple-mobile-web-app meta | ✅ |
| 47 | Storage | Унификация mobile storage-ключей | ❌ |

---

## Discuss → Universal Shell (отдельно от mobile)

| # | Функция | Desktop |
|---|---------|---------|
| D1 | Мульти-контекст (несколько чипов: тема / область / запись) | ❌ (один topic picker) |
| D2 | Drag-and-drop из меню CMS в контекст | ❌ |
| D3 | Кнопка «+ Текущий» (активный документ) | ❌ |
| D4 | Мост parent → iframe (postMessage) для DnD и контекста | ❌ |
| D5 | Передача всего контекста в `/api/shell/message` | ❌ |

---

## Host model (surface switcher)

| Host | Где |
|------|-----|
| `desktop-cms` | Agent CMS.app · панель |
| `desktop-shell` | Agent Shell.app |
| `browser-embed` | iframe в CMS |
| `browser-tab` | `/shell` в вкладке |
| `mobile-native` | iOS app (SwiftUI) |
| `mobile-web` | `/shell/mobile` → **→ `/shell` responsive** |
| `extension` | Companion (Chrome) |

Backend: `local` / `server` (disabled)

---

## Уже есть в desktop — не дублировать

- Очередь сообщений (`message-queue`)
- Topic picker / маршрут QwenPaw
- QwenPaw-чаты
- Полный TTS/STT config
- Pause / resume TTS, download TTS
- Camera / screen для агента (MCP)
- Compose draft, expand composer
- Battery / clock, 3D-персонаж
- Stop pipeline (`stopActiveMessage`)
- Surface switcher (host + backend badge)

---

## Источники кода (mobile, deprecated)

| Путь | Назначение |
|------|------------|
| `public/shell/mobile/mobile.js` | основной UI + логика |
| `public/shell/mobile/mobile-permissions.js` | HTTPS, mic |
| `public/shell/mobile/mobile-tts.js` | iOS TTS |
| `public/shell/mobile/mobile-browser-tts.js` | Safari TTS |
| `public/shell/mobile/mobile-audio-unlock.js` | AudioContext |
| `public/shell/mobile/mobile-device-chips.js` | компас, батарея |
| `public/shell/shell-permissions.js` | HTTPS, mic |
| `public/shell/shell-dialog.js` | диалог mobile-style |
| `public/shell/shell-pwa.js` | PWA banner, standalone |
| `public/shell/manifest.webmanifest` | Web app manifest |
| `public/shell/mobile/mobile-background.js` | подложка персонажа |
| `public/shell/mobile/mobile-character.js` | персонаж mobile |

---

## План (черновик)

1. **Фаза 1 — Диалог:** #1–11, #48–49  
2. **Фаза 2 — Голос:** #12–19  
3. **Фаза 3 — TTS + mobile adapters:** #20–29, #40–44  
4. **Фаза 4 — Сессия / SSE:** #36–39, #50  
5. **Фаза 5 — Контекст CMS:** D1–D5  
6. **Фаза 6 — Deprecate:** `/shell/mobile/`, вкладка Shell Mobile в CMS  

---

*Обновлено: 2026-08-17*
