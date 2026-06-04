module.exports = {
  version: "0.0.0",
  versionLabel: "Предыдущая (снимок)",
  title: "Agent CMS MCP Server",
  subtitle: "Model Context Protocol · stdio",
  packagePath: "mcp-server/",
  notes: [
    "MCP-сервер — обёртка над HTTP API Agent CMS. Перед запуском поднимите CMS: npm start (по умолчанию http://localhost:3000).",
    "Переменные: AGENT_CMS_BASE_URL, AGENT_CMS_AGENT (id агента для ?agent=). Старые YAMLCMS_* тоже поддерживаются.",
    "path — путь к _.x.md ноды; file — путь к .md внутри Content или файлу в Assets.",
    "Установка: cd mcp-server && npm install. Запуск вручную: node mcp-server/index.js (stdio)."
  ],
  cursorConfig: {
    command: "node",
    args: ["<ABS_PATH>/mcp-server/index.js"],
    env: {
      AGENT_CMS_BASE_URL: "http://localhost:3000",
      AGENT_CMS_AGENT: "main"
    }
  },
  groups: [
    {
      id: "setup",
      title: "Подключение",
      tools: [
        {
          name: "get_api_reference",
          description: "Получить JSON-документацию HTTP API (GET /api/docs).",
          parameters: "—",
          http: "GET /api/docs"
        }
      ]
    },
    {
      id: "agents",
      title: "Агенты",
      tools: [
        {
          name: "list_agents",
          description: "Список агентов из acms.agents.json.",
          parameters: "—",
          http: "GET /api/agents"
        }
      ]
    },
    {
      id: "menu",
      title: "Навигация · меню и поиск",
      tools: [
        {
          name: "get_menu",
          description: "Дерево нод workspace (_.x.md).",
          parameters: "—",
          http: "GET /api/menu"
        },
        {
          name: "search_workspace",
          description: "Поиск по workspace.",
          parameters: "query, scope?: content|filename|description, limit?: 1..100",
          http: "GET /api/search"
        }
      ]
    },
    {
      id: "node",
      title: "Настройки · нода",
      tools: [
        {
          name: "read_node_description",
          description: "Прочитать _.x.md (описание, инструкции).",
          parameters: "path",
          http: "GET /api/file?path="
        },
        {
          name: "write_node_description",
          description: "Сохранить _.x.md.",
          parameters: "path, content",
          http: "POST /api/file/content"
        },
        {
          name: "read_node_properties",
          description: "Прочитать frontmatter из _.x.md.",
          parameters: "path",
          http: "GET /api/file/properties"
        },
        {
          name: "write_node_properties",
          description: "Сохранить frontmatter в _.x.md.",
          parameters: "path, content",
          http: "POST /api/file/properties"
        },
        {
          name: "create_node",
          description: "Создать папку-ноду или part.",
          parameters: "parentPath?, type: folder|file, name",
          http: "POST /api/node/create"
        },
        {
          name: "delete_node",
          description: "Удалить part или папку ноды. Деструктивно.",
          parameters: "path",
          http: "DELETE /api/file"
        }
      ]
    },
    {
      id: "memory",
      title: "Память",
      tools: [
        {
          name: "read_internal_memory",
          description: "Однофайловая память (_.x.content.md).",
          parameters: "path",
          http: "GET /api/memory/internal"
        },
        {
          name: "write_internal_memory",
          description: "Сохранить однофайловую память.",
          parameters: "path, content",
          http: "POST /api/memory/internal"
        },
        {
          name: "list_external_memory",
          description: "Список .md в Content (многофайловая память).",
          parameters: "path",
          http: "GET /api/external/files"
        },
        {
          name: "read_external_memory",
          description: "Прочитать заметку из Content.",
          parameters: "path, file",
          http: "GET /api/external/file"
        },
        {
          name: "write_external_memory",
          description: "Сохранить .md в Content.",
          parameters: "path, file, content",
          http: "POST /api/external/file"
        },
        {
          name: "create_external_memory",
          description: "Создать новое воспоминание с frontmatter.",
          parameters: "path, title?",
          http: "POST /api/external/file/create"
        }
      ]
    },
    {
      id: "attachments",
      title: "Вложения · медиа",
      tools: [
        {
          name: "list_media",
          description: "Файлы Assets (группы по типу).",
          parameters: "path",
          http: "GET /api/media"
        },
        {
          name: "read_media_sidecar",
          description: "Прочитать или создать sidecar .md для медиафайла.",
          parameters: "path, file",
          http: "GET /api/media/sidecar"
        },
        {
          name: "write_media_sidecar",
          description: "Сохранить sidecar.",
          parameters: "path, file, content",
          http: "POST /api/media/sidecar"
        }
      ]
    },
    {
      id: "storage",
      title: "Настройки · _Storage",
      tools: [
        {
          name: "read_todo",
          description: "TODO ноды (`*.x.todo.md`).",
          parameters: "path",
          http: "GET /api/todo"
        },
        {
          name: "write_todo",
          description: "Сохранить TODO в `*.x.todo.md`.",
          parameters: "path, content",
          http: "POST /api/todo"
        },
        {
          name: "read_configuration",
          description: "Configuration.md.",
          parameters: "path",
          http: "GET /api/configuration"
        },
        {
          name: "write_configuration",
          description: "Сохранить Configuration.md.",
          parameters: "path, content",
          http: "POST /api/configuration"
        },
        {
          name: "read_env",
          description: ".env ноды.",
          parameters: "path",
          http: "GET /api/env"
        },
        {
          name: "write_env",
          description: "Сохранить .env.",
          parameters: "path, content",
          http: "POST /api/env"
        },
        {
          name: "list_folder",
          description: "Содержимое Inbox, Artefacts и др.",
          parameters: "path, folder",
          http: "GET /api/folder/view"
        }
      ]
    },
    {
      id: "system",
      title: "Системные файлы агента",
      tools: [
        {
          name: "list_system_files",
          description: "AGENTS.md, README.md, TODO.md и др.",
          parameters: "—",
          http: "GET /api/system-files"
        },
        {
          name: "read_system_file",
          description: "Прочитать системный файл.",
          parameters: "name",
          http: "GET /api/system-file"
        },
        {
          name: "write_system_file",
          description: "Записать системный файл.",
          parameters: "name, content",
          http: "POST /api/system-file"
        }
      ]
    }
  ]
};
