---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-emoji: ""
awn-note-todo-sticker: ""
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: ""
awn-tags: []
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-type: awn.content.record
awn-create: "2026-08-26T19:01"
awn-mindmap-enabled: true
awn-mindmap-type: optional
awn-mindmap-color: slate
awn-mindmap-size: auto
awn-mindmap-layout-independent: false
awn-mindmap-direction: auto
awn-attachments: []
awn-description: ""
awn-main: false
awn-name: Из заметок Apple
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-08-26T16:02:35.874Z
awn-version: 2
---

Перенести в Agent Shell
1. Мульти-контекст (главное отличие)
* Сейчас Discuss: несколько чипов (тема / область / запись / sidecar)
* Shell: одна тема через #shell-topic-picker
* Нужно: список контекста (массив { path, label, type }), не один topicPath
2. DnD из левого меню CMS
* Discuss принимает drop в iframe-соседней панели
* Shell в iframe — drop из родителя не дойдёт
* Нужно: мост parent → iframe (postMessage или API), парсинг application/x-awn-menu-link / wikilink / .md
3. Кнопка «+ Текущий»
* Discuss берёт активный документ из URL ?path= или .menu-link.is-active
* Shell этого не знает
* Нужно: сообщение от CMS «добавь текущий документ в контекст»
4. UI контекст-чипов
* Список, иконки по типу, удаление ×
* Клик по чипу → открыть документ в CMS (не внутри shell)
* Стили из .discuss-context-* → компактный блок в embed-режиме
5. Передача контекста в агента
* Discuss хранит контекст, но не шлёт его агенту
* Shell шлёт только topicPath в /api/shell/message
* Нужно: при отправке передавать весь контекст (paths + labels) в API
6. Persist контекста
* Discuss: localStorage agent-cms-discuss-data:{agentId}
* Нужно: сохранять контекст в Shell (localStorage или .agent-shell/settings.json)


По трекеру **mobile → `/shell/` почти закрыт**. Осталось вот что:


## Фаза 5 — контекст CMS (новое, не из mobile)
| # | Что |
|---|-----|
| **D1** | Несколько чипов контекста (тема / область / запись) |
| **D2** | Drag-and-drop из CMS в контекст |
| **D3** | «+ Текущий» (активный документ) |
| **D4** | postMessage parent ↔ iframe |
| **D5** | Весь контекст в `/api/shell/message` |

## Фаза 6 — финал миграции
- Редirect `/shell/mobile/` → `/shell/`
- Убрать вкладку **Shell Mobile** в CMS
- Почистить дубли: `mobile.js`, `mobile-tts.js`, `mobile-permissions.js` и т.д.
- (Опционально) убрать debug-кнопку «📳 Тест вибрации»


## Итого по цифрам
- **Mobile-фичи:** ~**3** не сделаны (#35, #33, #34) + **1** частично (#46) + **1** stub (#43)
- **CMS-контекст:** **5** пунктов (D1–D5)
- **Deprecate mobile:** финальный шаг

**Mobile-перенос по функционалу ~90% готов.** Логичный порядок дальше:
1. Проверить TTS на телефоне  
2. D1–D5 (если Shell в iframe CMS)  
3. #46 / #33–35 (polish)  
4. Фаза 6 — выключить `/shell/mobile/`


-----


Да, **частично уже видно**, а **конкретные tool-ы — пока нет**, но это реально добавить.

## Что Shell показывает сейчас

| Сигнал | Где видно |
|--------|-----------|
| **Думает** | Строка фазы: «🟢 Думаю» |
| **Ваш вопрос** | В фазе сразу после отправки (первые ~240 символов) |
| **Печатает ответ** | «Печатает…» + стриминг текста с курсором |
| **Озвучивает** | «🔊 Говорю» / «Озвучиваю…» |
| **Анимация** | Персонаж/пульс переключаются по `data-phase` |

## Что можно сделать

- Связка с журналом CMS (`/api/agent/activity`) — там активность MCP видна в десктопном UI (колокольчик), но Shell к нему пока не подключён

## Ограничения
