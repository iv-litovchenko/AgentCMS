module.exports = {
  version: "0.0.1",
  versionLabel: "Актуальная",
  title: "Agent CMS HTTP API",
  baseUrl: "/api",
  generatedAt: "2026-06-04",
  notes: [
    "Актуальная справка по коду server.js (июнь 2026). В UI: select «0.0.1 — актуальная».",
    "JSON-ответы, UTF-8. ?version=0.0.1 по умолчанию; 0.0.0 — предыдущий снимок.",
    "Контекст агента ?agent=<id>: все маршруты, кроме /api/agents*, /api/docs*, /api/mcp-docs*, /api/user-docs*, /api/public/images.",
    "path — путь к _.x.md; file — путь в _Content/ или _Assets/."
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
          description: "Сохранить реестр агентов и поля awn-agent.json (name, comment).",
          query: [],
          body: "{ agents: [{ id?, path, environment?, default?, active?, name?, comment? }] }",
          response: "{ agents[], defaultAgentId }"
        },
        {
          method: "POST",
          path: "/api/agents/create",
          agentScope: false,
          description: "Создать файлы агента в указанной папке workspace (awn-agent.json, t.{имя}/t.README.md, _awn-system/).",
          query: [],
          body: "{ path, name?, id? }",
          response: "{ agent: { path, id, name, comment, manifestFound, hasPreview } }"
        },
        {
          method: "POST",
          path: "/api/agents/discover",
          agentScope: false,
          description: "Найти workspace с awn-agent.json (Desktop, HOME, проект).",
          query: [],
          body: "{ roots?: string[], maxDepth?: number }",
          response: "{ agents: [{ path, name, comment, id, hasPreview, previewRel }] }"
        },
        {
          method: "GET",
          path: "/api/agents/workspace-preview",
          agentScope: false,
          description: "Превью агента из awn-storage/Preview.* по пути workspace.",
          query: ["path"],
          body: null,
          response: "image/*"
        },
        {
          method: "POST",
          path: "/api/agents/preview",
          agentScope: false,
          description: "Загрузить аватар агента в workspace/awn-storage/Preview.*.",
          query: [],
          body: "{ path, data: base64, fileName?, mimeType? }",
          response: "{ hasPreview, previewUrl }"
        },
        {
          method: "DELETE",
          path: "/api/agents/preview",
          agentScope: false,
          description: "Удалить аватар агента из workspace/awn-storage/Preview.*.",
          query: ["path"],
          body: null,
          response: "{ hasPreview: false, previewUrl: null }"
        },
        {
          method: "GET",
          path: "/api/agents/preview",
          agentScope: false,
          description: "Превью агента из awn-storage/Preview.* (после регистрации).",
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
          description: "Дерево нод workspace (_.x.md).",
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
          description: "Поиск по workspace.",
          query: ["q", "scope=content|filename|description", "limit=1..100"],
          body: null,
          response: "{ query, scope, results[], total }"
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
          description: "Мета AGENTS.md, README.md, TODO.md, .env и др.",
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
      title: "Тема / область (*.x.md)",
      endpoints: [
        {
          method: "GET",
          path: "/api/file",
          description: "Содержимое _.x.md (описание).",
          query: ["path"],
          body: null,
          response: "{ path, content }"
        },
        {
          method: "POST",
          path: "/api/file/content",
          description: "Сохранить содержимое _.x.md.",
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
          description: "YAML frontmatter из _.x.md (между ---).",
          query: ["path"],
          body: null,
          response: "{ path, content, exists }"
        },
        {
          method: "POST",
          path: "/api/file/properties",
          description: "Сохранить YAML frontmatter в _.x.md.",
          query: [],
          body: "{ path, content }",
          response: "{ path, content }"
        },
        {
          method: "GET",
          path: "/api/file/node-config",
          description: "Конфигурация ноды (*.x.config.yml).",
          query: ["path"],
          body: null,
          response: "{ path, content, exists, defaultLandingMode? }"
        },
        {
          method: "POST",
          path: "/api/file/node-config",
          description: "Сохранить *.x.config.yml (пустой content удаляет файл).",
          query: [],
          body: "{ path, content }",
          response: "{ path, content, exists, defaultLandingMode? }"
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
          path: "/api/node/create",
          description: "Создать _.x.md в текущей папке, подпапку-ноду или part в _Parts.",
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
        "Три драйвера: internal — Однофайловая (_.x.content.md), external — Многофайловая (_Content/), tabular — Табличная (_.x.content.csv). На overview все три доступны всегда; наличие файлов — в drivers.*.exists.",
      endpoints: [
        {
          method: "GET",
          path: "/api/memory/internal",
          description: "Однофайловая память — один файл _.x.content.md.",
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
          description: "Табличная память — _.x.content.csv. Таблица с данными (как Excel) для данных, которые загружаются в контекст за один раз.",
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
          description: "Многофайловая память — список файлов в _Content/ (заметки, вложенные папки).",
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
          description: "Configuration.md в awn-storage.",
          query: ["path"],
          body: null,
          response: "{ path, content, exists }"
        },
        {
          method: "POST",
          path: "/api/configuration",
          description: "Сохранить Configuration.md.",
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
          description: "Файлы _Assets, группы по типу.",
          query: ["path"],
          body: null,
          response: "{ exists, files, content, groups }"
        },
        {
          method: "GET",
          path: "/api/media/file",
          description: "Скачать бинарный файл из _Assets.",
          query: ["path", "file"],
          body: null,
          response: "Binary (Content-Type по расширению)"
        },
        {
          method: "POST",
          path: "/api/media/file",
          description: "Загрузить файл в _Assets (base64).",
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
          description: "Мета превью темы ({папка}/awn-storage/Preview.*; legacy: awn-storage/{ключ}/, awn-storage/_Preview, sidecar).",
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
          path: "/api/agent/timeline",
          description: "Лента изменений по датам файлов в workspace.",
          query: ["limit?"],
          body: null,
          response: "{ events[] }"
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
