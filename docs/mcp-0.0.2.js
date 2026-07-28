module.exports = {
  version: "0.0.2",
  versionLabel: "Актуальная",
  title: "Agent CMS MCP Server",
  subtitle: "Model Context Protocol · stdio · mcp-server/ v0.3.0",
  packagePath: "mcp-server/",
  generatedAt: "2026-06-30",
  notes: [
    "MCP v0.3.0 — PAGE · SLOT · CONTENT. Перед запуском: npm start → http://localhost:3000.",
    "GET /api/mcp-docs?version=0.0.2 (по умолчанию). 0.0.1 и 0.0.0 — предыдущие снимки.",
    "AGENT_CMS_BASE_URL, AGENT_CMS_AGENT (YAMLCMS_* — legacy).",
    "path → manifest.md страницы; slot → main|inbox|media|main-single|…; ref → путь внутри слота.",
    "86 tools — полный список ниже.",
    "awn-mask-file — read_page_config; create_content slot=main подхватывает маску.",
    "notify_user — уведомление в колокольчик CMS; shell_post_message — сообщение в Agent Shell (thread), не в колокольчик."
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
          name: "get_active_page",
          description: "Текущее открытое окно UI (синхронизируется браузером): path, slot, ref, contextPath.",
          parameters: "—",
          http: "GET /api/agent/active-page"
        },
        {
          name: "search_workspace",
          description: "Поиск по workspace (как в шапке UI). По умолчанию scope=all — имя, мета темы и текст файлов. match=relaxed|strict, маски * и ?.",
          parameters:
            "query, scope?: all|content|filename|description|tags, fileType?: all|markdown|sidecar|pdf|office|spreadsheet|video|audio|image|archive|config|other, match?: relaxed|strict, limit?: 1..100",
          http: "GET /api/search?q=&scope=&fileType=&match=&limit="
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
          name: "list_awn_types",
          description: "Полный каталог awn-type для workspace агента.",
          parameters: "—",
          http: "GET /api/awn-types"
        },
        {
          name: "get_type_health",
          description: "Проверка целостности типов awn-system.",
          parameters: "—",
          http: "GET /api/agent/type-health"
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
      id: "page",
      title: "Страница (manifest.md)",
      tools: [
        {
          name: "get_page_meta",
          description: "Метаданные страницы: слои storage, preview, manifest.",
          parameters: "path",
          http: "GET /api/page/meta"
        },
        {
          name: "page_exists",
          description: "Проверка существования manifest.md (без чтения тела).",
          parameters: "path",
          http: "GET /api/page/exists"
        },
        {
          name: "read_page_body",
          description: "Тело manifest.md (markdown под frontmatter).",
          parameters: "path",
          http: "GET /api/file?path="
        },
        {
          name: "write_page_body",
          description: "Сохранить тело manifest.md (frontmatter не трогается).",
          parameters: "path, content",
          http: "POST /api/file/content"
        },
        {
          name: "read_page_properties",
          description: "YAML frontmatter manifest.md.",
          parameters: "path",
          http: "GET /api/file/properties"
        },
        {
          name: "write_page_properties",
          description: "Сохранить frontmatter.",
          parameters: "path, content",
          http: "POST /api/file/properties"
        },
        {
          name: "read_page_schema",
          description: "Схема полей страницы (schema.yml, awn_schema) — привязана к типу страницы и слотам.",
          parameters: "path",
          http: "GET /api/file/page-schema"
        },
        {
          name: "write_page_schema",
          description: "Сохранить схему полей (content = YAML с awn_schema:).",
          parameters: "path, content",
          http: "POST /api/file/page-schema"
        },
        {
          name: "read_page_config",
          description: "configuration.yml страницы: awn_settings (awn-mask-file), awn_ui.",
          parameters: "path",
          http: "GET /api/file/page-config"
        },
        {
          name: "write_page_config",
          description: "Сохранить configuration.yml (awn_ui, awn_settings).",
          parameters: "path, content",
          http: "POST /api/file/page-config"
        },
        {
          name: "read_page_env",
          description: ".env страницы (корень контейнера темы).",
          parameters: "path",
          http: "GET /api/env"
        },
        {
          name: "write_page_env",
          description: "Сохранить .env страницы.",
          parameters: "path, content",
          http: "POST /api/env"
        },
        {
          name: "create_page",
          description: "Создать область (folder) или тему (file). displayName/title → awn-name; slug/name → папка на диске.",
          parameters: "parentPath?, type: folder|file, displayName?, title?, name?, slug?, awnType?",
          http: "POST /api/page/create"
        },
        {
          name: "delete_page",
          description: "Удалить область, топик или part.",
          parameters: "path",
          http: "DELETE /api/file?path="
        },
        {
          name: "rename_page",
          description: "Переименовать страницу. displayName → awn-name; slug → папка на диске.",
          parameters: "path, displayName?, title?, slug?",
          http: "POST /api/file/title"
        },
        {
          name: "move_page",
          description: "Переместить страницу в другую родительскую папку.",
          parameters: "path, parentPath",
          http: "POST /api/page/move"
        }
      ]
    },
    {
      id: "slot",
      title: "Слот (место для контента)",
      tools: [
        {
          name: "list_page_slots",
          description: "Слоты страницы: driver, path, allowedContent, acceptFiles.",
          parameters: "path",
          http: "GET /api/page/slots?path="
        }
      ]
    },
    {
      id: "content",
      title: "Контент (единая ветка)",
      tools: [
        { name: "list_content", description: "Список в external-слоте.", parameters: "path, slot", http: "—" },
        { name: "get_content_meta", description: "Метаданные объекта: path, slot, driver, ref, file.", parameters: "path, slot, ref?", http: "—" },
        { name: "content_exists", description: "Проверка существования объекта (без чтения тела).", parameters: "path, slot, ref?", http: "GET /api/content/exists" },
        { name: "read_content_body", description: "Тело .md (markdown под frontmatter) или single-file.", parameters: "path, slot, ref?", http: "—" },
        { name: "write_content_body", description: "Сохранить тело (frontmatter не трогается).", parameters: "path, slot, ref?, content", http: "—" },
        { name: "read_content_properties", description: "Frontmatter .md.", parameters: "path, slot, ref?", http: "—" },
        { name: "write_content_properties", description: "Сохранить frontmatter.", parameters: "path, slot, ref?, content", http: "—" },
        { name: "create_content", description: "Typed record или category.", parameters: "path, slot, awnType?, …", http: "POST /api/storage/file/create" },
        { name: "upload_content", description: "Файл base64 → media/, repository/, …", parameters: "path, slot, fileName, data", http: "POST /api/media/file" },
        { name: "read_content_file", description: "Текст или previewUrl media.", parameters: "path, slot, ref", http: "GET /api/storage/file" },
        { name: "rename_content", description: "Переименовать.", parameters: "path, slot, ref, displayName?", http: "—" },
        { name: "move_content", description: "Переместить (main, media).", parameters: "path, slot, ref, …", http: "—" },
        { name: "delete_content", description: "Удалить (main, media).", parameters: "path, slot, ref", http: "—" }
      ]
    },
    {
      id: "types",
      title: "Типы (справочники)",
      tools: [
        { name: "list_page_types", description: "Типы для create_page.", parameters: "—", http: "GET /api/agent-system/create-node-types" },
        { name: "get_page_type", description: "Детали page-типа.", parameters: "id", http: "GET /api/agent-system/type?id=" },
        { name: "list_content_types", description: "Content-типы слотов.", parameters: "—", http: "GET /api/agent/canonical-model" },
        { name: "get_content_type", description: "Детали content-типа.", parameters: "id", http: "GET /api/agent-system/type?id=" }
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
      id: "workspace",
      title: "Свободная память",
      tools: [
        {
          name: "list_adopt_folders",
          description: "Папки без manifest.md.",
          parameters: "—",
          http: "GET /api/workspace/folder/adopt"
        },
        {
          name: "browse_workspace_folder",
          description: "Содержимое на одном уровне.",
          parameters: "folderPath",
          http: "GET /api/workspace/folder/browse"
        },
        {
          name: "scan_workspace_folder",
          description: "Рекурсивный инвентарь.",
          parameters: "folderPath, depth?, includeBody?",
          http: "GET /api/workspace/folder/scan"
        },
        {
          name: "read_workspace_page",
          description: "Markdown из свободной памяти.",
          parameters: "file",
          http: "GET /api/workspace/folder/page"
        },
        {
          name: "read_workspace_text_file",
          description: "Текстовый файл.",
          parameters: "file, maxBytes?",
          http: "GET /api/workspace/folder/text"
        },
        {
          name: "upload_workspace_file",
          description: "Загрузить файл в свободную память (base64).",
          parameters: "folderPath, fileName, data",
          http: "POST /api/workspace/folder/upload"
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
    },
    {
      id: "awn-system",
      title: "awn-system (модель CMS)",
      tools: [
        { name: "get_agent_system_status", description: "Статус awn-system.", parameters: "—", http: "GET /api/agent-system/status" },
        { name: "list_view_types", description: "awn.view.* типы.", parameters: "—", http: "GET /api/agent-system/views" },
        { name: "get_agent_system_type", description: "Детали типа по id/path.", parameters: "id?, path?", http: "GET /api/agent-system/type" },
        { name: "read_agent_system_file", description: "Файл awn-system.", parameters: "path", http: "GET /api/agent-system/file" },
        { name: "write_agent_system_file", description: "Записать awn-system.", parameters: "path, content", http: "POST /api/agent-system/file" }
      ]
    },
    {
      id: "notifications",
      title: "Уведомления пользователю (CMS 🔔)",
      tools: [
        {
          name: "notify_user",
          description:
            "Произвольное уведомление в колокольчик Agent CMS (не Agent Shell). Операции create/update/delete/move через MCP попадают в журнал автоматически.",
          parameters: "title, message?, path? (manifest.md — открыть тему по клику)",
          http: "POST /api/agent/activity/notify"
        }
      ]
    },
    {
      id: "shell",
      title: "Agent Shell (голос / mobile UI)",
      tools: [
        {
          name: "shell_get_status",
          description: "Статус Shell, настройки и последний ответ агента.",
          parameters: "—",
          http: "GET /api/shell/status"
        },
        {
          name: "shell_post_message",
          description:
            "Сообщение в thread/inbox Agent Shell (голосовой UI). Не уведомление в колокольчик CMS — для этого notify_user.",
          parameters: "body, author?",
          http: "POST /api/shell/message"
        },
        {
          name: "shell_stop_tts",
          description: "Остановить озвучку Shell TTS.",
          parameters: "—",
          http: "POST /api/shell/stop-tts"
        },
        {
          name: "shell_camera_snapshot",
          description: "Кадр с камеры Shell UI (live/speech/manual).",
          parameters: "waitMs?, reason?, kind?: live|speech|manual",
          http: "POST /api/shell/camera/snapshot · GET /api/shell/camera/latest"
        },
        {
          name: "shell_screenshot",
          description: "Снимок экрана Shell UI (live/speech/manual).",
          parameters: "waitMs?, reason?, kind?: live|speech|manual",
          http: "POST /api/shell/screen/snapshot · GET /api/shell/screen/latest"
        }
      ]
    }
  ]
};
