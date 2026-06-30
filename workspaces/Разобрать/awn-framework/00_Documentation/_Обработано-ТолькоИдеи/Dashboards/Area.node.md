---
AWN-TYPE: NODE/AREA
AWN-TITLE: Area - Dashboards
AWN-DESC: "Область пользовательских дашбордов для быстрой навигации по vault."
AWN-LOAD: on_demand
AWN-PRIORITY: 40
AWN-TRIGGERS:
  - dashboards
  - dashboard
  - дашборд
  - дашборды
  - navigation
  - навигация
AWN-STATUS: active
AWN-MEMORY: none
AWN-AUTOMATIZATION: false
AWN-CATEGORY: navigation
AWN-VERSION: 0.1.0
AWN-CREATED: 2026-05-06
AWN-UPDATED: 2026-05-07
---

# Area - Dashboards

> [!info] О файле
> Нода области `Dashboards/`: быстрые пользовательские панели навигации по заметкам.

## Что входит в область

- `Dashboards/Home.md` - основной markdown-дашборд для повседневной работы в Obsidian.
- `Dashboards/Home.interactive.html` - интерактивный дашборд на HTML/CSS/JS.
- `Dashboards/Vault-atlas.md` + `Vault-atlas.canvas` + `Vault-atlas.excalidraw.md` — **атлас входов** по vault (домены, ключевые ноды, обзор `Domains/*.node.md`).

## Политика форматов дашбордов

- В области поддерживаются только 2 дашборда: один `md` и один `html`.
- Дополнительные подпапки для дашбордов (например, `Collections/`) по умолчанию не создаются.
- Расширение структуры обсуждается отдельно перед добавлением новых панелей.

- **Ежедневные** панели по умолчанию: один основной `Home.md` и один `Home.interactive.html`.
- **Atlas** (canvas + excalidraw) — отдельная навигационная карта; не заменяет доменные дашборды.
- Дополнительные подпапки внутри `Dashboards/` по умолчанию не плодим без задачи.
- Любое расширение сверх этого — по договорённости.

## Тон и принципы

- Минимум текста, максимум быстрых переходов.
- Единые названия разделов между `md` и `html` версиями, чтобы не теряться в навигации.
- Дашборд показывает входные точки, а не заменяет содержимое доменов.

## Границы

- В области `Dashboards/` хранятся только панели навигации и связанные с ними ассеты.
- Контентные заметки и рабочие записи остаются в своих доменах (`Domains/`, `Assistant.Ai/`, `Inbox/` и т.д.).
