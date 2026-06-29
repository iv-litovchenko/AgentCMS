---
AWN-TYPE: "NODE/INDEX"
AWN-TITLE: Index - Collections
AWN-DESC: "Дашборд домена коллекций: список коллекций, правила ведения и структура."
AWN-LOAD: on_demand
AWN-PRIORITY: 40
AWN-TRIGGERS: [коллекции, коллекция, collection, collections]
AWN-STATUS: active
AWN-MEMORY: none
AWN-AUTOMATIZATION: false
AWN-CRON: "0 9 * * *"
AWN-CATEGORY: collections
AWN-VERSION: 0.1.0
AWN-CREATED: 2026-05-06
AWN-UPDATED: 2026-05-06
---

# Index - Collections

> [!info] О файле
> Нода (`*.node.md`, `NODE/INDEX`): дашборд домена `Collections`. Здесь фиксируются правила ведения коллекций и отображается список заметок из `Notes/`.

## Назначение домена

Домен для любых пользовательских коллекций (идеи, ссылки, предметы, референсы и т.д.).

## Что важно

- Каждая коллекция хранится отдельной заметкой в `Notes/`.
- Одна заметка = одна коллекция.
- Имя файла в `Notes/` задает имя коллекции.

## Список коллекций

```dataview
TABLE file.name AS "Коллекция", file.mtime AS "Обновлено"
FROM "Domains/Collections/Notes"
SORT file.mtime DESC
```

## Dashboards

- [[Domains/Collections/Dashboards/Overview.md|Overview Dashboard]]
- [[Domains/Collections/Dashboards/Dashboard.registry.md|Dashboard registry]]
- [[Domains/Collections/Dashboards/Map.excalidraw.md|Excalidraw Map]]

## Правила агента

- При добавлении новой коллекции создавать отдельный `.md` файл в `Notes/`.
- Не смешивать несколько коллекций в одной заметке.
- По запросу пользователя можно создавать краткие сводки по каждой коллекции.
