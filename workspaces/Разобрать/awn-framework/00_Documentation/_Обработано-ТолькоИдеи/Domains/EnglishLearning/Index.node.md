---
AWN-TYPE: "NODE/INDEX"
AWN-TITLE: Index — EnglishLearning
AWN-DESC: "Дашборд домена изучения английского: цели, список тем, правила агента."
AWN-LOAD: on_demand
AWN-PRIORITY: 40
AWN-TRIGGERS: [английский, english, изучение английского, язык]
AWN-STATUS: active
AWN-MEMORY: none
AWN-AUTOMATIZATION: false
AWN-CRON: "0 9 * * *"
AWN-CATEGORY: education
AWN-VERSION: 0.2.0
AWN-CREATED: 2026-05-04
AWN-UPDATED: 2026-05-04
---

# Index — EnglishLearning

> [!info] О файле
> Нода (`*.node.md`, `NODE/INDEX`): дашборд домена `EnglishLearning`. Открой эту страницу — увидишь что изучаем, какие темы есть и какой прогресс. Агент читает при работе с английским языком.

## Цель

Изучить английский до уровня уверенного общения: чтение, аудирование, письмо, разговорная практика.

## Что изучаем

```dataview
TABLE title, tags, updated AS "Обновлено"
FROM "Domains/EnglishLearning/Notes"
SORT updated DESC
```

## Dashboards

- [[Domains/EnglishLearning/Dashboards/Overview.md|Overview Dashboard]]
- [[Domains/EnglishLearning/Dashboards/Dashboard.registry.md|Dashboard registry]]
- [[Domains/EnglishLearning/Dashboards/Map.excalidraw.md|Excalidraw Map]]

## Правила агента

- Объяснения и примеры давать на русском и английском.
- При добавлении новой темы — добавить строку в таблицу выше и создать файл в `Notes/`.
- Прогресс и новые слова фиксировать при явном запросе пользователя в `Memory/`.
