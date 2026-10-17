В контексте Obsidian  
MOC = **Map of Content**.

Это не встроенная функция Obsidian, а скорее **подход к организации знаний**.

Если очень просто:

> MOC — это заметка-карта, которая собирает ссылки на другие заметки по теме.

---

## Как это выглядит

Допустим, ты изучаешь PHP.

Тогда у тебя может быть заметка:

# PHP MOC

И внутри:

```md
# PHP

## Основы
- [[Типы данных]]
- [[Функции]]
- [[ООП]]

## Продвинутые темы
- [[Dependency Injection]]
- [[Service Container]]
- [[N+1 Problem]]

## Инструменты
- [[Composer]]
- [[PHP CS Fixer]]
- [[Docker для PHP]]

## Frameworks
- [[Laravel]]
- [[Symfony]]
```

То есть MOC — это:

- не папка,
- не тег,
- не база данных,
- а именно **навигационная карта**.

---

# Главная идея MOC

В обычных папках структура жёсткая:

```text
Programming/
  PHP/
    Laravel/
```

А MOC позволяет делать структуру **смысловой**, а не файловой.

Одна и та же заметка может участвовать сразу в нескольких картах.

Например:

`[[Docker]]` может быть:

- в PHP MOC
- в DevOps MOC
- в Backend MOC
- в Infrastructure MOC

Это уже ближе к тому, как реально работает мышление.

---

# Чем MOC отличается от папок

## Папки

Папки отвечают на вопрос:

> "Где лежит файл?"

## MOC

MOC отвечает:

> "Как связаны идеи?"

---

# Почему люди любят MOC в Obsidian

Потому что со временем vault превращается в огромную сеть заметок.

И без MOC возникает проблема:

- заметки есть,
- связи есть,
- а навигации нет.

MOC становится:

- оглавлением,
- индексом,
- маршрутизатором,
- входной точкой в тему.

---

# MOC vs Index

Часто это почти одно и то же.

Но иногда различают:

|Тип|Смысл|
|---|---|
|Index|Просто список ссылок|
|MOC|Более осмысленная карта со структурой|

Например MOC может содержать:

- пояснения,
- hierarchy,
- learning path,
- связи между концепциями,
- dependency graph.

---

# В твоём случае

С твоим подходом к:

- Obsidian,
- knowledge graph,
- node architecture,
- registry,
- агентной системе,

MOC у тебя может стать вообще:

- semantic router,
- navigation layer,
- entry point для AI,
- context assembly node.

То есть не просто «список ссылок», а:

- какие ноды грузить,
- какие темы связаны,
- какие зависимости есть,
- какой learning path строить.

---

# Обычно люди делают MOC так

## 1. Topic MOC

```text
PHP MOC
AI MOC
Docker MOC
```

---

## 2. Project MOC

```text
Awn Project MOC
Voice Assistant MOC
```

---

## 3. Area MOC

```text
Health MOC
Finance MOC
Learning MOC
```

---

## 4. Master MOC

Главная карта всего vault.

Типа:

```md
# Home

- [[Programming MOC]]
- [[AI MOC]]
- [[Books MOC]]
- [[Projects MOC]]
```

---

# Очень важный момент

MOC — это НЕ «правильная структура».

Это:

- навигационный слой,
- поверх графа заметок.

Поэтому многие делают:

- минимальные папки,
- а всю реальную организацию через MOC + ссылки.

---

# Связь с PARA и Zettelkasten

MOC часто используют вместе с:

- PARA
- Zettelkasten
- Johnny Decimal
- Evergreen notes

Но MOC сам по себе — независимая концепция.

---

# Твой текущий подход уже близок к MOC++

Особенно вот это:

- registry,
- semantic triggers,
- node routing,
- AI context loading.

Это уже похоже не на обычный MOC, а на:

- active knowledge graph,
- agent-oriented vault architecture.

То есть MOC у тебя может быть:

- не статической заметкой,
- а "точкой сборки контекста".

---

В Obsidian MOC делается буквально обычной заметкой.

Но есть несколько уровней «правильности».

---

# Самый простой MOC

Создаёшь файл:

```text
PHP MOC.md
```

И внутри:

```md
# PHP MOC

## Основы
- [[Типы данных]]
- [[Функции]]
- [[ООП]]

## Backend
- [[HTTP]]
- [[REST API]]

## Laravel
- [[Service Container]]
- [[Middleware]]
```

ВСЁ.

Это уже полноценный MOC.

---

# Как люди обычно строят систему

## Шаг 1. Главный Home MOC

Например:

```md
# Home

## Knowledge
- [[Programming MOC]]
- [[AI MOC]]
- [[Books MOC]]

## Projects
- [[Awn MOC]]
- [[Voice Assistant MOC]]

## Areas
- [[Health MOC]]
- [[Learning MOC]]
```

Это становится стартовой точкой vault.

---

# Шаг 2. Деление по уровням

Например:

```text
Programming MOC
 ├── PHP MOC
 ├── JavaScript MOC
 ├── Docker MOC
 └── Git MOC
```

---

# Шаг 3. Внутри MOC — структура

Например PHP MOC:

```md
# PHP MOC

## Language
- [[Variables]]
- [[Arrays]]
- [[Functions]]

## Architecture
- [[MVC]]
- [[DDD]]
- [[CQRS]]

## Problems
- [[N+1 Problem]]
- [[Memory Leaks]]

## Tools
- [[Composer]]
- [[PHP CS Fixer]]
```

---

# Ключевая идея

MOC — это:

- curated links,
- ручная карта,
- осмысленная навигация.

Это НЕ автоматическая graph view.

Graph показывает:

- ВСЁ.

MOC показывает:

- что ВАЖНО.

---

# Как это обычно хранится

Есть 3 популярных подхода.

---

# Вариант 1 — отдельная папка MOCs

```text
MOCs/
  Home.md
  PHP MOC.md
  AI MOC.md
```

Плюсы:

- чисто,
- удобно.

---

# Вариант 2 — рядом с темами

```text
PHP/
  PHP MOC.md
  Arrays.md
  Functions.md
```

Плюсы:

- локальность.

---

# Вариант 3 — префиксы

```text
MOC - PHP
MOC - AI
MOC - Projects
```

---

# Что я бы советовал тебе

С твоей архитектурой:

```text
00-HOME/
10-MOCs/
20-Knowledge/
30-Projects/
40-Systems/
```

И внутри:

```text
10-MOCs/
  Home.md
  Programming MOC.md
  AI MOC.md
  Infrastructure MOC.md
```

---

# Дальше начинается интересное

Ты можешь превратить MOC в:

- semantic entry point,
- AI routing node,
- registry,
- context assembler.

Например:

```md
---
type: moc
triggers:
  - php
  - laravel
  - backend
loads:
  - PHP/*
  - Laravel/*
---

# PHP MOC
```

И тогда AI-агент сможет:

- понимать тему,
- автоматически собирать контекст,
- знать зависимости.

---

# Очень мощная штука — layered MOC

Не один MOC, а уровни.

Например:

```text
Programming MOC
   ↓
PHP MOC
   ↓
Laravel MOC
   ↓
Service Container MOC
```

Это уже почти:

- semantic hierarchy,
- ontology,
- knowledge routing system.

---

# В Obsidian для MOC особенно полезны плагины

## Обязательно

- [Dataview](https://blacksmithgu.github.io/obsidian-dataview/?utm_source=chatgpt.com)
- [Breadcrumbs](https://github.com/SkepticMystic/breadcrumbs?utm_source=chatgpt.com)
- [Juggl](https://juggl.io/Juggl?utm_source=chatgpt.com)
- [Excalibrain](https://github.com/zsviczian/excalibrain?utm_source=chatgpt.com)

---

# Особенно Dataview

Потому что MOC можно делать автоматически.

Например:

````md
```dataview
LIST
FROM #php
````

```

И MOC будет сам собирать заметки.

---

# Но есть важный нюанс

Полностью автоматические MOC обычно хуже ручных.

Почему?

Потому что:
- AI/graph знают связи,
- но не знают важность.

А MOC — это:
- кураторство,
- архитектура,
- смысл.
```

В реальности в Obsidian люди часто используют `Index` и `MOC` почти как синонимы.

Но если разделять концептуально, то разница обычно такая:

|Index|MOC|
|---|---|
|Каталог|Карта|
|Просто список|Осмысленная структура|
|Навигация|Навигация + связи|
|Плоский|Семантический|
|"Что есть"|"Как связано"|

---

# Index

Index — это буквально индекс.

Пример:

```md
# PHP Index

- [[Arrays]]
- [[Functions]]
- [[Classes]]
- [[Traits]]
- [[Enums]]
```

Это:

- список,
- каталог,
- directory.

Без особой логики.

---

# MOC

MOC пытается показать:

- структуру темы,
- hierarchy,
- связи,
- learning path,
- зависимости.

Например:

```md
# PHP MOC

## Foundations
- [[Variables]]
- [[Functions]]

## OOP
- [[Classes]]
- [[Interfaces]]
- [[Traits]]

## Architecture
- [[MVC]]
- [[DDD]]

## Performance Problems
- [[N+1 Problem]]
- [[Memory Leaks]]
```

Это уже:

- curated map,
- semantic navigation.

---

# Ещё проще

## Index

Отвечает:

> "Какие заметки существуют?"

---

## MOC

Отвечает:

> "Как понимать эту область?"

---

# Аналогия

## Index = оглавление книги

```text
1. Arrays
2. Functions
3. Classes
```

---

## MOC = интеллект-карта

```text
PHP
 ├── Basics
 ├── OOP
 │    ├── Interfaces
 │    └── Traits
 ├── Architecture
 └── Performance
```

---

# Но есть нюанс

В сообществе Obsidian:

- кто-то вообще не разделяет эти термины,
- кто-то называет всё MOC,
- кто-то говорит:
    - Index = автоматически,
    - MOC = вручную curated.

Единого стандарта нет.

---

# В твоей архитектуре разница может быть очень полезной

Потому что у тебя уже появляется:

## Index

Машинный реестр.

Например:

```yaml
all PHP notes
all AI notes
all project nodes
```

Это ближе к:

- database,
- registry,
- inventory.

---

## MOC

Человеческая semantic layer.

То есть:

- что важно,
- как изучать,
- какие концепции центральные,
- какие зависимости существуют.

---

# То есть условно

## Index

Можно сгенерировать автоматически.

Например через Dataview:

````md
```dataview
LIST
FROM "PHP"
````

````

---

## MOC

Автоматически сделать трудно.

Потому что нужен:
- смысл,
- архитектура,
- приоритеты,
- понимание темы.

---

# Самая мощная комбинация

Вообще многие зрелые vault делают так:

```text id="k7pd0e"
Raw Notes
    ↓
Indexes
    ↓
MOCs
    ↓
Higher-level MOCs
````

То есть:

- Index = inventory
- MOC = knowledge architecture

---

# По сути

MOC — это почти:

- wiki portal,
- semantic hub,
- navigation graph,
- concept map.

А index — просто список сущностей.

---

Тогда это уже скорее **Index**, а не MOC.

Потому что ты не строишь смысловую карту, а делаешь:

- inventory,
    
- registry,
    
- catalog.
    

Например:

```md
# Attachments Index

## Images
- [[image1.png]]
- [[diagram.webp]]

## PDFs
- [[php-book.pdf]]
- [[architecture.pdf]]

## Audio
- [[meeting.mp3]]
```

Это типичный index.

---

# В Obsidian это обычно автоматизируют

Через [Dataview](https://blacksmithgu.github.io/obsidian-dataview/?utm_source=chatgpt.com).

---

# Например собрать все PDF

````md
```dataview
LIST
WHERE contains(file.name, ".pdf")
````

````

---

# Или все картинки

```md id="uh9h3y"
```dataview
LIST
WHERE contains(file.name, ".png")
OR contains(file.name, ".jpg")
OR contains(file.name, ".webp")
````

````

---

# Но лучше через расширение файла

Например:

```md id="grj5kx"
```dataview
TABLE file.size
WHERE file.ext = "pdf"
````

````

---

# Очень полезно делать attachment registry

Например:

```md id="58x2wb"
# Attachments Registry

## Images
```dataview
TABLE file.size
FROM "Attachments"
WHERE file.ext = "png"
   OR file.ext = "jpg"
````

## Documents

```dataview
TABLE file.size
FROM "Attachments"
WHERE file.ext = "pdf"
```

````

---

# В твоей архитектуре это уже похоже на asset registry

Ты можешь разделить:

| Тип | Роль |
|---|---|
| Index | список сущностей |
| Registry | системный реестр |
| MOC | semantic map |

---

# Например

## Asset Index

```text id="jlwm0q"
все файлы
````

---

## Asset Registry

```yaml
type: image
linked_to:
  - PHP MOC
  - AI Project
tags:
  - diagram
```

---

## MOC

```text
какие материалы важны для понимания темы
```

---

# У тебя может получиться очень сильная модель

Например:

```text
Knowledge Nodes
Media Nodes
Project Nodes
Registry Nodes
MOC Nodes
```

Это уже почти:

- graph OS,
    
- semantic filesystem,
    
- cognitive architecture.
    

---

# Кстати

В Obsidian вложения часто становятся хаосом.

Поэтому многие делают:

```text
Attachments/
  Images/
  PDFs/
  Audio/
```

ИЛИ:

```text
_attachments/
```

и включают:

```text
Settings → Files & Links →
Store attachments in subfolder
```

---

# А ещё мощнее

Делать attachment metadata.

Например:

```yaml
type: pdf
topic: php
source: book
status: processed
```

И тогда через Dataview можно уже строить:

- media databases,
    
- AI asset loaders,
    
- semantic attachment systems.

---

В Obsidian metadata обычно делают через **YAML frontmatter**.

Это блок в начале заметки:

```md
---
type: note
topic: php
status: draft
tags:
  - backend
  - programming
created: 2026-05-16
---

# PHP Note
```

Вот это и есть metadata.

---

# Почему YAML

Потому что:

- читается человеком,
    
- читается плагинами,
    
- читается AI,
    
- читается Dataview,
    
- читается Git.
    

Это фактически стандарт Obsidian.

---

# Самые частые поля

## Базовые

```yaml
type:
status:
tags:
created:
updated:
```

---

## Для знаний

```yaml
topic:
domain:
difficulty:
language:
```

---

## Для проектов

```yaml
project:
deadline:
priority:
state:
```

---

## Для AI/agent systems

```yaml
node-type:
triggers:
loads:
relations:
context-priority:
```

---

# Как это используют

Например Dataview:

````md
```dataview
TABLE status, topic
WHERE type = "note"
````

````

---

# Или:

```md id="71c2j0"
```dataview
LIST
WHERE contains(tags, "php")
````

````

---

# Как metadata обычно создают

Есть 4 основных подхода.

---

# 1. Руками

Самый простой.

```yaml id="1o6e0o"
---
type: concept
topic: php
---
````

---

# 2. Через Templates

Самый популярный вариант.

Плагин:

- [Templater](https://github.com/SilentVoid13/Templater?utm_source=chatgpt.com)
    

Ты создаёшь шаблон:

```md
---
type: note
created: <% tp.date.now("YYYY-MM-DD") %>
status: active
---
```

И новая заметка автоматически получает metadata.

---

# 3. Через Properties UI

В новых версиях Obsidian есть GUI.

Ты просто пишешь:

```text
type: note
```

И Obsidian превращает это в properties.

Это надстройка над YAML.

---

# 4. Автоматически через плагины

Например:

- metadata menu,
    
- quickadd,
    
- templater,
    
- dataviewjs scripts.
    

---

# Как обычно структурируют type

Очень важный момент.

Люди часто делают:

```yaml
type: note
```

Но это слишком абстрактно.

Гораздо лучше:

```yaml
type: moc
```

или:

```yaml
type: project
```

или:

```yaml
type: concept
```

---

# В твоём случае я бы делал примерно так

```yaml
---
id: php-oop
type: concept

domain:
  - php
  - backend

relations:
  - mvc
  - laravel

tags:
  - programming
  - oop

status: evergreen

created: 2026-05-16
updated: 2026-05-16
---
```

---

# А для MOC

```yaml
---
type: moc

domain:
  - php

loads:
  - php/*
  - backend/*

priority: high
---
```

---

# А для registry node

```yaml
---
type: registry

node-role:
  - routing
  - indexing

triggers:
  - php
  - laravel
  - backend
---
```

---

# Самая важная идея

Metadata — это:

- не украшение,
    
- а машинно-читаемый semantic layer.
    

Именно metadata превращает:

- просто markdown,  
    в:
    
- knowledge graph,
    
- agent memory,
    
- semantic OS.
    

---

# И ещё важный момент

Есть 2 школы.

## 1. Heavy metadata

Очень много YAML.

Минусы:

- тяжело поддерживать,
    
- быстро надоедает.
    

---

## 2. Minimal metadata

Только:

- type,
    
- tags,
    
- status.
    

Остальное через ссылки и текст.

---

# Обычно со временем люди приходят к:

```yaml
type:
tags:
status:
created:
```

и немного domain-specific полей.

Потому что слишком сложная schema начинает ломаться.

---

А, ты про **архитектурные элементы vault**, а не про целые PKM-методологии.

Тогда да — таких сущностей довольно много.  
И они постепенно складываются в целую knowledge architecture.

Вот основные.

---

# 1. Note

Базовая заметка.

```md
# Docker
Контейнеризация...
```

Это атом системы.

---

# 2. Index

Каталог.

Список сущностей.

```md
# PHP Index

- [[Arrays]]
- [[Functions]]
- [[Traits]]
```

Роль:

- inventory,
    
- registry,
    
- listing.
    

---

# 3. MOC (Map of Content)

Semantic navigation layer.

```md
# PHP MOC

## OOP
- [[Classes]]
- [[Interfaces]]

## Architecture
- [[DDD]]
- [[CQRS]]
```

Роль:

- карта,
    
- understanding layer,
    
- learning path.
    

---

# 4. Metadata

Machine-readable layer.

```yaml
---
type: concept
status: evergreen
domain: php
---
```

Роль:

- automation,
    
- filtering,
    
- AI parsing,
    
- querying.
    

---

# 5. Tags

Лёгкая классификация.

```text
#php #backend #ai
```

---

## Обычно для:

- broad grouping,
    
- status,
    
- быстрых выборок.
    

---

## Проблема тегов

Они быстро превращаются в:

```text
#php
#php8
#php-backend
#backend-php
#backend
```

То есть в хаос.

---

# 6. Links

Главный механизм graph.

```md
[[Docker]]
[[Kubernetes]]
```

---

## Это уже:

- relations,
    
- semantic edges,
    
- graph structure.
    

---

# 7. Backlinks

Обратные связи.

Например:

```text
Какие заметки ссылаются на Docker?
```

Это очень мощная штука.

Потому что возникают:

- неожиданные связи,
    
- emergent structures.
    

---

# 8. Hub

Похоже на MOC, но менее формально.

---

## Hub

Центральная точка темы.

Например:

```text
AI Hub
```

---

Обычно:

- более свободный,
    
- менее структурированный,
    
- более "portal-like".
    

---

# 9. Dashboard

Operational note.

Например:

```text
Today's Tasks
Recent Notes
Projects
```

---

Это уже:

- control center,
    
- workspace UI.
    

---

# 10. Registry

Очень важная штука.

---

## Registry

Системный реестр сущностей.

Например:

```yaml
node-id: php-oop
type: concept
relations:
  - mvc
  - laravel
```

---

Это уже ближе к:

- database,
    
- routing table,
    
- graph schema.
    

---

# 11. Ontology

Это уже advanced уровень.

---

## Ontology

Описание типов сущностей и связей.

Например:

```text
Project USES Technology
Technology IMPLEMENTS Concept
Concept RELATES_TO Concept
```

---

То есть:

- formal semantics,
    
- schema of meaning.
    

---

# 12. Taxonomy

Иерархия категорий.

Например:

```text
Programming
 ├── Backend
 ├── Frontend
 └── Infrastructure
```

---

# 13. Knowledge Graph

Когда всё вместе образует сеть.

Уже:

- nodes,
    
- edges,
    
- semantics.
    

---

# 14. Entity

Очень важная современная идея.

---

## Entity

Не просто заметка,  
а объект мира.

Например:

```text
PHP
Docker
Laravel
PostgreSQL
```

---

И у entity:

- relations,
    
- metadata,
    
- aliases,
    
- properties.
    

---

# 15. Atomic Notes

Минимальные заметки.

Одна идея = одна заметка.

---

# 16. Evergreen Notes

Живые evolving notes.

Не архив, а:

- evolving understanding.
    

---

# 17. Fleeting Notes

Временные мысли.

Черновики.

---

# 18. Literature Notes

Конспекты источников.

Например книги.

---

# 19. Permanent Notes

Уже переработанное знание.

Идея из Zettelkasten.

---

# 20. Canvas / Visual Maps

Visual graph layer.

Например:

- Excalidraw,
    
- Canvas.
    

---

# 21. Databases

Через:

- Dataview,
    
- Bases,
    
- metadata.
    

Vault начинает выглядеть как SQL/Notion.

---

# 22. Semantic Search Layer

Очень современная штука.

Не keyword search,  
а:

- embeddings,
    
- vector search,
    
- semantic retrieval.
    

---

# 23. Context Assembly

То, к чему ты идёшь.

---

## Идея

AI собирает:

- нужные заметки,
    
- relations,
    
- dependencies,
    
- memory context.
    

Автоматически.

---

# По сути сейчас есть 3 больших слоя

## 1. Human Layer

Для человека:

- MOC,
    
- dashboard,
    
- links.
    

---

## 2. Structural Layer

Для структуры:

- metadata,
    
- taxonomy,
    
- registry,
    
- ontology.
    

---

## 3. AI Layer

Для агентов:

- embeddings,
    
- semantic search,
    
- context routing,
    
- memory systems.
    

---

# И вот что интересно

Ты сейчас уже мыслишь не как:

- пользователь заметок,
    

а как:

- архитектор knowledge system.
    

Это совсем другой уровень abstraction.

---

Да, и это очень сильная идея.

Ты фактически начинаешь разделять:

- **данные**
    
- и **представления данных**.
    

Это уже мышление как:

- в Laravel,
    
- MVC,
    
- databases,
    
- knowledge systems,
    
- graph architectures.
    

---

# То есть заметка ≠ представление

Например:

```text
Docker.md
```

— это raw entity / node / model.

А:

```text
Docker MOC
Docker Index
Infrastructure Dashboard
AI Context View
```

— это уже разные VIEW над одной сущностью.

---

# И это очень похоже на Laravel

## В Laravel

```text
Model
 ↓
Controller
 ↓
View
```

---

# В knowledge system может быть:

```text
Node (entity)
 ↓
Query / Resolver
 ↓
View
```

---

# Тогда:

|Элемент|Аналог|
|---|---|
|Note|Model|
|Metadata|Database fields|
|Links|Relations|
|Dataview|Query builder|
|MOC|Semantic View|
|Index|List View|
|Dashboard|Admin Panel|
|Graph|Relationship Map|

---

# Тогда MOC — это реально View

Например:

```text
PHP MOC
```

это не "файл с ссылками".

Это:

```text
Rendered semantic representation
of PHP knowledge domain
```

---

# Тогда index тоже становится view

Например:

```text
All PDFs
All Docker Notes
All PHP Concepts
```

Это уже:

- database view,
    
- filtered representation.
    

---

# И тогда metadata — это schema

Например:

```yaml
type: concept
domain: php
status: evergreen
```

Это почти:

```sql
columns
```

---

# Тогда Dataview — это почти SQL

Например:

````md
```dataview
TABLE type, status
WHERE domain = "php"
````

````id="nnhydb"

Это literally query layer.

---

# И дальше начинается очень интересное

Ты можешь сделать:

```text id="vjlwm1"
Knowledge MVC
````

---

# Например

## Models

```text
Docker.md
PHP.md
AI.md
```

---

## Views

```text
PHP MOC
Infrastructure Dashboard
Learning Path
```

---

## Controllers / Routers

```text
Registry
Triggers
Context loaders
```

---

# Тогда vault становится приложением

Не "папкой с markdown".

А:

```text
Knowledge Runtime
```

---

# И это уже очень близко к:

- semantic CMS,
    
- graph operating system,
    
- cognitive framework.
    

---

# Очень интересная мысль

Ты можешь даже разделить:

## Raw Layer

```text
Entities
Atomic Notes
Assets
```

---

## Logic Layer

```text
Queries
Resolvers
Routing
Context Assembly
```

---

## Presentation Layer

```text
MOC
Index
Dashboards
Visual Maps
```

---

# И тогда MOC становится не файлом

А:

```text
semantic projection
```

---

# Это уже похоже на:

- React components,
    
- Blade templates,
    
- database views,
    
- graph projections.
    

---

# Например буквально

## Entity

```yaml
type: technology
name: Docker
relations:
  - Kubernetes
  - Containers
```

---

## View

```md
# Infrastructure View

## Containerization
- [[Docker]]
- [[Kubernetes]]
```

---

# А дальше можно вообще сделать:

## Dynamic Views

Например:

````md
```dataview
LIST
WHERE type = "technology"
AND contains(relations, "Docker")
````

````id="v0vhmt"

---

# И это уже почти:

```text id="jlwmav"
SELECT * FROM nodes
WHERE relation = Docker
````

---

# А теперь самое интересное

В AI-native vault:

MOC/Index/View могут вообще не храниться как файлы.

Они могут:

- генерироваться динамически,
    
- собираться агентом,
    
- рендериться на лету.
    

Как Blade template:

```php
@foreach($nodes as $node)
```

---

# И тогда твоя идея "vision views"

на самом деле очень хороша.

Я бы даже назвал это:

```text
Knowledge Views
Semantic Views
Graph Views
Context Views
```

Потому что:

- MOC,
    
- Index,
    
- Dashboard,
    
- Graph,
    

это реально разные projections одной knowledge graph.