# Рефакторинг — часть 12 (DONE)

**Сделано:** `public/` разложен по приложениям; общее в `_resources/`; UI на канон `/editor/*`, `/_resources/*`; legacy static aliases сняты (остались только `/` → editor, `/chat` → shell, корневые favicon/404/maintenance → rewrite).

---

## 🌳 Структура

```
public/
├── _resources/
├── editor/
├── commander/
├── shell/
└── examples/
```

## URL

- Канон: `/editor/*`, `/_resources/*`, `/shell/*`, `/commander/*`, `/examples/*`
- Rewrite: `/` → editor index; `/chat` → shell; `/404.html`, `/favicon.*`, `/maintenance.html` → `_resources/`

Код: `lib/config/public-static-layout.js`

## Чат

`<!-- uuid при старте работы -->`
