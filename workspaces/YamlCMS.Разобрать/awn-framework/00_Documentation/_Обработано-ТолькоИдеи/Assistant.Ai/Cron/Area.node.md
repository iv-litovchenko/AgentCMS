---
AWN-TYPE: "NODE/AREA"
AWN-TITLE: Area — Cron
AWN-DESC: "Папка для нод, которые запускаются по расписанию."
AWN-LOAD: on_demand
AWN-PRIORITY: 25
AWN-TRIGGERS: [cron, расписание, автоматизация, периодические задачи, по расписанию]
AWN-STATUS: active
AWN-MEMORY: none
AWN-AUTOMATIZATION: false
AWN-CRON: "0 9 * * *"
AWN-CATEGORY: system
AWN-VERSION: 0.1.0
AWN-CREATED: 2026-05-05
AWN-UPDATED: 2026-05-06
---

# Area — Cron

> [!info] О файле
> Область `Assistant.Ai/Cron/`: сюда кладут ноды, которые должны выполняться **по расписанию**.

## Назначение

В шапке такой ноды: `AWN-AUTOMATIZATION: true` и `AWN-CRON` (когда запускать). В теле — что сделать при запуске.

Таблица расписаний для планировщика — в `AGENTS.NODES.md` (раздел «Ноды с расписанием»). Меняешь ноду или путь — поправь и строку там.