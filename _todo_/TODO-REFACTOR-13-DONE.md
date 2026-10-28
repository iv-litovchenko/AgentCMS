# Рефакторинг — часть 13 (DONE)

**Сделано:** все JS shell перенесены в `public/shell/js/`; UI/importmap на `/shell/js/*`; legacy `/shell/<file>.js` → диск через `mapShellPathToDisk` в `public-static-layout.js`.

## Структура

```
shell/
├── index.html · css · PWA · favicon
├── js/          ← 62 модуля
├── vendor/ · icons/ · models/ · mobile/
```

## URL

- Канон: `/shell/js/<file>.js`
- Legacy: `/shell/<file>.js` → `shell/js/<file>.js` (alias на диске)
