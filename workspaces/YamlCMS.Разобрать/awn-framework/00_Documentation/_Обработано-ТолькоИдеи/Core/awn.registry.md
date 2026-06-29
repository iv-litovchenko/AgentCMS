# Реестр нод AWN

## Реестр нод при старте

| STATUS | PRIORITY | Путь к ноде | NAME | DESC | TRIGGERS |
| ------ | -------- | ----------- | ---- | ---- | -------- |
| - | - | - | - | - | - |

*Нод при старте не зарегистрировано.*

## Реестр нод по необходимости

| STATUS | PRIORITY | Путь к ноде | NAME | DESC | TRIGGERS |
| ------ | -------- | ----------- | ---- | ---- | -------- |
| active | normal | `Задачи/Index.node.md` | Задачи | Область для управления задачами и проектами. | - |
| active | normal | `Задачи/Личные задачи/Index.node.md` | Личные задачи | Личные задачи и дела. | - |
| active | normal | `Задачи/Рабочие задачи/Index.node.md` | Рабочие задачи | Рабочие задачи и проекты. | - |
| active | 75 | `.awn-framework.project/00_Documentation/_Index.node.md` | AwnFramework | Служебная область: идеи, черновики спецификации и экспериментальные ноды фреймворка AWN | awnframework, AwnFramework, идеи, черновик, спецификация, .awn-framework, фреймворк |

## Реестр нод с автоматизацией

| STATUS | CRON | Путь к ноде | NAME | DESC | TRIGGERS |
| ------ | ---- | ----------- | ---- | ---- | -------- |
| - | - | - | - | - | - |

*Нод с автоматизацией не зарегистрировано.*

## Дополнительные файлы (читать/обновлять по необходимости)

| Файл (путь) | Описание и назначение |
| ----------- | --------------------- |
| `HEARTBEAT.md` | Операционный файл состояния/пульса системы |
| `README.md` | Главный обзор проекта |
| `.gitignore` | Правила исключения из git |
| `docker-compose.yml` | Описание контейнерной инфраструктуры |
| `.env` | Переменные окружения (читать с осторожностью) |

---

## Метрики

| Метрика | Значение |
| ------- | -------- |
| Всего нод | 4 |
| Нод при старте | 0 |
| Нод по необходимости | 4 |
| Нод с автоматизацией | 0 |

---

## Черновики (ideas/**)

| STATUS | Путь к ноде | NAME | TYPE | TRIGGERS |
| ------ | ----------- | ---- | ---- | -------- |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes-other/⚖️ decision.engine.node.md` | decision.engine | behavior | реши, выбери, что лучше |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes-other/📥 inbox.node.md` | inbox | system | идея, мысль, заметка |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes-other/🔁 action.loop.node.md` | action.loop | system | сделай, начать, план |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/⚙️ system.loader.node.md` | system.loader | system | инициализация |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/🔗 link.manager.node.md` | link.manager | system | связь |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/🚀 evolution.engine.node.md` | evolution.engine | system | улучшение |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/🛠 task.executor.node.md` | task.executor | skill | сделай |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/🧠 memory.manager.node.md` | memory.manager | system | память |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/🧠 self.identity.node.md` | self.identity | system | роль, агент |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/🧩 node.architecture.node.md` | node.architecture | system | node |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/🧪 knowledge.builder.node.md` | knowledge.builder | knowledge | объясни |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/🧭 context.interpreter.node.md` | context.interpreter | behavior | * |
| draft | `.awn-framework.project/00_Documentation/ideas/chatgpt/nodes/🧹 system.refactor.node.md` | system.refactor | system | рефакторинг |
| draft | `.awn-framework.project/00_Documentation/ideas/claude/health.node.md` | health | ritual | любая сессия с приветствием |
| draft | `.awn-framework.project/00_Documentation/ideas/claude/identity.node.md` | identity | identity | любая сессия с приветствием |
| draft | `.awn-framework.project/00_Documentation/ideas/claude/memory.node.md` | memory | entity | запомни, контекст |
| draft | `.awn-framework.project/00_Documentation/ideas/claude/node-creator.node.md` | node-creator | meta | создать node |
| draft | `.awn-framework.project/00_Documentation/ideas/claude/obsidian-rules.node.md` | obsidian-rules | guide | создание файла |
| draft | `.awn-framework.project/00_Documentation/ideas/claude/tasks.node.md` | tasks | skill | задача, задачи, todo |
| draft | `.awn-framework.project/00_Documentation/ideas/claude/writing.node.md` | writing | skill | текст, написать |
| draft | `.awn-framework.project/00_Documentation/ideas/grok/**` | grok/* | various | various |

> *Черновики доступны по запросу, но не загружаются автоматически.*
> *ideas/ — черновики, не в основном реестре.*