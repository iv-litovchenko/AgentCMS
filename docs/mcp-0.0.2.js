module.exports = {
  version: "0.0.2",
  versionLabel: "Per-chat agentId · 109 tools",
  title: "Agent CMS MCP Server",
  subtitle: "Model Context Protocol · stdio · mcp-server/ v0.3.8",
  packagePath: "mcp-server/",
  generatedAt: "2026-08-08",
  notes: [
    "MCP slim v0.3.8 — per-chat agentId · list_workspaces · PAGE · SLOT · CONTENT + FS + exec.",
    "Перед запуском: npm start → http://localhost:3000.",
    "GET /api/mcp-docs?version=0.0.2 — этот документ (HTTP, не MCP tool).",
    "AGENT_CMS_BASE_URL (обязательно). AGENT_CMS_AGENT — только dev-fallback (YAMLCMS_* — legacy).",
    "Термины (синонимы поля agentId): workspace · agent · vault · хранилище · рабочее пространство.",
    "Новый чат: list_workspaces → agentId → get_session_context({ agentId }) → все tools с тем же agentId.",
    "list_vaults — alias для list_workspaces.",
    "path → manifest.md; slot → main|inbox|media|…; ref → путь внутри слота.",
    "Карта tools: workspaces/agent-cms-core/temp2/examples/mcp-optimiz.md",
    "Бинарники: upload_file (base64) или upload_file_from_url; в слот — import_content_from_url.",
    "Медиа в облако: list_media_cloud_providers, get_media_cloud_file_status, sync_media_cloud_file, repair_media_cloud_links; заглушки upload_media_cloud_to_provider_zzz, get_remote_url_zzz.",
    "notify_user — колокольчик CMS (не Shell).",
    "contents/facts: create_workspace_fact, update_workspace_fact, list_workspace_facts, search_workspace_facts (retain/recall — deprecated aliases).",
    "contents/glossary: create_glossary_term, update_glossary_term, list_glossary_terms, search_glossary_terms."
  ],
  cursorConfig: {
    command: "node",
    args: ["<ABS_PATH>/mcp-server/index.js"],
    env: {
      AGENT_CMS_BASE_URL: "http://localhost:3000"
    }
  },
  copawConfig: {
    comment: "CoPaw / QwenPaw: mcp_servers в конфиге ReMe",
    mcp_servers: {
      "agent-cms": {
        command: "node",
        args: ["<ABS_PATH>/mcp-server/index.js"],
        env: {
          AGENT_CMS_BASE_URL: "http://localhost:3000"
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
          name: "list_workspaces",
          description:
            "START NEW CHAT: все workspace (agent / vault / хранилище). Синоним tool: list_vaults.",
          parameters: "—",
          http: "GET /api/agents"
        },
        {
          name: "list_vaults",
          description: "Alias list_workspaces.",
          parameters: "—",
          http: "GET /api/agents"
        },
        {
          name: "get_session_context",
          description: "После list_workspaces: topicRegistry, alwaysContext для выбранного agentId.",
          parameters: "agentId",
          http: "GET /api/agent/session-context?agent="
        },
        {
          name: "get_user_active_context_now",
          description: "Что открыто в UI: focus.entity, готовые path/slot/ref для read/write_*.",
          parameters: "—",
          http: "GET /api/agent/active-context"
        },
        {
          name: "list_workspace_always_context",
          description: "Always-context: awn-runtime-load-always + AGENTS/SKILL/README + GLOBAL-DOC-MCP.",
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
        },
        {
          name: "test_mcp_connection",
          description: "Ping CMS: ok, agentId, serverTime, versions. Проверка связи MCP → Agent CMS.",
          parameters: "—",
          http: "GET /api/agent/mcp-ping"
        },
        {
          name: "get_workspace_storage_info",
          description:
            "Сводка workspace: темы/файлы/размер/входящие, catalog (инфоблоки, репозитории, настройки), git (только .git workspace агента), alwaysContextCount, cron/heartbeat, workspaceIndexStatus, lastIndexedAt.",
          parameters: "—",
          http: "GET /api/agent/storage-summary"
        }
      ]
    },
    {
      id: "settings",
      title: "Настройки (глобальные / локальные / пользовательские)",
      tools: [
        {
          name: "list_settings",
          description:
            "Все настройки: platform (глобальные settings.global.yml), workspace (локальные settings.yml), user (.agent-cms/user-settings.yml).",
          parameters: "scope? (all|platform|workspace|user)",
          http: "GET /api/agent/settings/list?scope="
        },
        {
          name: "read_setting",
          description: "Одна настройка: scope + key (meta: readonly, runtimeEffect).",
          parameters: "scope (platform|workspace|user), key",
          http: "GET /api/agent/settings/read?scope=&key="
        },
        {
          name: "write_setting",
          description:
            "Запись одной настройки. readonly (sys-*, awn-id-*) — ошибка. Блок при mcp-mode=readonly.",
          parameters: "scope, key, value",
          http: "POST /api/agent/settings/write"
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
          description: "Карта контента страницы по слотам (meta + properties, без body).",
          parameters: "path, slot?",
          http: "GET /api/agent/content-map"
        },
        {
          name: "get_content_index",
          description: "Оглавление index.md: path, type, title, description (без body/properties). Быстрый обзор темы/слота.",
          parameters: "path, slot?",
          http: "GET /api/agent/content-index"
        },
        {
          name: "refresh_content_index",
          description: "Обновить index.md на диске (таблица path/type/title/description). overwrite=false — не перезаписывать.",
          parameters: "path, slot?, overwrite?",
          http: "POST /api/agent/content-index"
        },
        {
          name: "get_workspace_page_index",
          description: "Оглавление INDEX.md в корне workspace: path, type, title, description (страницы).",
          parameters: "—",
          http: "GET /api/agent/workspace-page-index"
        },
        {
          name: "refresh_workspace_page_index",
          description: "Обновить INDEX.md в корне workspace (таблица path/type/title/description).",
          parameters: "overwrite?",
          http: "POST /api/agent/workspace-page-index"
        },
        {
          name: "resolve_workspace_path",
          description: "Произвольный path → цепочка manifest (topic/area/ws), slot/ref, mcp hints.",
          parameters: "path",
          http: "GET /api/agent/resolve-path"
        },
        {
          name: "get_page_url",
          description: "Web-адрес страницы Agent CMS для открытия в браузере (CHPU). path — manifest, файл, слот; view — edit/todo/nav/…",
          parameters: "path?, view?, forceView?",
          http: "GET /api/agent/page-url"
        },
        {
          name: "list_repositories",
          description: "Каталог awn-repositories: manifest-ы клонов/полупроектов (код не в semantic index).",
          parameters: "—",
          http: "GET /api/agent/repositories"
        },
        {
          name: "get_repository",
          description: "Карточка одного репозитория (manifest + body).",
          parameters: "path",
          http: "GET /api/agent/repository"
        },
        {
          name: "refresh_repository_index",
          description: "Пересобрать awn-repositories/index.md из manifest-ов.",
          parameters: "overwrite?",
          http: "POST /api/agent/repository-index"
        },
        {
          name: "register_repository",
          description: "Создать awn-repositories/{slug}/manifest.md (шаблон карточки).",
          parameters: "slug, name?, description?, origin?, body?",
          http: "POST /api/agent/repositories"
        },
        {
          name: "search_workspace_content",
          description: "Полнотекстовый поиск workspace (paths, frontmatter, body). scope=all по умолчанию.",
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
        { name: "read_page_properties", description: "Frontmatter manifest.md (full YAML).", parameters: "path", http: "GET /api/file/properties" },
        { name: "write_page_properties", description: "Patch frontmatter.", parameters: "path, content", http: "POST /api/file/properties" },
        { name: "read_page_property", description: "One manifest property.", parameters: "path, key", http: "GET /api/file/properties?key=" },
        { name: "write_page_property", description: "Set one manifest property.", parameters: "path, key, value", http: "POST /api/file/properties" },
        {
          name: "read_page_schema",
          description: "schema.yml layers (mode=layers default). База типа: get_type.",
          parameters: "path, mode?, target?",
          http: "GET /api/file/page-schema"
        },
        { name: "write_page_schema", description: "Записать schema override.", parameters: "path, content", http: "POST /api/file/page-schema" },
        {
          name: "read_page_config",
          description: "config.yml: awn_settings, awn_ui (не schema.yml).",
          parameters: "path",
          http: "GET /api/file/page-config"
        },
        {
          name: "write_page_config",
          description: "Сохранить config.yml.",
          parameters: "path, content",
          http: "POST /api/file/page-config"
        },
        { name: "page_exists", description: "Есть ли manifest.md.", parameters: "path", http: "GET /api/page/exists" },
        { name: "get_page_meta", description: "Мета страницы без body.", parameters: "path", http: "GET /api/page/meta" },
        { name: "read_page_env", description: "Прочитать .env страницы.", parameters: "path", http: "GET /api/page/env" },
        { name: "write_page_env", description: "Записать .env страницы.", parameters: "path, content", http: "POST /api/page/env" },
        { name: "create_page", description: "Создать area или topic.", parameters: "parentPath?, type: area|topic|awn.page.area|awn.page.topic|folder|file, displayName?, slug?", http: "POST /api/page/create" },
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
        { name: "content_exists", description: "Есть ли контент в слоте.", parameters: "path, slot, ref?", http: "GET /api/content/exists" },
        { name: "get_content_meta", description: "Мета контента без body.", parameters: "path, slot, ref?", http: "GET /api/content/meta" },
        { name: "read_content_body", description: "Тело .md или internal slot.", parameters: "path, slot, ref?", http: "—" },
        { name: "write_content_body", description: "Сохранить тело.", parameters: "path, slot, ref?, content", http: "—" },
        { name: "read_content_properties", description: "Frontmatter .md (full YAML).", parameters: "path, slot, ref?" },
        { name: "write_content_properties", description: "Patch frontmatter.", parameters: "path, slot, ref?, content" },
        { name: "read_content_property", description: "One frontmatter property.", parameters: "path, slot, ref?, key" },
        { name: "write_content_property", description: "Set one frontmatter property.", parameters: "path, slot, ref?, key, value" },
        { name: "create_content", description: "Запись/категория; inbox intake: slot=inbox, status=new.", parameters: "path, slot, awnType?, body?, fileExtension?, …", http: "POST /api/storage/file/create" },
        { name: "import_content_from_url", description: "Скачать http(s) URL → slot (media/, repository/, …).", parameters: "path, slot, url, fileName?", http: "POST /api/media/file/import" },
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
      id: "database-frame",
      title: "Каркас awn-databases (database_frame_*)",
      tools: [
        { name: "database_frame_list", description: "Список frames (group/collection/single).", parameters: "—", http: "GET /api/awn-databases" },
        { name: "database_frame_get", description: "Один frame: schema, records, tree.", parameters: "store", http: "GET /api/awn-databases?store=" },
        {
          name: "database_frame_read_index",
          description: "Оглавление frames (awn-databases/index.md).",
          parameters: "—",
          http: "GET /api/agent/awn-databases-index"
        },
        {
          name: "database_frame_refresh_index",
          description: "Обновить awn-databases/index.md из database_frame_list.",
          parameters: "overwrite?",
          http: "POST /api/agent/awn-databases-index"
        },
        {
          name: "database_frame_create",
          description: "Создать frame: group/collection/single.",
          parameters: "slug, kind?, collectionKind?, recordHierarchy?, recordFileTypes?, …",
          http: "POST /api/awn-databases/stores"
        },
        { name: "database_frame_delete", description: "Удалить frame (store).", parameters: "store", http: "DELETE /api/awn-databases/stores" },
        { name: "database_frame_rename", description: "Переименовать/переместить frame.", parameters: "store, newStore", http: "POST /api/awn-databases/stores/rename" },
        {
          name: "database_frame_read_schema",
          description: "Кастомные поля instance в schema.yml (не каталог типов).",
          parameters: "store",
          http: "GET /api/awn-databases/store-schema"
        },
        {
          name: "database_frame_write_schema",
          description: "Записать кастомные поля в schema.yml.",
          parameters: "store, content? | awnSchema? | fields? | tabs?",
          http: "POST /api/awn-databases/store-schema"
        },
        { name: "database_frame_read_properties", description: "Frontmatter manifest frame.", parameters: "store", http: "GET /api/awn-databases/store-properties" },
        { name: "database_frame_write_properties", description: "Patch manifest frame.", parameters: "store, content", http: "POST /api/awn-databases/store-properties" },
        { name: "database_frame_read_property", description: "One manifest property.", parameters: "store, key", http: "GET /api/awn-databases/store-properties?key=" },
        { name: "database_frame_write_property", description: "Set one manifest property.", parameters: "store, key, value", http: "POST /api/awn-databases/store-properties" }
      ]
    },
    {
      id: "database-element",
      title: "Элементы awn-databases (database_element_*)",
      tools: [
        { name: "database_element_list", description: "Лёгкий список записей/разделов.", parameters: "store, parent?", http: "GET /api/awn-databases/records" },
        {
          name: "database_element_create",
          description: "Добавить запись или раздел.",
          parameters: "store, name?, slug?, isSection?, id?, title?, parent?",
          http: "POST /api/awn-databases/records"
        },
        { name: "database_element_delete", description: "Удалить запись или раздел.", parameters: "store, record", http: "DELETE /api/awn-databases/records" },
        { name: "database_element_rename", description: "Переименовать запись/раздел.", parameters: "store, record, newRecord", http: "POST /api/awn-databases/records/rename" },
        { name: "database_element_read_body", description: "Тело markdown записи.", parameters: "store, record?", http: "GET /api/awn-databases/record-body" },
        { name: "database_element_write_body", description: "Записать тело markdown.", parameters: "store, record?, content", http: "POST /api/awn-databases/record-body" },
        { name: "database_element_read_properties", description: "Frontmatter записи.", parameters: "store, record?", http: "GET /api/awn-databases/record-properties" },
        { name: "database_element_write_properties", description: "Patch frontmatter записи.", parameters: "store, record?, content", http: "POST /api/awn-databases/record-properties" },
        { name: "database_element_read_property", description: "One record property.", parameters: "store, record?, key", http: "GET /api/awn-databases/record-properties?key=" },
        { name: "database_element_write_property", description: "Set one record property.", parameters: "store, record?, key, value", http: "POST /api/awn-databases/record-properties" }
      ]
    },
    {
      id: "intake",
      title: "Inbox и дискуссия",
      tools: [
        { name: "list_inbox", description: "Inbox темы.", parameters: "path", http: "GET /api/inbox" },
        {
          name: "triage_inbox_item",
          description: "Triage: to-content, mark-done, set-status.",
          parameters: "path, file, action, status?",
          http: "POST /api/inbox/triage"
        },
        {
          name: "read_discussion",
          description: "Дискуссия темы (slot discussion).",
          parameters: "path, mode?, file?, name?",
          http: "GET /api/discussion"
        },
        {
          name: "append_discussion",
          description: "Сообщение в дискуссию темы.",
          parameters: "path, body, role?, …",
          http: "POST /api/discussion"
        }
      ]
    },
    {
      id: "journal",
      title: "Журнал workspace (.agent-cms/journal)",
      tools: [
        {
          name: "append_journal_entry",
          description: "Добавить событие в журнал (файл на ISO-неделю).",
          parameters: "body, type?, author?, path?, topic?, notify?, at?",
          http: "POST /api/agent/workspace-journal/append"
        },
        {
          name: "list_journal_entries",
          description: "Список записей журнала (фильтр topic).",
          parameters: "topic?, limit?",
          http: "GET /api/agent/workspace-journal/list"
        },
        {
          name: "list_workspace_notifications",
          description: "Лента колокольчика 🔔 — те же записи журнала в формате уведомлений.",
          parameters: "since?, limit?, notifyOnly?",
          http: "GET /api/agent/workspace-notifications"
        }
      ]
    },
    {
      id: "facts",
      title: "Банк фактов (contents/facts)",
      tools: [
        {
          name: "create_workspace_fact",
          description: "Создать факт в awn-databases/contents/facts/.",
          parameters: "body, kind?, source?, tags?, name?, sourceRef?, supersedes?",
          http: "POST /api/agent/workspace-facts/create"
        },
        {
          name: "update_workspace_fact",
          description: "Обновить факт по record id/path.",
          parameters: "record, body?, kind?, source?, tags?, name?, sourceRef?, supersedes?",
          http: "POST /api/agent/workspace-facts/update"
        },
        {
          name: "list_workspace_facts",
          description: "Список фактов (новые первые), без semantic.",
          parameters: "kind?, tags?, limit?",
          http: "GET /api/agent/workspace-facts/list"
        },
        {
          name: "search_workspace_facts",
          description: "Поиск по contents/facts (semantic + fulltext).",
          parameters: "query, kind?, tags?, limit?",
          http: "GET /api/agent/workspace-facts/search"
        },
        {
          name: "retain_workspace_fact",
          description: "Deprecated alias create_workspace_fact.",
          parameters: "body, kind?, source?, tags?, name?, sourceRef?, supersedes?",
          http: "POST /api/agent/workspace-facts/retain"
        },
        {
          name: "recall_workspace_facts",
          description: "Deprecated alias search_workspace_facts.",
          parameters: "query, kind?, tags?, limit?",
          http: "GET /api/agent/workspace-facts/recall"
        }
      ]
    },
    {
      id: "glossary",
      title: "Глоссарий (contents/glossary)",
      tools: [
        {
          name: "create_glossary_term",
          description: "Создать термин в awn-databases/contents/glossary/.",
          parameters: "term, definition, aliases?, tags?, marker?, sourceRef?",
          http: "POST /api/agent/workspace-glossary/create"
        },
        {
          name: "update_glossary_term",
          description: "Обновить термин по record id/path.",
          parameters: "record, term?, definition?, aliases?, tags?, marker?, sourceRef?",
          http: "POST /api/agent/workspace-glossary/update"
        },
        {
          name: "list_glossary_terms",
          description: "Список терминов.",
          parameters: "prefix?, tags?, limit?",
          http: "GET /api/agent/workspace-glossary/list"
        },
        {
          name: "search_glossary_terms",
          description: "Поиск по contents/glossary (semantic + fulltext).",
          parameters: "query, limit?",
          http: "GET /api/agent/workspace-glossary/search"
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
        { name: "upload_file_from_url", description: "http(s) URL → workspace path.", parameters: "path, url, mimeType?", http: "POST /api/workspace/fs/import" },
        { name: "list_folder", description: "Содержимое папки.", parameters: "path, depth?", http: "GET /api/workspace/fs/list" }
      ]
    },
    {
      id: "exec",
      title: "Выполнение команд",
      tools: [
        {
          name: "run_script",
          description: "Запуск файла из workspace (.py, .js, .sh).",
          parameters: "script, args?, cwd?, topicPath?, interpreter?, timeoutMs?, env?",
          http: "POST /api/exec/run-script"
        },
        {
          name: "exec_command",
          description: "Команда + args без shell (git, npm, …).",
          parameters: "command, args?, cwd?, topicPath?, timeoutMs?, env?",
          http: "POST /api/exec/command"
        },
        {
          name: "exec_shell",
          description: "Произвольная shell-строка (pipes, &&).",
          parameters: "command, cwd?, topicPath?, timeoutMs?, env?",
          http: "POST /api/exec/shell"
        }
      ]
    },
    {
      id: "media-cloud",
      title: "Медиа в облако (awn-media-cloud)",
      tools: [
        {
          name: "list_media_cloud_providers",
          description: "Справочник провайдеров из platform.yml (media-cloud-providers) + defaultProvider.",
          parameters: "agentId",
          http: "GET /api/media-cloud/providers"
        },
        {
          name: "get_media_cloud_file_status",
          description: "Статус выгрузки: symlink, providers[], scope file|topic.",
          parameters: "agentId, path, file? (scope=file), scope?, provider?",
          http: "GET /api/gdrive/status"
        },
        {
          name: "sync_media_cloud_file",
          description: "Переключить локальную выгрузку в _blobs/ или провайдер в registry (как UI «Выгрузка в облако»).",
          parameters: "agentId, path, file? (scope=file), scope?, provider?",
          http: "POST /api/gdrive/toggle"
        },
        {
          name: "repair_media_cloud_links",
          description: "Восстановить симлинки по registry.json.",
          parameters: "agentId",
          http: "POST /api/gdrive/repair-links"
        },
        {
          name: "upload_media_cloud_to_provider_zzz",
          description: "Заглушка: будущая выгрузка на API Google/Яндекс.",
          parameters: "agentId, path, file, provider?",
          http: "— (stub)"
        },
        {
          name: "get_remote_url_zzz",
          description: "Заглушка: будущий remoteUrl после upload на провайдер.",
          parameters: "agentId, path, file, provider?",
          http: "— (stub)"
        }
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
