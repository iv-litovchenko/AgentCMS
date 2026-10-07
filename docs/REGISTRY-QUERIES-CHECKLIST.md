# Реестр запросов — что проверить (дерево)

```
Реестр запросов (sketch)
├── Данные
│   ├── .agent-cms/settings/registry-queries.yml
│   │   ├── version / model: workspace-registry-queries-v1
│   │   └── queries[]: id, name, comment, source, query?
│   ├── Дефолты в коде (merge по id)
│   │   ├── always-context   → storage-index (awn-runtime-load-always)
│   │   ├── cron             → runtime-cron
│   │   ├── heartbeat        → runtime-heartbeat
│   │   ├── nav-main         → storage-index (awn-main)
│   │   ├── nav-focus        → storage-index (awn-focus)
│   │   └── topics           → storage-index (awn.page.topic)
│   └── Не в workspace.yml (отдельный файл)
│
├── UI — Настройки проекта → Workspace → «Реестр запросов»
│   ├── Вкладка после «Автоинкремент» в сайдбаре
│   ├── Repeater «Шаблоны реестров» (как «Шаблоны compose»): ID, название, описание, источник, запрос
│   ├── Пустой список в workspace.yml → в UI показываются 6 встроенных шаблонов (hydrate)
│   ├── Сохранение → workspace.yml + sync registry-queries.yml
│   └── Перезагрузка — те же строки в repeater
│
├── HTTP API (нужен выбранный agent / agentRoot)
│   ├── GET  /api/agent/registry-queries
│   │   └── catalog + exists + path
│   ├── POST /api/agent/registry-queries  { yaml | content }
│   │   └── валидация YAML, запись файла
│   └── POST /api/agent/registry-queries/run  { id }
│       ├── storage-index → нужен включённый index-storage
│       ├── cron / heartbeat → как GET …/cron-registry
│       └── nav-focus / nav-main → source nav-* (опционально в каталоге)
│
├── MCP
│   ├── list_workspace_registry_queries
│   └── run_workspace_registry_query({ id: "cron" })
│
├── Индекс «Поля (SQL-like)»
│   ├── Панель индексов: storage включён
│   ├── rebuild_workspace_storage_index при пустом каталоге
│   └── run id=always-context / nav-focus → rows > 0 на тестовых manifest
│
├── Соседние реестры (не дублировать, сравнить результат)
│   ├── list_workspace_cron        ≈ run id=cron
│   ├── list_workspace_heartbeat   ≈ run id=heartbeat
│   ├── list_workspace_always_context  ≠ always-context (ещё системные MD)
│   ├── GET /api/agent/topic-registry  ≈ можно добавить query source runtime-topic
│   ├── index-exclude-registry     (пока нет пресета — добавить в YAML вручную)
│   └── large-context              (пока нет пресета)
│
└── Код
    ├── lib/workspace/registry-queries.js
    ├── lib/config/settings-store.js (registry-queries-yaml)
    ├── server.js (API + buildRegistryQueryRunners)
    ├── mcp-server/lib/map-tools.js
    └── awn-system/types/settings/workspace.yml (группа полей)
```

## Быстрые команды (curl, agent выбран в UI)

```bash
# Список
curl -s 'http://127.0.0.1:PORT/api/agent/registry-queries' | head

# Выполнить
curl -s -X POST 'http://127.0.0.1:PORT/api/agent/registry-queries/run' \
  -H 'Content-Type: application/json' \
  -d '{"id":"topics"}'
```

## Следующие шаги (не в sketch)

- Пресеты: `index-exclude`, `large-context`, `runtime-topic`
- Кнопка «Проверить запрос» в настройках
- `source: nav-focus` вместо поля `awn-focus` при рассинхроне с кэшем nav-registry
