---
AWN-TYPE: "NODE/SOLO"
AWN-TITLE: Domains — категории
AWN-DESC: "Справочник категорий для доменов пользователя. Поле category: в Area.node.md домена берётся отсюда."
AWN-LOAD: on_demand
AWN-PRIORITY: 50
AWN-TRIGGERS: [категории доменов, категория домена, категории]
AWN-STATUS: active
AWN-MEMORY: none
AWN-AUTOMATIZATION: false
AWN-CRON: "0 9 * * *"
AWN-CATEGORY: general
AWN-VERSION: 0.1.0
AWN-CREATED: 2026-05-04
AWN-UPDATED: 2026-05-04
---

# Domains — категории

> [!info] О файле
> Нода (`*.node.md`, `NODE/SOLO`): справочник категорий для пользовательских доменов. Slug из колонки «Ключ» указывается в поле `category:` в шапке `Area.node.md` домена.

## Таблица категорий

| Ключ (slug)     | Название             | Примеры доменов                       |
| --------------- | -------------------- | ------------------------------------- |
| `general`       | Общее (по умолчанию) | Misc, Notes, Drafts                   |
| `system`        | Системное (агент)    | Assistant.Ai и служебные ноды         |
| `work`          | Работа и проекты     | Project1, Project2, Freelance         |
| `finance`       | Финансы              | PersonalFinance, Investments, Budget  |
| `education`     | Образование          | EnglishLearning, Programming, Reading |
| `health`        | Здоровье             | Sport, Nutrition, Meditation          |
| `hobby`         | Хобби                | Games, Collections, Crafts            |
| `collections`   | Коллекции            | Collections                           |
| `family`        | Семья                | Kids, Parents, SharedPlans            |
| `documents`     | Документы            | Passports, Contracts, Insurance       |
| `travel`        | Путешествия          | Trips, Routes, Visas                  |
| `media`         | Медиа                | Movies, Books, Music, Podcasts        |
| `creative`      | Творчество           | Writing, Design, Music                |
| `documentation` | Документация         | Certificates, Docs                    |

## Как добавить новую категорию

Добавить строку в таблицу выше: придумать уникальный slug (латиница, без пробелов), дать название и примеры.
