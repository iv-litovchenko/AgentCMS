module.exports = {
  version: "0.0.2",
  versionLabel: "Slim · 44 tools",
  title: "Agent CMS MCP Server",
  subtitle: "Model Context Protocol · stdio · mcp-server/ v0.3.0",
  packagePath: "mcp-server/",
  generatedAt: "2026-08-08",
  notes: [
    "MCP slim v0.3.0 — 44 tools · PAGE · SLOT · CONTENT + path-based FS.",
    "Перед запуском: npm start → http://localhost:3000.",
    "GET /api/mcp-docs?version=0.0.2 — этот документ (HTTP, не MCP tool).",
    "AGENT_CMS_BASE_URL, AGENT_CMS_AGENT (YAMLCMS_* — legacy).",
    "path → manifest.md; slot → main|inbox|media|…; ref → путь внутри слота.",
    "Карта tools: workspaces/agent-cms-core/temp2/examples/mcp-optimiz.md",
    "Бинарники / media → upload_file по полному workspace path.",
    "notify_user — колокольчик CMS (не Shell)."
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
      title: "Старт / контекст",
      tools: [
        {
          name: "get_session_context",
          description: "START HERE: topicRegistry, alwaysContext, service manifests.",
          parameters: "—",
          http: "GET /api/agent/session-context"
        },
        {
          name: "get_user_active_context_now",
          description: "Что открыто в UI: focus.entity, готовые path/slot/ref для read/write_*.",
          parameters: "—",
          http: "GET /api/agent/active-context"
        },
        {
          name: "list_workspace_always_context",
          description: "Always-context: awn-runtime-load-always + AGENTS/SKILL/README + GLOBAL_MCP_DOC.",
          parameters: "—",
          http: "GET /api/agent/always-context"
        },
        {
          name: "list_workspace_cron",
          description: "Индекс awn-runtime-cron (+ schedule).",
          parameters: "—",
          http: "GET /api/agent/cron-registry"
        },
        {
          name: "list_workspace_heartbeat",
          description: "Индекс awn-runtime-heartbeat.",
          parameters: "—",
          http: "GET /api/agent/heartbeat-registry"
        }
      ]
    },
    {
      id: "menu",
      title: "Навигация",
      tools: [
        {
          name: "get_page_map",
          description: "Карта workspace: manifest-узлы + папки без manifest (kind:folder). Без body.",
          parameters: "includeSlots?: boolean",
          http: "GET /api/agent/page-map"
        },
        {
          name: "get_content_map",
          description: "Карта контента страницы по слотам (без body).",
          parameters: "path, slot?",
          http: "GET /api/agent/content-map"
        },
        {
          name: "search_workspace",
          description: "Поиск по workspace (шапка UI). scope=all по умолчанию.",
          parameters: "query, scope?, fileType?, match?, limit?",
          http: "GET /api/search"
        }
      ]
    },
    {
      id: "page",
      title: "Страница (manifest.md)",
      tools: [
        { name: "read_page_body", description: "Тело manifest.md.", parameters: "path", http: "GET /api/file" },
        { name: "write_page_body", description: "Сохранить тело.", parameters: "path, content", http: "POST /api/file/content" },
        { name: "read_page_properties", description: "Frontmatter manifest.md.", parameters: "path", http: "GET /api/file/properties" },
        { name: "write_page_properties", description: "Patch frontmatter.", parameters: "path, content", http: "POST /api/file/properties" },
        {
          name: "read_page_schema",
          description: "schema-mod.yml layers (mode=layers default). База типа: get_type.",
          parameters: "path, mode?, target?",
          http: "GET /api/file/page-schema"
        },
        { name: "write_page_schema", description: "Записать schema-mod override.", parameters: "path, content", http: "POST /api/file/page-schema" },
        { name: "create_page", description: "Создать area (folder) или topic (file).", parameters: "parentPath?, type, displayName?, slug?, awnType?", http: "POST /api/page/create" },
        { name: "delete_page", description: "Удалить страницу.", parameters: "path", http: "DELETE /api/file" },
        { name: "rename_page", description: "Переименовать.", parameters: "path, displayName?, slug?", http: "POST /api/file/title" },
        { name: "move_page", description: "Переместить.", parameters: "path, parentPath", http: "POST /api/page/move" }
      ]
    },
    {
      id: "slot",
      title: "Слот",
      tools: [
        {
          name: "list_page_slots",
          description: "Слоты страницы: driver, path, allowedContent.",
          parameters: "path",
          http: "GET /api/page/slots"
        }
      ]
    },
    {
      id: "content",
      title: "Контент",
      tools: [
        { name: "read_content_body", description: "Тело .md или internal slot.", parameters: "path, slot, ref?", http: "—" },
        { name: "write_content_body", description: "Сохранить тело.", parameters: "path, slot, ref?, content", http: "—" },
        { name: "read_content_properties", description: "Frontmatter .md.", parameters: "path, slot, ref?", http: "—" },
        { name: "write_content_properties", description: "Patch frontmatter.", parameters: "path, slot, ref?, content", http: "—" },
        { name: "create_content", description: "Запись/категория; inbox intake: slot=inbox, status=new.", parameters: "path, slot, awnType?, body?, fileExtension?, …", http: "POST /api/storage/file/create" },
        { name: "rename_content", description: "Переименовать.", parameters: "path, slot, ref, displayName?", http: "—" },
        { name: "move_content", description: "Переместить.", parameters: "path, slot, ref, targetPath?, …", http: "—" },
        { name: "delete_content", description: "Удалить.", parameters: "path, slot, ref", http: "DELETE …" }
      ]
    },
    {
      id: "types",
      title: "Типы",
      tools: [
        {
          name: "list_types",
          description: "Индекс типов: domain?, kind?, filter? (create-page|slot-content|data-containers|data-elements).",
          parameters: "domain?, kind?, filter?",
          http: "GET /api/agent-system/types"
        },
        {
          name: "get_type",
          description: "Merged schema по id или catalog path.",
          parameters: "id?, path?",
          http: "GET /api/agent-system/type"
        }
      ]
    },
    {
      id: "data",
      title: "AWN-DATA runtime",
      tools: [
        { name: "list_data_stores", description: "Список накопителей.", parameters: "—", http: "GET /api/awn-data" },
        { name: "get_data_store", description: "Один store: schema, records, tree.", parameters: "store", http: "GET /api/awn-data?store=" },
        { name: "create_data_store", description: "Создать group/collection/singleton.", parameters: "slug, kind?, …", http: "POST /api/awn-data/stores" },
        { name: "create_data_record", description: "Добавить запись.", parameters: "store, id?, title?, parent?", http: "POST /api/awn-data/records" },
        {
          name: "read_data_store_schema",
          description: "schema-mod.yml store (экземпляр, не каталог типов).",
          parameters: "store",
          http: "GET /api/awn-data/store-schema"
        }
      ]
    },
    {
      id: "intake",
      title: "Inbox и диалоги",
      tools: [
        { name: "list_inbox", description: "Inbox темы.", parameters: "path", http: "GET /api/inbox" },
        {
          name: "triage_inbox_item",
          description: "Triage: to-dialogs, to-content, mark-done, set-status.",
          parameters: "path, file, action, status?",
          http: "POST /api/inbox/triage"
        },
        {
          name: "read_dialogs",
          description: "Диалог темы (slot dialogs).",
          parameters: "path, mode?, file?, name?",
          http: "GET /api/dialogs"
        },
        {
          name: "append_dialog",
          description: "Сообщение в диалог темы.",
          parameters: "path, body, role?, …",
          http: "POST /api/dialogs"
        }
      ]
    },
    {
      id: "filesystem",
      title: "Система + FS",
      tools: [
        { name: "list_system_files", description: "AGENTS.md, SKILL.md, … → read_file/write_file.", parameters: "—", http: "GET /api/system-files" },
        { name: "read_file", description: "Файл по workspace path.", parameters: "path, maxBytes?", http: "GET /api/workspace/fs/read" },
        { name: "write_file", description: "Текстовый файл по path.", parameters: "path, content", http: "POST /api/workspace/fs/write" },
        { name: "upload_file", description: "Base64 → path (media/assets/бинарники).", parameters: "path, data, mimeType?", http: "POST /api/workspace/fs/upload" },
        { name: "list_folder", description: "Содержимое папки.", parameters: "path, depth?", http: "GET /api/workspace/fs/list" }
      ]
    },
    {
      id: "notifications",
      title: "Уведомление",
      tools: [
        {
          name: "notify_user",
          description: "Уведомление в колокольчик CMS.",
          parameters: "title, message?, path?",
          http: "POST /api/agent/activity/notify"
        }
      ]
    }
  ]
};
