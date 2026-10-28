# Refactor 20 — статус (2026-10-28)

| Фаза | Статус | Комментарий |
|------|--------|-------------|
| A — docs вне editor | ✅ | app-docs, health, modals/JS/CSS |
| B — baseline | 🟡 | auto: `check:refactor-20` + [REFACTOR-20-baseline.md](./REFACTOR-20-baseline.md); DevTools Performance/Coverage — ⏳ вручную |
| C — главная `/` | ✅ | `editor-boot-route.js`: landing chunk только на `/`; graph уже lazy по view |
| D — workspace | 🟡 | boot defer postMain/secondary/comfort, landing groups guard — [phase-d](./REFACTOR-20-phase-d.md); slices main + слоты ⏳ |
| E — prod smoke | ⏳ | после `build:editor` |

**Следующий шаг B:** заполнить таблицы Performance/Coverage в [REFACTOR-20-baseline.md](./REFACTOR-20-baseline.md) (5–10 мин DevTools).

**Команды:**

```bash
npm run check:refactor-20 -- http://127.0.0.1:3000
npm run measure:editor
```
