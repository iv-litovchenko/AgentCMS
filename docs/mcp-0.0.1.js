module.exports = {
  version: "0.0.1",
  versionLabel: "Актуальная",
  title: "Agent CMS MCP Server",
  subtitle: "Model Context Protocol · stdio · mcp-server/",
  packagePath: "mcp-server/",
  generatedAt: "2026-06-04",
  notes: [
    "Актуальная справка по mcp-server/index.js. В UI: select «0.0.1 — актуальная».",
    "Обёртка над HTTP API. Перед запуском MCP: npm start → http://localhost:3000.",
    "GET /api/mcp-docs?version=0.0.1 (по умолчанию). 0.0.0 — предыдущий снимок.",
    "AGENT_CMS_BASE_URL, AGENT_CMS_AGENT (YAMLCMS_* — legacy). path → _REGINFO.md; file → _Content/ / _Assets/.",
    "25 tools — полный список ниже."
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
      id: "reference",
      title: "Справка",
      tools: [
        {
          name: "get_api_reference",
          description: "JSON-документация HTTP API (GET /api/docs?version=0.0.1).",
          parameters: "—",
          http: "GET /api/docs?version=0.0.1"
        }
      ]
    },
    {
      id: "agents",
      title: "Агенты",
      tools: [
        {
          name: "list_agents",
          description: "Список агентов из awn-agents.json.",
          parameters: "—",
          http: "GET /api/agents"
        }
      ]
    },
    {
      id: "menu",
      title: "Навигация",
      tools: [
        {
          name: "get_menu",
          description: "Дерево нод workspace (_REGINFO.md).",
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
      title: "Нода",
      tools: [
        {
          name: "read_node_description",
          description: "Прочитать _REGINFO.md.",
          parameters: "path",
          http: "GET /api/file?path="
        },
        {
          name: "write_node_description",
          description: "Сохранить _REGINFO.md.",
          parameters: "path, content",
          http: "POST /api/file/content"
        },
        {
          name: "read_node_properties",
          description: "Frontmatter из _REGINFO.md.",
          parameters: "path",
          http: "GET /api/file/properties"
        },
        {
          name: "write_node_properties",
          description: "Сохранить frontmatter.",
          parameters: "path, content",
          http: "POST /api/file/properties"
        },
        {
          name: "create_node",
          description: "Создать папку-ноду или part в _Parts.",
          parameters: "parentPath?, type: folder|file, name",
          http: "POST /api/node/create"
        },
        {
          name: "delete_node",
          description: "Удалить part или папку ноды.",
          parameters: "path",
          http: "DELETE /api/file?path="
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
          description: "Список .md в _Content.",
          parameters: "path",
          http: "GET /api/external/files"
        },
        {
          name: "read_external_memory",
          description: "Прочитать заметку из _Content.",
          parameters: "path, file",
          http: "GET /api/external/file"
        },
        {
          name: "write_external_memory",
          description: "Сохранить .md в _Content.",
          parameters: "path, file, content",
          http: "POST /api/external/file"
        },
        {
          name: "create_external_memory",
          description: "Создать воспоминание с frontmatter.",
          parameters: "path, title?",
          http: "POST /api/external/file/create"
        }
      ]
    },
    {
      id: "storage",
      title: "Настройки awn-storage",
      tools: [
        {
          name: "read_todo",
          description: "TODO ноды (*.x.todo.md).",
          parameters: "path",
          http: "GET /api/todo"
        },
        {
          name: "write_todo",
          description: "Сохранить TODO.",
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
          description: "Inbox, Scripts, Artefacts и др.",
          parameters: "path, folder",
          http: "GET /api/folder/view"
        }
      ]
    },
    {
      id: "media",
      title: "Медиа",
      tools: [
        {
          name: "list_media",
          description: "Файлы _Assets.",
          parameters: "path",
          http: "GET /api/media"
        },
        {
          name: "read_media_sidecar",
          description: "Sidecar .md для медиафайла.",
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
      id: "system",
      title: "Системные файлы агента",
      tools: [
        {
          name: "list_system_files",
          description: "AGENTS.md, README.md и др.",
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
