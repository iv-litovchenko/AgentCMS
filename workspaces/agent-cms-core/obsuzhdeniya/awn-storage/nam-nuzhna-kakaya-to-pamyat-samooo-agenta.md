---
awn-note-todo-sticker: ""
awn-materials: ""
awn-status: open
awn-quality: 4
awn-importance: 0
awn-emoji: ""
awn-summary: ""
awn-note: ""
awn-todo: ""
awn-main: false
awn-focus: false
awn-index-exclude-record: false
awn-auto-toc: false
awn-tags: []
awn-taxonomy: {}
awn-viz-graph:
  enabled: true
  pin: false
  weight: 0
awn-viz-mindmap:
  type: optional
  color: slate
  size: auto
  layout-independent: false
  direction: auto
awn-viz-roadmap:
  order: 0
awn-id: 26
awn-type: awn.content.record
awn-create: "2026-10-05T16:48"
awn-viewed: ""
awn-deadline: ""
awn-owner: ""
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-attachments: []
awn-description: ""
awn-index-exclude-subtree: false
awn-name: Нам нужна какая то память самооо агента
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-10-05T13:51:53.067Z
awn-version: 4
---

Нам нужна какая то память самооо агента когда мы можем его факты по id вытащить и поменять  Память попотеть что это

Hindsight — это ещё одна «память» для агентов, тот же класс штук, что и Honcho. Её делает компания Vectorize. Идея в том, чтобы агент не просто вспоминал старую переписку, а учился со временем.Если по-простому, то вот чем она отличается. Обычный Hermes записывает заметки в простые текстовые файлы у тебя на компьютере, и всё. Hindsight раскладывает воспоминания по полочкам, примерно как у человека: отдельно «факты о мире» и отдельно «что со мной происходило». У неё три главных действия. Retain — запомнить. Recall — вспомнить. Reflect — подумать над тем, что запомнила.И комментатор прав, что её хвалят. На стандартном тесте памяти для агентов (LongMemEval) у неё около 91%. В Hermes она встроена как готовый вариант: пишешь hermes memory setup и выбираешь hindsight. Кстати, Honcho там в этом же списке выбора, рядом. Получается, Hermes сам по себе с памятью слабый, и люди докручивают её снаружи, ровно то, что ты сам заметил.Ссылки:

**Hindsight**

* Сайт: https://hindsight.vectorize.io
* GitHub: https://github.com/vectorize-io/hindsight
* Как подключить к Hermes: https://hindsight.vectorize.io/sdks/integrations/hermes

**Honcho**

* Сайт: https://honcho.dev
* GitHub: https://github.com/plastic-labs/honchoЕсли интересно сравнить всё разом, есть статья, где разобраны все 7 вариантов памяти для Hermes: https://vectorize.io/articles/hermes-agent-memory-providers-compared. Но учти, её написали сами авторы Hindsight, так что она может быть немного в их пользу.

Я взял названия инструментов из официальной документации Hermes, потому что в самой статье они местами устарели. Например, у Mem0 в статье другой набор, чем сейчас на сайте Hermes.Сначала общий принцип, так проще понять остальное. У любой такой памяти два способа работы. Первый — автоматический: Hermes сам подкладывает агенту воспоминания перед каждым ответом и сам сохраняет разговор после. Второй — инструменты, это кнопки, которые агент нажимает сам, когда решит, что надо. Ниже как раз эти кнопки.

1. **Hindsight** — 3 инструмента

* hindsight_retain — запомнить, и заодно вытащить из текста имена, проекты, людей
* hindsight_recall — вспомнить, ищет сразу несколькими способами
* hindsight_reflect — «подумать»: смотрит на все воспоминания разом и делает из них новые выводыИнструмент reflect подаётся как синтез по всем воспоминаниям, которого нет у других провайдеров.

2. **Holographic** — 2 инструмента

* fact_store — один инструмент, но с 9 действиями: добавить, найти, «прощупать» всё про один объект, найти связанное, рассуждать по нескольким объектам сразу, найти противоречия, обновить, удалить, показать список
* fact_feedback — оценка «помогло / не помогло», от неё растёт или падает доверие к фактуХранится всё локально в SQLite, внешних зависимостей нет. Интересная деталь: за «полезно» доверие растёт на 0,05, а за «бесполезно» падает на 0,10. То есть ошибки наказываются сильнее.

3. **OpenViking** (от ByteDance) — 6 инструментов

* viking_search — поиск по смыслу
* viking_read — прочитать на одном из трёх уровней: краткая суть, обзор или целиком
* viking_browse — ходить по папкам, как в проводнике
* viking_remember — запомнить факт
* viking_forget — удалить конкретный файл памяти по точному адресу viking://
* viking_add_resource — загрузить ссылку или документУровни там такие: около 100 токенов, около 2 тысяч, и полный текст.

4. **Mem0** — 4 инструмента

* mem0_search — поиск по смыслу
* mem0_add — сохранить факт дословно
* mem0_update — исправить по ID
* mem0_delete — удалить по ID

5. **Honcho** — 5 инструментов

* honcho_profile — прочитать или обновить «карточку» человека
* honcho_search — поиск по смыслу
* honcho_context — контекст сессии: краткое содержание, портрет человека, карточка, сообщения
* honcho_reasoning — ответ, который ИИ собрал рассуждением
* honcho_conclude — создать или удалить «вывод» о человеке

6. **ByteRover** — 3 инструмента

* brv_query — поиск по дереву знаний
* brv_curate — сохранить факт, решение или шаблон
* brv_status — версия и статистика дереваЕго фишка в том, что он успевает вытащить важное до того, как длинный разговор сожмут и детали потеряются.

7. **RetainDB** — 10 инструментов (больше всех)

* retaindb_profile — профиль пользователя
* retaindb_search — поиск по смыслу
* retaindb_context — контекст под текущую задачу
* retaindb_remember — запомнить, с указанием типа и важности
* retaindb_forget — забыть
* плюс работа с файлами: retaindb_upload_file, retaindb_list_files, retaindb_read_file, retaindb_ingest_file, retaindb_delete_fileЭто единственный из семёрки только облачный и платный, 20 долларов в месяц.

Что мне кажется важным для тебя. Если посмотреть на все семь, у всех почти одни и те же «глаголы»: запомнить, найти, забыть, профиль. Это память в стиле «мешок фактов». И только двое ближе к твоей идее: OpenViking(папки, по которым агент ходит, как по проводнику) и ByteRover (дерево знаний в обычных Markdown-файлах, которые человек может открыть и прочитать). Вот их я бы и посмотрел внимательнее, как самых близких соседей Agent CMS.Полный список с настройками: https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers