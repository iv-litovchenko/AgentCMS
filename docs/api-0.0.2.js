module.exports = {
  version: "0.0.2",
  versionLabel: "Актуальная",
  title: "Agent CMS HTTP API",
  baseUrl: "/api",
  generatedAt: "2026-06-30",
  notes: [
    "Актуальная справка по server.js. В UI: select «0.0.2 — актуальная».",
    "JSON-ответы, UTF-8. ?version=0.0.2 по умолчанию; 0.0.1 и 0.0.0 — предыдущие снимки.",
    "Контекст агента ?agent=<id>: все маршруты, кроме /api/agents*, /api/docs*, /api/mcp-docs*, /api/user-docs*, /api/public/images.",
    "path — путь к manifest.md темы/области (legacy _registration.md); file — .md в awn-storage/main/ или media/."
  ],
  groups: [
    {
      id: "agents",
      title: "Агенты",
      endpoints: [
        {
          method: "GET",
          path: "/api/agents",
          agentScope: false,
          description: "Список агентов из awn-agents.json и превью корня.",
          query: [],
          body: null,
          response: "{ agents[], defaultAgentId }"
        },
        {
          method: "PUT",
          path: "/api/agents/registry",
          agentScope: false,
          description: "Сохранить реестр агентов и поля _registration.md (awn-name, awn-description, awn-status).",
          query: [],
          body: "{ agents: [{ id?, path, environment?, default?, active?, name?, comment? }] }",
          response: "{ agents[], defaultAgentId }"
        },
        {
          method: "POST",
          path: "/api/agents/create",
          agentScope: false,
          description: "Создать workspace: _registration.md (awn.workspace) в указанной папке.",
          query: [],
          body: "{ path, name?, id? }",
          response: "{ agent: { path, id, name, comment, manifestFound, hasPreview } }"
        },
        {
          method: "POST",
          path: "/api/agents/discover",
          agentScope: false,
          description: "Найти workspace с _registration.md (awn.workspace) (Desktop, HOME, проект).",
          query: [],
          body: "{ roots?: string[], maxDepth?: number }",
          response: "{ agents: [{ path, name, comment, id, hasPreview, previewRel }] }"
        },
        {
          method: "GET",
          path: "/api/agents/workspace-preview",
          agentScope: false,
          description: "Превью агента из awn-storage/*/preview.* по пути workspace.",
          query: ["path"],
          body: null,
          response: "image/*"
        },
        {
          method: "POST",
          path: "/api/agents/preview",
          agentScope: false,
          description: "Загрузить аватар агента в workspace/awn-storage/*/preview.*.",
          query: [],
          body: "{ path, data: base64, fileName?, mimeType? }",
          response: "{ hasPreview, previewUrl }"
        },
        {
          method: "DELETE",
          path: "/api/agents/preview",
          agentScope: false,
          description: "Удалить аватар агента из workspace/awn-storage/*/preview.*.",
          query: ["path"],
          body: null,
          response: "{ hasPreview: false, previewUrl: null }"
        },
        {
          method: "GET",
          path: "/api/agents/preview",
          agentScope: false,
          description: "Превью агента из awn-storage/*/preview.* (после регистрации).",
          query: ["agent"],
          body: null,
          response: "image/*"
        },
        {
          method: "GET",
          path: "/api/docs-meta",
          agentScope: false,
          description: "Мета версий справки (для select в UI).",
          query: [],
          body: null,
          response: "{ defaultVersion, versions: [{ id, label, isCurrent }] }"
        },
        {
          method: "GET",
          path: "/api/docs",
          agentScope: false,
          description: "Документация HTTP API (JSON).",
          query: ["version=0.0.1|0.0.0"],
          body: null,
          response: "{ version, versionLabel, title, groups[], ... }"
        },
        {
          method: "GET",
          path: "/api/mcp-docs",
          agentScope: false,
          description: "Документация MCP-сервера (JSON).",
          query: ["version=0.0.1|0.0.0"],
          body: null,
          response: "{ version, versionLabel, title, groups[], ... }"
        },
        {
          method: "GET",
          path: "/api/user-docs",
          agentScope: false,
          description: "Руководство пользователя (Markdown).",
          query: ["version=0.0.1|0.0.0"],
          body: null,
          response: "text/markdown"
        },
        {
          method: "POST",
          path: "/api/agents/validate-paths",
          agentScope: false,
          description: "Проверить пути агентов в реестре (существование папок).",
          query: [],
          body: "{ paths?: string[] }",
          response: "{ results: [{ path, ok, error? }] }"
        }
      ]
    },
    {
      id: "menu",
      title: "Меню и поиск",
      endpoints: [
        {
          method: "GET",
          path: "/api/menu",
          description: "Дерево нод workspace (_registration.md).",
          query: [],
          body: null,
          response: "{ title, sections?, items?, indexPath?, hasGit?, hasObsidian?, hasGitSelf?, hasObsidianSelf?, ... } — hasGit/hasObsidian true только если .git / .obsidian есть в каталоге этой папки (без наследования)"
        },
        {
          method: "POST",
          path: "/api/menu/sort",
          description: "Сохранить порядок элементов в папке (awn-sort.json).",
          query: [],
          body: "{ folderPath?: \".\", order: string[] }",
          response: "{ folderPath, order }"
        },
        {
          method: "GET",
          path: "/api/search",
          description: "Поиск по workspace (имя, мета темы, содержимое, теги).",
          query: [
            "q",
            "scope=all|content|filename|tags",
            "fileType=all|markdown|sidecar|pdf|office|spreadsheet|video|audio|image|archive|config|other",
            "match=relaxed|strict",
            "limit=1..100"
          ],
          body: null,
          response: "{ query, scope, fileType?, results[], total }"
        }
      ]
    },
    {
      id: "data",
      title: "Накопители (awn-data)",
      endpoints: [
        {
          method: "GET",
          path: "/api/awn-data",
          description: "Список накопителей или один store (?store=taxonomies/statuses). MD и CSV коллекции, группы, singleton.",
          query: ["store?"],
          body: null,
          response: "{ specVersion, model: \"awn-data\", stores[], store? }"
        },
        {
          method: "POST",
          path: "/api/awn-data/stores",
          description: "Создать накопитель. taxonomies/* → CSV main.csv; иначе MD {id}.md.",
          query: [],
          body: "{ kind?: \"collection\"|\"singleton\", slug, name?, description?, hierarchy?, withSampleRecord? }",
          response: "{ ok: true, store }"
        },
        {
          method: "POST",
          path: "/api/awn-data/records",
          description: "Добавить запись в коллекцию (CSV row или .md файл).",
          query: [],
          body: "{ store, id?, title?, parent? }",
          response: "{ ok: true, store }"
        }
      ]
    },
    {
      id: "system",
      title: "Системные файлы агента",
      endpoints: [
        {
          method: "GET",
          path: "/api/system-files",
          description: "Мета AGENTS.md, README.md, todo.md, .env и др.",
          query: [],
          body: null,
          response: "{ files: [{ name, exists, empty }] }"
        },
        {
          method: "GET",
          path: "/api/system-file",
          description: "Прочитать системный файл.",
          query: ["name"],
          body: null,
          response: "{ name, content, exists }"
        },
        {
          method: "POST",
          path: "/api/system-file",
          description: "Записать системный файл.",
          query: [],
          body: "{ name, content }",
          response: "{ name, content, exists: true }"
        }
      ]
    },
    {
      id: "node",
      title: "Тема / область (*.md)",
      endpoints: [
        {
          method: "GET",
          path: "/api/file",
          description: "Содержимое _registration.md (описание).",
          query: ["path"],
          body: null,
          response: "{ path, content }"
        },
        {
          method: "POST",
          path: "/api/file/content",
          description: "Сохранить содержимое _registration.md.",
          query: [],
          body: "{ path, content }",
          response: "{ path, content }"
        },
        {
          method: "POST",
          path: "/api/file/title",
          description: "Переименовать ноду или part (manifest).",
          query: [],
          body: "{ path, title }",
          response: "{ path, title, content }"
        },
        {
          method: "GET",
          path: "/api/file/properties",
          description: "YAML frontmatter из manifest.md. Query key — одно свойство.",
          query: ["path", "key?"],
          body: null,
          response: "{ path, content, exists } | { path, key, value, exists }"
        },
        {
          method: "POST",
          path: "/api/file/properties",
          description: "Сохранить YAML frontmatter: content (patch) или key+value.",
          query: [],
          body: "{ path, content } | { path, key, value }",
          response: "{ path, content }"
        },
        {
          method: "GET",
          path: "/api/file/node-config",
          description: "config.yml страницы (awn_settings, awn_ui). Алиасы: /api/file/page-config, /api/page/config.",
          query: ["path"],
          body: null,
          response: "{ path, content, exists, defaultLandingMode?, awnMaskFile?, awnMaskFileKey? }"
        },
        {
          method: "POST",
          path: "/api/file/node-config",
          description: "Сохранить config.yml (пустой content удаляет файл).",
          query: [],
          body: "{ path, content }",
          response: "{ path, content, exists, defaultLandingMode? }"
        },
        {
          method: "GET",
          path: "/api/page/exists",
          description: "Проверить наличие manifest.md.",
          query: ["path"],
          body: null,
          response: "{ path, exists }"
        },
        {
          method: "GET",
          path: "/api/page/meta",
          description: "Мета страницы (stat manifest + folder). Алиас: /api/node/meta.",
          query: ["path"],
          body: null,
          response: "{ path, manifest, folder, props? }"
        },
        {
          method: "GET",
          path: "/api/env",
          description: "Прочитать .env страницы. Алиасы: /api/page/env, /api/file/page-env.",
          query: ["path"],
          body: null,
          response: "{ path, content, exists }"
        },
        {
          method: "POST",
          path: "/api/env",
          description: "Записать .env страницы.",
          query: [],
          body: "{ path, content }",
          response: "{ path, content, exists }"
        },
        {
          method: "GET",
          path: "/api/content/exists",
          description: "Проверить наличие контента в слоте.",
          query: ["path", "slot", "ref?"],
          body: null,
          response: "{ path, slot, driver, ref, exists }"
        },
        {
          method: "GET",
          path: "/api/content/meta",
          description: "Мета контента в слоте (exists + file stat).",
          query: ["path", "slot", "ref?"],
          body: null,
          response: "{ path, slot, driver, ref, exists, file? }"
        },
        {
          method: "DELETE",
          path: "/api/file",
          description: "Удалить part или папку ноды (manifest).",
          query: ["path"],
          body: null,
          response: "{ deleted, deletedType: \"file\"|\"folder\" }"
        },
        {
          method: "POST",
          path: "/api/node/move",
          description: "Переместить область/топик в другую родительскую папку.",
          query: [],
          body: "{ path, parentPath }",
          response: "{ path, parentPath, linkRewrite? }"
        },
        {
          method: "POST",
          path: "/api/node/create",
          description: "Создать _registration.md в текущей папке, подпапку-ноду или part в _Parts.",
          query: [],
          body: "{ parentPath?: \".\", type: \"folder\"|\"file\"|\"manifest\"|\"catalog\"|\"service-doc\", name }",
          response: "{ createdPath, type }"
        }
      ]
    },
    {
      id: "memory",
      title: "Память",
      description:
        "Три драйвера: internal — Однофайловая (_.x.main.md), external — Многофайловая (main/), tabular — Табличная (_.x.main.csv). На overview все три доступны всегда; наличие файлов — в drivers.*.exists.",
      endpoints: [
        {
          method: "GET",
          path: "/api/memory/internal",
          description: "Однофайловая память — один файл _.x.main.md.",
          query: ["path"],
          body: null,
          response: "{ path, content, exists, migratedFrom? }"
        },
        {
          method: "POST",
          path: "/api/memory/internal",
          description: "Сохранить однофайловую память.",
          query: [],
          body: "{ path, content }",
          response: "{ path, content }"
        },
        {
          method: "GET",
          path: "/api/memory/summary",
          description: "Сводка трёх драйверов для overview: internal, external, tabular.",
          query: ["path"],
          body: null,
          response: "{ enabledDrivers[], existingDrivers[], drivers{ internal, external, tabular } }"
        },
        {
          method: "GET",
          path: "/api/memory/tabular",
          description: "Табличная память — _.x.main.csv. Таблица с данными (как Excel) для данных, которые загружаются в контекст за один раз.",
          query: ["path"],
          body: null,
          response: "{ path, content, exists, columns[], rows[][], rowCount }"
        },
        {
          method: "POST",
          path: "/api/memory/tabular",
          description: "Сохранить табличную память (CSV).",
          query: [],
          body: "{ path, content }",
          response: "{ path, content, columns[], rows[][], rowCount }"
        },
        {
          method: "GET",
          path: "/api/memory/external",
          description: "Многофайловая память — список файлов в content/ (заметки, вложенные папки).",
          query: ["path"],
          body: null,
          response: "{ exists, files, content }"
        },
        {
          method: "GET",
          path: "/api/external/files",
          description: "Структурированный список _Content.",
          query: ["path"],
          body: null,
          response: "{ exists, files[] }"
        },
        {
          method: "GET",
          path: "/api/external/file",
          description: "Прочитать .md из _Content.",
          query: ["path", "file"],
          body: null,
          response: "{ file, content }"
        },
        {
          method: "POST",
          path: "/api/external/file",
          description: "Сохранить .md в _Content.",
          query: [],
          body: "{ path, file, content }",
          response: "{ file, content }"
        },
        {
          method: "POST",
          path: "/api/external/file/create",
          description: "Создать воспоминание (.md с frontmatter).",
          query: [],
          body: "{ path, title? }",
          response: "{ file, content, exists: true }"
        },
        {
          method: "POST",
          path: "/api/external/section/create",
          description: "Создать подпапку-раздел в _Content.",
          query: [],
          body: "{ path, title }",
          response: "{ section, exists: true }"
        },
        {
          method: "POST",
          path: "/api/external/file/rename",
          description: "Переименовать .md в _Content.",
          query: [],
          body: "{ path, file, title }",
          response: "{ file, content }"
        },
        {
          method: "DELETE",
          path: "/api/external/file",
          description: "Удалить .md из main/.",
          query: ["path", "file"],
          body: null,
          response: "{ deleted, path }"
        },
        {
          method: "POST",
          path: "/api/external/file/move",
          description: "Переместить .md в main/ (внутри темы или в другую тему).",
          query: [],
          body: "{ path, file, targetPath?, targetFile? }",
          response: "{ path, file, content, linkRewrite? }"
        }
      ]
    },
    {
      id: "settings",
      title: "Настройки ноды",
      endpoints: [
        {
          method: "GET",
          path: "/api/configuration",
          description: "configuration.yml в awn-storage.",
          query: ["path"],
          body: null,
          response: "{ path, content, exists }"
        },
        {
          method: "POST",
          path: "/api/configuration",
          description: "Сохранить configuration.yml.",
          query: [],
          body: "{ path, content }",
          response: "{ path, content }"
        },
        {
          method: "GET",
          path: "/api/env",
          description: ".env в awn-storage.",
          query: ["path"],
          body: null,
          response: "{ path, content, exists }"
        },
        {
          method: "POST",
          path: "/api/env",
          description: "Сохранить .env.",
          query: [],
          body: "{ path, content }",
          response: "{ path, content, exists: true }"
        },
        {
          method: "GET",
          path: "/api/todo",
          description: "TODO ноды (`*.x.todo.md`).",
          query: ["path"],
          body: null,
          response: "{ path, content, exists }"
        },
        {
          method: "POST",
          path: "/api/todo",
          description: "Сохранить TODO в `*.x.todo.md`.",
          query: [],
          body: "{ path, content }",
          response: "{ path, content, exists: true }"
        },
        {
          method: "GET",
          path: "/api/folder/view",
          description: "Содержимое служебной папки (_Inbox, _Scripts, …).",
          query: ["path", "folder"],
          body: null,
          response: "{ exists, files, content }"
        },
        {
          method: "GET",
          path: "/api/workspace/folder/adopt",
          description: "Список папок свободной памяти (без manifest.md на диске).",
          query: [],
          body: null,
          response: "{ folders[], count }"
        },
        {
          method: "GET",
          path: "/api/workspace/folder/browse",
          description: "Содержимое свободной памяти на одном уровне: images, pages, videos, folders.",
          query: ["folderPath"],
          body: null,
          response: "{ exists, folderPath, folders[], images[], pages[], videos[], audio[], other[], counts }"
        },
        {
          method: "GET",
          path: "/api/workspace/folder/scan",
          description: "Рекурсивный инвентарь свободной памяти для разбора материалов по темам.",
          query: ["folderPath", "depth", "includeBody", "maxBodyChars"],
          body: null,
          response: "{ exists, folderPath, depth, truncated, counts, items[] }"
        },
        {
          method: "GET",
          path: "/api/workspace/folder/page",
          description: "Markdown-страница из свободной памяти (frontmatter + body).",
          query: ["file"],
          body: null,
          response: "{ exists, path, frontmatter, body, content, page }"
        },
        {
          method: "GET",
          path: "/api/workspace/folder/text",
          description: "Текстовый файл из свободной памяти (.md, .txt, .csv, .json, .yaml, .pine, …).",
          query: ["file", "maxBytes"],
          body: null,
          response: "{ exists, path, content, truncated?, body?, page? }"
        },
        {
          method: "GET",
          path: "/api/workspace/folder/file",
          description: "Бинарный файл из свободной памяти (изображение, видео, pdf).",
          query: ["file", "thumb", "max"],
          body: null,
          response: "Binary (Content-Type по расширению)"
        },
        {
          method: "GET",
          path: "/api/storage/file",
          description: "Прочитать текстовый файл из слота awn-storage (scripts, artefacts, repository, …).",
          query: ["path", "folder", "file"],
          body: null,
          response: "{ folder, file, content, exists }"
        },
        {
          method: "POST",
          path: "/api/storage/file",
          description: "Записать текстовый файл в слот (scripts, artefacts, …; main/ — не .md).",
          query: [],
          body: "{ path, folder, file, content }",
          response: "{ folder, file, content, exists: true }"
        }
      ]
    },
    {
      id: "media",
      title: "Медиа и превью",
      endpoints: [
        {
          method: "GET",
          path: "/api/media",
          description: "Файлы media, группы по типу.",
          query: ["path"],
          body: null,
          response: "{ exists, files, content, groups }"
        },
        {
          method: "GET",
          path: "/api/media/file",
          description: "Скачать бинарный файл из media.",
          query: ["path", "file"],
          body: null,
          response: "Binary (Content-Type по расширению)"
        },
        {
          method: "POST",
          path: "/api/media/file",
          description: "Загрузить файл в media (base64).",
          query: [],
          body: "{ path, data, fileName?, mimeType? }",
          response: "{ file, imageUrl }"
        },
        {
          method: "GET",
          path: "/api/media/sidecar",
          description: "Sidecar .md для медиафайла.",
          query: ["path", "file"],
          body: null,
          response: "{ sourceFile, sidecar, content, created? }"
        },
        {
          method: "POST",
          path: "/api/media/sidecar",
          description: "Сохранить sidecar .md.",
          query: [],
          body: "{ path, file, content }",
          response: "{ sourceFile, sidecar, content }"
        },
        {
          method: "POST",
          path: "/api/media/file/rename",
          description: "Переименовать медиафайл и sidecar.",
          query: [],
          body: "{ path, file, title }",
          response: "{ file, sidecar?, content? }"
        },
        {
          method: "DELETE",
          path: "/api/media/file",
          description: "Удалить медиафайл и sidecar.",
          query: ["path", "file"],
          body: null,
          response: "{ deleted, path }"
        },
        {
          method: "POST",
          path: "/api/media/file/move",
          description: "Переместить медиафайл (внутри темы или в другую тему).",
          query: [],
          body: "{ path, file, targetPath?, targetFile? }",
          response: "{ path, file, sidecar?, content?, linkRewrite? }"
        },
        {
          method: "GET",
          path: "/api/node/meta",
          description: "Даты и размер манифеста, папки ноды и _.props.yaml (для панели «Навигация»).",
          query: ["path"],
          body: null,
          response: "{ path, manifest: { size, createdAt, updatedAt }, folder?, props? }"
        },
        {
          method: "GET",
          path: "/api/preview",
          description: "Мета превью темы ({папка}/awn-storage/*/preview.*).",
          query: ["path"],
          body: null,
          response: "{ exists, file, imageUrl }"
        },
        {
          method: "GET",
          path: "/api/preview/image",
          description: "Изображение превью.",
          query: ["path"],
          body: null,
          response: "Binary image"
        },
        {
          method: "POST",
          path: "/api/preview",
          description: "Загрузить preview.jpg|png|gif (base64).",
          query: [],
          body: "{ path, data, fileName?, mimeType? }",
          response: "{ exists: true, file, imageUrl }"
        },
        {
          method: "DELETE",
          path: "/api/preview",
          description: "Удалить превью.",
          query: ["path"],
          body: null,
          response: "{ deleted: true }"
        }
      ]
    },
    {
      id: "workspace",
      title: "Workspace агента",
      endpoints: [
        {
          method: "GET",
          path: "/api/agent/storage-layout",
          description: "Схема слотов awn-storage (named-slots-v2) для дашборда агента.",
          query: [],
          body: null,
          response: "{ layoutVersion, slots[], areas[] }"
        },
        {
          method: "GET",
          path: "/api/agent/workspace-table",
          description: "Таблица нод workspace для карты/реестра.",
          query: [],
          body: null,
          response: "{ rows[] }"
        },
        {
          method: "GET",
          path: "/api/agent/canonical-model",
          description: "Канон v1: page types (ws/area/topic), slot content types (record/record.category/sidecar), slot bindings.",
          query: [],
          body: null,
          response: "{ version, model, pageTypes[], slotContentTypes[], rules, slotTypes[], slotBindings[] (derived from awn-system/types/slots/) }"
        },
        {
          method: "GET",
          path: "/api/agent/site-map",
          description: "Карта сайта — все области и темы с manifest paths, awn-type и иерархией.",
          query: [],
          body: null,
          response: "{ version, model, canonicalModel, workspace, areas[], topics[], topicCount, areaCount }"
        },
        {
          method: "GET",
          path: "/api/agent/session-context",
          description: "Стартовый пакет для агента: serviceDocs, session-start темы, runtimeSyncTopics (cron/heartbeat), AGENTS.md, карта API.",
          query: [],
          body: null,
          response: "{ version, agentId, pathHints, apiMap, serviceDocs[], sessionStartTopics[], runtimeSyncTopics[], systemFiles[] }"
        },
        {
          method: "GET",
          path: "/api/agent/timeline",
          description: "Лента изменений по датам файлов в workspace.",
          query: ["limit?"],
          body: null,
          response: "{ events[] }"
        },
        {
          method: "GET",
          path: "/api/agent/activity",
          description:
            "Журнал активности для колокольчика 🔔 в UI: create/update/delete/move/notify через MCP и UI. Хранится в .agent-cms/activity.jsonl (per-agent).",
          query: ["since?", "limit?"],
          body: null,
          response:
            "{ events[{ id, action, path, manifestPath?, label?, topicName?, recordName?, message?, source, at }], latestId, total, fileLines, truncated, limits }"
        },
        {
          method: "POST",
          path: "/api/agent/activity/notify",
          description:
            "Произвольное уведомление пользователю в колокольчик CMS. Не путать с /api/shell/message (диалог Agent Shell).",
          query: [],
          body: "{ title?, message?, text?, body?, path?, manifestPath?, label? }",
          response: "{ event: { id, action: notify, label, message?, path, manifestPath?, source, at } }"
        },
        {
          method: "GET",
          path: "/api/public/images",
          agentScope: false,
          description: "Список изображений в public/ (галерея UI).",
          query: [],
          body: null,
          response: "{ images: [{ name, url }] }"
        }
      ]
    },
    {
      id: "integrations",
      title: "Интеграции и ОС",
      endpoints: [
        {
          method: "GET",
          path: "/api/obsidian/open-uri",
          description: "Сформировать obsidian:// URI для файла режима.",
          query: ["path", "mode?"],
          body: null,
          response: "{ mode, targetPath, uri }"
        },
        {
          method: "GET",
          path: "/api/reveal/folder",
          description: "Путь к папке ноды для «Показать в Finder».",
          query: ["path"],
          body: null,
          response: "{ path, absolutePath }"
        },
        {
          method: "POST",
          path: "/api/reveal",
          description: "Открыть файл или папку в проводнике ОС.",
          query: [],
          body: "{ path, file?, folder? }",
          response: "{ ok: true }"
        }
      ]
    }
  ]
};
