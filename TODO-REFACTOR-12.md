# Рефакторинг — часть 12

**Цель:** три приложения в отдельных папках под `public/`, общие статики — в `shared/`, старые URL не ломаем (aliases в `server.js`).

**MCP / чат:** URL voice по-прежнему `/shell/*`; опциональный alias `/chat` → тот же shell.

---

## 🌳 Целевая структура

```
public/
├── shared/                 # vendor, favicon редактора, agent-select.js
│   ├── vendor/
│   ├── favicon.*
│   └── agent-select.js
├── editor/                 # Agent CMS (бывший корень)
│   ├── index.html · index2.html · preview.html
│   ├── main.js · styles.css
│   ├── js/
│   └── assets/
├── commander/              # MyJarvis / Commander
├── shell/                  # Voice / chat (папка shell, не переименовываем)
├── cms/icons/              # общие иконки CMS + shell preview
├── examples/
├── 404.html
└── maintenance.html
```

## URL → диск (legacy aliases)

```
/  /index.html  /js/*  /main.js  /styles.css  /assets/*  → editor/*
/vendor/*  /favicon.*                                      → shared/*
/shell/*                                                   → shell/*
/commander/*                                               → commander/*
/chat  /chat/                                              → shell/index.html
/editor/*                                                  → editor/* (канон)
/shared/*                                                  → shared/* (канон)
```

Код маппинга: `lib/config/public-static-layout.js` → `mapPublicUrlPathToDisk()`.

## Фазы

| Фаза | Статус | Что |
| ---- | ------ | --- |
| 1 | [x] | Дерево на диске + `public-static-layout.js` + aliases в `server.js` / `voice-server.js` |
| 2 | [ ] | Постепенно перевести `index.html` / `main.js` на канон `/editor/*`, `/shared/vendor/*` |
| 3 | [ ] | Обновить docs (`user-docs`, postinstall комментарии) |
| 4 | [ ] | Убрать legacy aliases (major / breaking) |

## Затронутый код (фаза 1)

- `server.js` — `serveStatic`, `serveIndexHtml`, requires → `public/editor/js/…`
- `voice-server.js` — `serveStaticFile`
- `package.json` postinstall, `Dockerfile`, `scripts/sync-*.js`, `scripts/render-app-icons.js`
- `lib/**` requires `public/js` → `public/editor/js`

## Идеи (не решено)

- [ ] Переименовать папку `shell` → `chat` на диске (дорого: PWA, desktop, voice-server).
- [ ] Вынести `cms/icons` в `shared/cms/icons` с alias `/cms/icons`.

## Чат

`<!-- uuid при старте работы -->`
