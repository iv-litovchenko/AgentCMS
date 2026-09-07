# Mobile apps

Клиенты Agent Shell для телефона. Backend тот же — **Agent CMS** (`npm start`, API `/api/shell/*`).

## Структура

| Путь | Что это |
|------|---------|
| `mobile/iphone-shell/` | Нативное iOS-приложение (SwiftUI) |
| `mobile/SHELL-API.md` | Контракт API (общий для web и iOS) |
| `public/shell/shell-contract.js` | Константы фаз, SSE, paths |
| `public/shell/shell-client.js` | HTTP/SSE клиент для mobile web |
| `public/shell/` | Universal Shell (desktop · browser · mobile · PWA) |
| `desktop/agent-shell/` | Electron-оболочка для macOS |

## iPhone (SwiftUI)

```bash
cd mobile/iphone-shell
# если установлен xcodegen:
xcodegen generate
open AgentShell.xcodeproj
```

Без xcodegen: в Xcode **File → New → Project → iOS App**, затем перетащите папку `AgentShell/` в проект.

На телефоне в **Настройках** укажите URL CMS, например `http://192.168.0.102:3000` (Mac и iPhone в одной Wi‑Fi). CMS на Mac:

```bash
HOST=0.0.0.0 npm start
```

## Safari / PWA (без Xcode)

```bash
npm start
# на iPhone:
# https://<IP-Mac>:3488/
# или https://<IP-Mac>:3488/<agent-id>/
```

## Связь с desktop

| | Mac | iPhone |
|---|-----|--------|
| Оболочка | Electron | SwiftUI или Safari |
| UI | `public/shell/index.html` | `mobile/iphone-shell` или `public/shell/` |
| API | `/api/shell/*` | тот же |
