# Рефакторинг — часть 12

**Цель:** три приложения в отдельных папках под `public/`, общее — в `_resources/` (сортировка сверху), старые URL не ломаем (aliases в `server.js`).

**MCP / чат:** URL voice по-прежнему `/shell/*`; alias `/chat` → shell.

---

## 🌳 Целевая структура

```
public/
├── _resources/             # vendor, favicon, 404, maintenance, cms/icons, agent-select
│   ├── vendor/
│   ├── cms/icons/
│   ├── 404.html · maintenance.html
│   └── favicon.*
├── editor/                 # Agent CMS
├── commander/
├── shell/                  # Voice / chat
└── examples/
```

## URL → диск (legacy aliases)

```
/  /index.html  /js/*  /main.js  /styles.css  /assets/*     → editor/*
/vendor/*  /favicon.*  /404.html  /maintenance.html          → _resources/*
/cms/*                                                       → _resources/cms/*
/shared/*  /_shared/*  (legacy)                              → _resources/*
/_resources/*                                                → _resources/* (канон)
/shell/*  /commander/*  /chat                                → как раньше
/editor/*                                                    → editor/* (канон)
```

Код: `lib/config/public-static-layout.js` → `mapPublicUrlPathToDisk()`.

## Фазы

| Фаза | Статус | Что |
| ---- | ------ | --- |
| 1 | [x] | Дерево на диске + layout + aliases |
| 2 | [ ] | Канон `/editor/*`, `/_resources/vendor/*` в html/js |
| 3 | [ ] | Docs (user-docs, postinstall) |
| 4 | [ ] | Убрать legacy aliases |

## Чат

`<!-- uuid при старте работы -->`
