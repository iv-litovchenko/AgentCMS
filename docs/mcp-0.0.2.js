module.exports = {
  version: "0.0.2",
  versionLabel: "Актуальная",
  title: "Agent CMS MCP Server",
  subtitle: "Model Context Protocol · stdio · mcp-server/ v0.2.0",
  packagePath: "mcp-server/",
  generatedAt: "2026-06-30",
  notes: [
    "MCP v0.2.0 — обёртка над HTTP API Agent CMS. Перед запуском: npm start → http://localhost:3000.",
    "GET /api/mcp-docs?version=0.0.2 (по умолчанию). 0.0.1 и 0.0.0 — предыдущие снимки.",
    "AGENT_CMS_BASE_URL, AGENT_CMS_AGENT (YAMLCMS_* — legacy).",
    "path → manifest.md темы/области (напр. awn-container/finansydohody/manifest.md; legacy _registration.md).",
    "file → имя .md в awn-storage/main/ или media/ относительно темы.",
    "Старт сессии: один вызов get_session_context — не делайте grep/curl/ls по репозиторию.",
    "60 tools — полный список ниже.",
    "awn-mask-file (маска имён в main/) — read_node_config → awnMaskFile; create_external_memory подхватывает маску автоматически."
  ],
  cursorConfig: {
    command: "node",
    args: ["<ABS_PATH>/mcp-server/index.js"],
    env: {
      AGENT_CMS_BASE_URL: "http://localhost:3000",
      AGENT_CMS_AGENT: "agent-cms-test"
    }
  },
  copawConfig: {
    comment: "CoPaw / QwenPaw: mcp_servers в конфиге ReMe",
    mcp_servers: {
      "agent-cms": {
        command: "node",
        args: ["<ABS_PATH>/mcp-server/index.js"],
        env: {
          AGENT_CMS_BASE_URL: "http://localhost:3000",
          AGENT_CMS_AGENT: "agent-cms-test"
        }
      }
    }
  },
  groups: [
    {
      id: "bootstrap",
      title: "Старт сессии",
      tools: [
        {
          name: "get_session_context",
          description: "Один запрос: agent/user/voice manifests, session-start темы, AGENTS.md, карта API, path hints.",
          parameters: "—",
          http: "GET /api/agent/session-context"
        },
        {
          name: "get_mcp_docs",
          description: "Справка по MCP tools (этот документ).",
          parameters: "—",
          http: "GET /api/mcp-docs?version=0.0.2"
        },
        {
          name: "get_api_reference",
          description: "Справка HTTP API JSON.",
          parameters: "—",
          http: "GET /api/docs?version=0.0.2"
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
      title: "Навигация и workspace",
      tools: [
        {
          name: "get_menu",
          description: "Дерево workspace (manifest.md).",
          parameters: "—",
          http: "GET /api/menu"
        },
        {
          name: "search_workspace",
          description: "Поиск по workspace (как в шапке UI). По умолчанию scope=all — имя, мета темы и текст файлов.",
          parameters:
            "query, scope?: all|content|filename|description|tags, fileType?: all|markdown|sidecar|pdf|office|spreadsheet|video|audio|image|archive|config|other, limit?: 1..100",
          http: "GET /api/search?q=&scope=&fileType=&limit="
        },
        {
          name: "get_runtime_registry",
          description: "Реестр тем (awn-runtime-load, cron, heartbeat). Фильтр: sync, cron, heartbeat, mode.",
          parameters: "sync?: bool, cron?: bool, heartbeat?: bool, mode?: any|all",
          http: "GET /api/agent/runtime-registry"
        },
        {
          name: "get_runtime_map",
          description: "Карта тем с cron/heartbeat для синхронизации агента (как site map для automation).",
          parameters: "sync?: bool, cron?: bool, heartbeat?: bool, mode?: any|all",
          http: "GET /api/agent/runtime-map"
        },
        {
          name: "get_storage_layout",
          description: "Слоты awn-storage (named-slots-v2).",
          parameters: "—",
          http: "GET /api/agent/storage-layout"
        },
        {
          name: "get_workspace_table",
          description: "Плоская таблица тем агента.",
          parameters: "—",
          http: "GET /api/agent/workspace-table"
        },
        {
          name: "get_canonical_model",
          description: "Канон v1: page types (ws/area/topic), slot content (record/record.category/sidecar), bindings.",
          parameters: "—",
          http: "GET /api/agent/canonical-model"
        },
        {
          name: "get_site_map",
          description: "Карта сайта — все области и темы с manifest paths и awn-type.",
          parameters: "—",
          http: "GET /api/agent/site-map"
        },
        {
          name: "get_node_meta",
          description: "Метаданные ноды: слои storage, preview, manifest.",
          parameters: "path",
          http: "GET /api/node/meta"
        },
        {
          name: "list_awn_types",
          description: "Каталог awn-type для workspace агента.",
          parameters: "—",
          http: "GET /api/awn-types"
        }
      ]
    },
    {
      id: "platform",
      title: "Платформа",
      tools: [
        {
          name: "list_type_catalog",
          description: "Каталог типов платформы.",
          parameters: "—",
          http: "GET /api/type-catalog"
        },
        {
          name: "list_components",
          description: "Реестр компонентов.",
          parameters: "—",
          http: "GET /api/components"
        },
        {
          name: "list_platform_catalogs",
          description: "Глобальные справочники (tags, categories, …).",
          parameters: "—",
          http: "GET /api/platform/catalogs"
        },
        {
          name: "list_agent_catalogs",
          description: "Справочники агента (global + local).",
          parameters: "—",
          http: "GET /api/agent/catalogs"
        },
        {
          name: "get_platform_index",
          description: "Навигационный index.json платформы.",
          parameters: "—",
          http: "GET /api/platform/index"
        },
        {
          name: "add_catalog_item",
          description: "Добавить запись в справочник.",
          parameters: "preset, id?, label?, color?, email?",
          http: "POST /api/agent/catalogs/items"
        }
      ]
    },
    {
      id: "node",
      title: "Manifest / нода",
      tools: [
        {
          name: "read_node_description",
          description: "Тело manifest.md.",
          parameters: "path",
          http: "GET /api/file?path="
        },
        {
          name: "write_node_description",
          description: "Сохранить тело manifest.md.",
          parameters: "path, content",
          http: "POST /api/file/content"
        },
        {
          name: "read_node_properties",
          description: "YAML frontmatter manifest.md.",
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
          name: "read_topic_schema",
          description: "Схема полей темы (schema.yml).",
          parameters: "path",
          http: "GET /api/file/topic-schema"
        },
        {
          name: "write_topic_schema",
          description: "Сохранить схему полей.",
          parameters: "path, content",
          http: "POST /api/file/topic-schema"
        },
        {
          name: "read_node_config",
          description: "configuration.yml ноды: awn_settings (awn-mask-file), awn_ui, awn_schema.",
          parameters: "path",
          http: "GET /api/file/node-config"
        },
        {
          name: "write_node_config",
          description: "Сохранить configuration.yml ноды.",
          parameters: "path, content",
          http: "POST /api/file/node-config"
        },
        {
          name: "create_node",
          description: "Создать область (folder) или тему (file). displayName/title → awn-name; slug/name → папка на диске.",
          parameters: "parentPath?, type: folder|file, displayName?, title?, name?, slug?, awnType?",
          http: "POST /api/node/create"
        },
        {
          name: "delete_node",
          description: "Удалить область, топик или part.",
          parameters: "path",
          http: "DELETE /api/file?path="
        },
        {
          name: "rename_node",
          description: "Переименовать область/топик. displayName → awn-name; slug → папка на диске.",
          parameters: "path, displayName?, title?, slug?",
          http: "POST /api/file/title"
        },
        {
          name: "move_node",
          description: "Переместить область/топик в другую родительскую папку.",
          parameters: "path, parentPath",
          http: "POST /api/node/move"
        }
      ]
    },
    {
      id: "memory",
      title: "Память (awn-storage)",
      tools: [
        {
          name: "read_memory_summary",
          description: "Сводка слоёв памяти темы.",
          parameters: "path",
          http: "GET /api/memory/summary"
        },
        {
          name: "read_internal_memory",
          description: "Однофайловая internal-память (legacy memory.md).",
          parameters: "path",
          http: "GET /api/memory/internal"
        },
        {
          name: "write_internal_memory",
          description: "Сохранить internal-память.",
          parameters: "path, content",
          http: "POST /api/memory/internal"
        },
        {
          name: "read_tabular_memory",
          description: "Табличная память CSV.",
          parameters: "path, file?",
          http: "GET /api/memory/tabular"
        },
        {
          name: "write_tabular_memory",
          description: "Сохранить табличную память.",
          parameters: "path, content, file?",
          http: "POST /api/memory/tabular"
        },
        {
          name: "list_external_memory",
          description: "Список .md в awn-storage/main/.",
          parameters: "path",
          http: "GET /api/external/files"
        },
        {
          name: "read_external_memory",
          description: "Прочитать заметку из main/.",
          parameters: "path, file",
          http: "GET /api/external/file"
        },
        {
          name: "write_external_memory",
          description: "Сохранить заметку в main/.",
          parameters: "path, file, content",
          http: "POST /api/external/file"
        },
        {
          name: "create_external_memory",
          description: "Создать заметку в main/. Без fileMask — берёт awn-mask-file из node config. Маска: {YYYY},{YY},{MM},{DD},{WW},{id}.",
          parameters: "path, title?, displayName?, fileMask?, parent?",
          http: "POST /api/external/file/create"
        },
        {
          name: "rename_external_memory",
          description: "Переименовать запись в main/.",
          parameters: "path, file, title",
          http: "POST /api/external/file/rename"
        },
        {
          name: "delete_external_memory",
          description: "Удалить запись из main/.",
          parameters: "path, file",
          http: "DELETE /api/external/file"
        },
        {
          name: "move_external_memory",
          description: "Переместить запись в main/ (внутри темы или между темами).",
          parameters: "path, file, targetPath?, targetFile?",
          http: "POST /api/external/file/move"
        }
      ]
    },
    {
      id: "intake",
      title: "Inbox и thread",
      tools: [
        {
          name: "list_inbox",
          description: "Inbox темы с triage-метаданными.",
          parameters: "path",
          http: "GET /api/inbox"
        },
        {
          name: "read_inbox_item",
          description: "Один элемент inbox.",
          parameters: "path, file",
          http: "GET /api/inbox/item"
        },
        {
          name: "triage_inbox_item",
          description: "Triage: to-thread, to-content, mark-done, set-status.",
          parameters: "path, file, action, status?",
          http: "POST /api/inbox/triage"
        },
        {
          name: "create_inbox_item",
          description: "Создать intake-заметку.",
          parameters: "path, title?, body?, source?, author?",
          http: "POST /api/inbox/create"
        },
        {
          name: "read_thread",
          description: "Диалог thread темы.",
          parameters: "path, mode?, file?, name?",
          http: "GET /api/thread"
        },
        {
          name: "append_thread",
          description: "Добавить сообщение в thread.",
          parameters: "path, body, role?, author?, linkedFiles?, mode?, file?, name?",
          http: "POST /api/thread"
        },
        {
          name: "get_topic_intake",
          description: "Сводка inbox + thread для темы.",
          parameters: "path",
          http: "GET /api/topic/intake"
        },
        {
          name: "get_intake_batch",
          description: "Пакетная сводка для нескольких тем.",
          parameters: "paths[]",
          http: "POST /api/intake/batch"
        }
      ]
    },
    {
      id: "comments",
      title: "Комментарии",
      tools: [
        {
          name: "list_comments",
          description: "Комментарии к ноде/файлу.",
          parameters: "path, mode?, file?, name?",
          http: "GET /api/file/comments"
        },
        {
          name: "append_comment",
          description: "Добавить комментарий.",
          parameters: "path, body, author?, replyTo?, mode?, file?, name?",
          http: "POST /api/file/comments"
        },
        {
          name: "toggle_comment_reaction",
          description: "Реакция 👍 на комментарий.",
          parameters: "path, commentId, author?, reaction?, mode?, file?, name?",
          http: "POST /api/file/comments/reaction"
        }
      ]
    },
    {
      id: "storage",
      title: "Настройки awn-storage",
      tools: [
        {
          name: "read_todo",
          description: "TODO темы.",
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
          description: "configuration.yml.",
          parameters: "path",
          http: "GET /api/configuration"
        },
        {
          name: "write_configuration",
          description: "Сохранить configuration.yml.",
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
          description: "Просмотр слоя: inbox, scripts, artefacts, …",
          parameters: "path, folder",
          http: "GET /api/folder/view"
        },
        {
          name: "read_storage_file",
          description: "Прочитать текстовый файл из слота (scripts, artefacts, repository, …).",
          parameters: "path, folder, file",
          http: "GET /api/storage/file"
        },
        {
          name: "write_storage_file",
          description: "Сырой текст в слот (scripts, repository, …). Для typed .md — create_storage_record.",
          parameters: "path, folder, file, content",
          http: "POST /api/storage/file"
        },
        {
          name: "create_storage_record",
          description: "Typed .md запись (awn.content.record + схема слота): inbox/, notes/, references/, artefacts/, scripts/.",
          parameters: "path, folder, displayName?, title?, slug?, body?, parent?, fileMask?, source?, author?, status?",
          http: "POST /api/storage/file/create"
        },
        {
          name: "create_storage_section",
          description: "Typed раздел (awn.content.record.category): manifest.md в подпапке слота.",
          parameters: "path, folder, title, displayName?, slug?, parent?",
          http: "POST /api/storage/section/create"
        }
      ]
    },
    {
      id: "media",
      title: "Медиа",
      tools: [
        {
          name: "list_media",
          description: "Файлы media/.",
          parameters: "path",
          http: "GET /api/media"
        },
        {
          name: "read_media_sidecar",
          description: "Sidecar .md медиафайла.",
          parameters: "path, file",
          http: "GET /api/media/sidecar"
        },
        {
          name: "write_media_sidecar",
          description: "Сохранить sidecar.",
          parameters: "path, file, content",
          http: "POST /api/media/sidecar"
        },
        {
          name: "rename_media_file",
          description: "Переименовать медиафайл и sidecar.",
          parameters: "path, file, title?",
          http: "POST /api/media/file/rename"
        },
        {
          name: "delete_media_file",
          description: "Удалить медиафайл и sidecar.",
          parameters: "path, file",
          http: "DELETE /api/media/file"
        },
        {
          name: "move_media_file",
          description: "Переместить медиафайл (внутри темы или между темами).",
          parameters: "path, file, targetPath?, targetFile?",
          http: "POST /api/media/file/move"
        }
      ]
    },
    {
      id: "system",
      title: "Системные файлы агента",
      tools: [
        {
          name: "list_system_files",
          description: "AGENTS.md, README.md, awn-map.yml, …",
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
