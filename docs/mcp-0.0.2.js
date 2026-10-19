module.exports = {
  version: "0.0.2",
  versionLabel: "Per-chat agentId · 90 tools (87 canonical + 3 legacy aliases)",
  title: "Agent CMS MCP Server",
  subtitle: "Model Context Protocol · stdio · mcp-server/ v0.3.8",
  packagePath: "mcp-server/",
  generatedAt: "2026-10-11",
  notes: [
    "MCP slim v0.3.8 — per-chat agentId · placement (topic|channel|media|database|repository|root; legacy page→topic) · CONTENT + FS + exec.",
    "Перед запуском: npm start → http://localhost:3000.",
    "GET /api/mcp-docs?version=0.0.2 — этот документ (HTTP, не MCP tool). Живой список tools — mcp-server/ после перезапуска.",
    "AGENT_CMS_BASE_URL (обязательно). AGENT_CMS_AGENT — только dev-fallback (YAMLCMS_* — legacy).",
    "Термины (синонимы поля agentId): workspace · agent · vault · хранилище · рабочее пространство.",
    "Новый чат: list_workspaces → agentId → get_session_context({ agentId }) → все tools с тем же agentId. Доки: list_platform_docs / read_platform_doc.",
    "list_vaults — alias для list_workspaces.",
    "Контент (placement): content_read / content_write / contents_list (legacy read_content, …); kind topic|channel|media|database|repository|root.",
    "Индексы и поиск — НЕ placement: nav_*, search_*, index_*. Legacy: rebuild_workspace_*, search_workspace_*, read_workspace_map, get_topic_map (deprecated).",
    "MCP_LEGACY_TOOLS=1 — опционально: read_content_body, read_file, list_channel_items, … (см. TODO-REFACTOR-4.md).",
    "awn-databases: databases_list / database_get … (legacy list_databases, database_frame_*); записи → *_content_* (kind: database, slot: data); TOC → read/refresh_databases_index_toc.",
    "Бинарники: content_binary_write / content_binary_write_from_url; legacy upload_file при MCP_LEGACY_TOOLS=1.",
    "Медиа-облако: module_media_cloud_providers_list, module_media_cloud_status, module_media_cloud_sync, module_media_cloud_links_repair; stub module_media_cloud_upload, module_media_cloud_url.",
    "notify_user — колокольчик CMS (не Shell).",
    "contents/facts: fact_create, facts_list, … (legacy workspace_fact_*, create_workspace_fact, …).",
    "contents/glossary: glossary_term_create, glossary_terms_list, … (legacy create_glossary_term, …).",
    "contents/reference: reference_entry_create, reference_entries_list, … (legacy create_reference_entry, …)."
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
          description: "После list_workspaces: wsMap (карта manifest.md) + alwaysContext (файлы всегда в контексте) для выбранного agentId.",
          parameters: "agentId",
          http: "GET /api/agent/session-context?agent="
        },
        {
          name: "get_ui_focus",
          legacyName: "get_user_active_context_now",
          description: "Что открыто в UI: focus.entity, готовые path/slot/ref для read/write_*.",
          parameters: "—",
          http: "GET /api/agent/active-context"
        },
        {
          name: "session_list_always_context",
          legacyName: "get_workspace_always_context_registry",
          description: "Реестр always-context (items с content): load-always, system md, ws-folder.",
          parameters: "—",
          http: "GET /api/agent/always-context"
        },
        {
          name: "session_list_cron",
          legacyName: "get_workspace_cron_registry",
          description: "Реестр awn-runtime-cron (+ schedule), без тел файлов.",
          parameters: "—",
          http: "GET /api/agent/cron-registry"
        },
        {
          name: "session_list_heartbeat",
          legacyName: "get_workspace_heartbeat_registry",
          description: "Реестр awn-runtime-heartbeat, без тел файлов.",
          parameters: "—",
          http: "GET /api/agent/heartbeat-registry"
        },
        {
          name: "tool_mcp_ping",
          description: "Ping CMS: ok, agentId, serverTime, versions. Проверка связи MCP → Agent CMS.",
          parameters: "—",
          http: "GET /api/agent/mcp-ping"
        },
        {
          name: "workspace_summary_get",
          description:
            "Сводка workspace: темы/файлы/размер/входящие, catalog (инфоблоки, репозитории, настройки), git (только .git workspace агента), alwaysContextCount, cron/heartbeat, workspaceIndexStatus, lastIndexedAt. Legacy: get_workspace_storage_info.",
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
          name: "get_topic_map",
          description: "Deprecated → read_topic_index_toc + list_folder. Legacy: manifest + kind:folder.",
          parameters: "includeSlots?: boolean",
          http: "GET /api/agent/page-map"
        },
        {
          name: "get_content_map",
          description: "Deprecated → read_content_index_toc + read_content (part=properties). Legacy: meta по слотам.",
          parameters: "path, slot?",
          http: "GET /api/agent/content-map"
        },
        {
          name: "read_content_index_toc",
          description: "Оглавление index.md: path, type, title, description (без body/properties). Быстрый обзор темы/слота.",
          parameters: "path, slot?",
          http: "GET /api/agent/content-index"
        },
        {
          name: "refresh_content_index_toc",
          description: "Обновить index.md на диске (таблица path/type/title/description). overwrite=false — не перезаписывать.",
          parameters: "path, slot?, overwrite?",
          http: "POST /api/agent/content-index"
        },
        {
          name: "topics_list",
          description: "Узлы дерева тем (ws/area/topic): плоско или parentPath + scope.",
          parameters: "parentPath?, scope?, includeFolders?",
          http: "GET /api/agent/topics"
        },
        {
          name: "read_topic_index_toc",
          description: "Оглавление awn-topics/index.md: path, type, title, description (темы и области).",
          parameters: "—",
          http: "GET /api/agent/workspace-page-index"
        },
        {
          name: "refresh_topic_index_toc",
          description: "Обновить awn-topics/index.md (таблица path/type/title/description).",
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
          name: "get_topic_url",
          description: "Web-адрес темы/файла Agent CMS для открытия в браузере (CHPU). path — manifest, файл, слот; view — edit/todo/nav/…",
          parameters: "path?, view?, forceView?",
          http: "GET /api/agent/page-url"
        },
        {
          name: "repositories_list",
          description: "Каталог awn-repositories: manifest-ы клонов/полупроектов (код не в semantic index).",
          parameters: "—",
          http: "GET /api/agent/repositories"
        },
        {
          name: "repository_get",
          description: "Карточка одного репозитория (manifest + body).",
          parameters: "path",
          http: "GET /api/agent/repository"
        },
        {
          name: "read_repository_index_toc",
          description: "Прочитать awn-repositories/index.md (каталог репозиториев).",
          parameters: "—",
          http: "GET /api/workspace/fs/read (awn-repositories/index.md)"
        },
        {
          name: "refresh_repository_index_toc",
          description: "Пересобрать awn-repositories/index.md из manifest-ов.",
          parameters: "overwrite?",
          http: "POST /api/agent/repository-index"
        },
        {
          name: "read_media_library_index_toc",
          description: "Прочитать awn-media/index.md.",
          parameters: "—",
          http: "GET /api/agent/media-library-index"
        },
        {
          name: "refresh_media_library_index_toc",
          description: "Обновить awn-media/index.md.",
          parameters: "overwrite?",
          http: "POST /api/agent/media-library-index"
        },
        {
          name: "read_channels_index_toc",
          description: "Прочитать awn-channels/index.md.",
          parameters: "—",
          http: "GET /api/agent/channels-index"
        },
        {
          name: "refresh_channels_index_toc",
          description: "Обновить awn-channels/index.md.",
          parameters: "overwrite?",
          http: "POST /api/agent/channels-index"
        },
        {
          name: "repository_register",
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
      id: "topic",
      title: "Тема (manifest.md)",
      tools: [
        { name: "topic_get", description: "Карточка hub: properties + body.", parameters: "path", http: "GET /api/agent/topic" },
        {
          name: "topic_slots_template_get",
          description: "Шаблон слотов темы: standard | flexible | none.",
          parameters: "path",
          http: "GET /api/agent/topic-slots-template"
        },
        {
          name: "topic_slots_template_set",
          description: "Установить awn-slots-template (legacy flexible-ключи снимаются).",
          parameters: "path, template",
          http: "PUT /api/agent/topic-slots-template"
        },
        {
          name: "topic_update",
          description: "Patch name/description/body manifest.",
          parameters: "path, name?, description?, body?",
          http: "PUT /api/agent/topic"
        },
        { name: "topic_body_read", description: "Тело manifest.md.", parameters: "path", http: "GET /api/file" },
        { name: "topic_body_write", description: "Сохранить тело.", parameters: "path, content", http: "POST /api/file/content" },
        { name: "topic_properties_read", description: "Frontmatter manifest.md (full YAML).", parameters: "path", http: "GET /api/file/properties" },
        { name: "topic_properties_write", description: "Patch frontmatter.", parameters: "path, content", http: "POST /api/file/properties" },
        { name: "topic_property_read", description: "One manifest property.", parameters: "path, key", http: "GET /api/file/properties?key=" },
        { name: "topic_property_write", description: "Set one manifest property.", parameters: "path, key, value", http: "POST /api/file/properties" },
        {
          name: "topic_schema_read",
          description: "schema.yml layers (mode=layers default). База типа: get_type.",
          parameters: "path, mode?, target?",
          http: "GET /api/file/page-schema"
        },
        { name: "topic_schema_write", description: "Записать schema override.", parameters: "path, content", http: "POST /api/file/page-schema" },
        {
          name: "topic_config_read",
          description: "config.yml: awn_settings, awn_ui (не schema.yml).",
          parameters: "path",
          http: "GET /api/file/page-config"
        },
        {
          name: "topic_config_write",
          description: "Сохранить config.yml.",
          parameters: "path, content",
          http: "POST /api/file/page-config"
        },
        { name: "topic_exists", description: "Есть ли manifest.md.", parameters: "path", http: "GET /api/page/exists" },
        { name: "topic_meta_get", description: "Мета темы без body.", parameters: "path", http: "GET /api/page/meta" },
        { name: "topic_env_read", description: "Прочитать .env темы.", parameters: "path", http: "GET /api/page/env" },
        { name: "topic_env_write", description: "Записать .env темы.", parameters: "path, content", http: "POST /api/page/env" },
        { name: "topic_create", description: "Создать area или topic.", parameters: "parentPath?, type: area|topic|…, displayName?, slug?", http: "POST /api/page/create" },
        { name: "topic_delete", description: "Удалить тему/область.", parameters: "path", http: "DELETE /api/file" },
        { name: "topic_rename", description: "Переименовать.", parameters: "path, displayName?, slug?", http: "POST /api/file/title" },
        { name: "topic_move", description: "Переместить.", parameters: "path, parentPath", http: "POST /api/page/move" }
      ]
    },
    {
      id: "slot",
      title: "Слот",
      tools: [
        {
          name: "list_slots",
          description: "Слоты контейнера (topic / channel / media / database / repository): driver, path, allowedContent.",
          parameters: "placement.kind + path или path=manifest",
          http: "GET /api/page/slots"
        }
      ]
    },
    {
      id: "content",
      title: "Контент",
      tools: [
        {
          name: "content_read",
          description: "placement.kind topic|channel|media|database|repository|root; part body|properties|schema|meta|all.",
          parameters: "placement или path+slot, part?, ref?, format? (root binary)",
          http: "—"
        },
        {
          name: "content_write",
          description: "То же placement; part body|properties|schema; data base64 для бинарников.",
          parameters: "placement, part?, content | data",
          http: "—"
        },
        {
          name: "contents_list",
          description: "Каталог слота или папки (root — path + depth).",
          parameters: "placement.kind + path + slot? или root path",
          http: "—"
        },
        { name: "content_exists", description: "Есть ли контент в слоте.", parameters: "placement или path, slot, ref?", http: "GET /api/content/exists" },
        {
          name: "content_meta_get",
          description: "Мета без body (предпочтительно content_read part=meta).",
          parameters: "placement или path, slot, ref?",
          http: "GET /api/content/meta"
        },
        { name: "content_property_read", description: "One frontmatter property.", parameters: "placement, key" },
        { name: "content_property_write", description: "Set one frontmatter property.", parameters: "placement, key, value" },
        { name: "content_binary_read", description: "Binary base64.", parameters: "placement, maxBytes?", http: "—" },
        { name: "content_binary_write", description: "Upload binary base64.", parameters: "placement, data", http: "—" },
        { name: "content_binary_write_from_url", description: "Download URL → slot file.", parameters: "placement, url, fileName?", http: "POST /api/media/file/import" },
        { name: "content_binary_url_get", description: "HTTPS view URL for binary.", parameters: "placement", http: "—" },
        { name: "content_create", description: "Запись/категория; inbox: slot=inbox.", parameters: "placement, awnType?, body?, …", http: "POST /api/storage/file/create" },
        { name: "content_rename", description: "Переименовать.", parameters: "placement, displayName?", http: "—" },
        { name: "content_move", description: "Переместить.", parameters: "placement, targetPath?, …", http: "—" },
        { name: "content_delete", description: "Удалить.", parameters: "placement", http: "DELETE …" },
        { name: "content_split", description: "Split .md by H1.", parameters: "placement", http: "—" },
        { name: "content_merge", description: "Merge .md refs.", parameters: "placement, refs[]", http: "—" }
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
      title: "Каркас awn-databases (databases_list …)",
      tools: [
        { name: "databases_list", description: "Список stores (group/collection/single).", parameters: "—", http: "GET /api/awn-databases" },
        { name: "database_get", description: "Один store: schema, records, tree.", parameters: "store", http: "GET /api/awn-databases?store=" },
        {
          name: "read_databases_index_toc",
          description: "Оглавление (awn-databases/index.md).",
          parameters: "—",
          http: "GET /api/agent/awn-databases-index"
        },
        {
          name: "refresh_databases_index_toc",
          description: "Обновить index.md из databases_list.",
          parameters: "overwrite?",
          http: "POST /api/agent/awn-databases-index"
        },
        {
          name: "database_register",
          description: "Зарегистрировать store hub (как channel_register).",
          parameters: "slug, kind?, collectionKind?, recordHierarchy?, recordFileTypes?, …",
          http: "POST /api/awn-databases/stores"
        },
        {
          name: "database_update",
          description: "Patch manifest: name, description, body.",
          parameters: "store, name?, description?, body?",
          http: "PUT /api/awn-databases/stores"
        },
        { name: "database_delete", description: "Удалить store.", parameters: "store", http: "DELETE /api/awn-databases/stores" },
        { name: "database_rename", description: "Переименовать/переместить store.", parameters: "store, slug", http: "POST /api/awn-databases/stores/rename" },
        {
          name: "database_schema_read",
          description: "Кастомные поля instance в schema.yml.",
          parameters: "store",
          http: "GET /api/awn-databases/store-schema"
        },
        {
          name: "database_schema_write",
          description: "Записать кастомные поля в schema.yml.",
          parameters: "store, content? | awnSchema? | fields? | tabs?",
          http: "POST /api/awn-databases/store-schema"
        },
        { name: "database_properties_read", description: "Frontmatter manifest.", parameters: "store", http: "GET /api/awn-databases/store-properties" },
        { name: "database_properties_write", description: "Patch manifest.", parameters: "store, content", http: "POST /api/awn-databases/store-properties" },
        { name: "database_property_read", description: "One manifest property.", parameters: "store, key", http: "GET /api/awn-databases/store-properties?key=" },
        { name: "database_property_write", description: "Set one manifest property.", parameters: "store, key, value", http: "POST /api/awn-databases/store-properties" }
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
          name: "workspace_notifications_list",
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
          name: "fact_create",
          description: "Создать факт в awn-databases/contents/facts/.",
          parameters: "body, kind?, source?, tags?, name?, sourceRef?, supersedes?",
          http: "POST /api/agent/workspace-facts/create"
        },
        {
          name: "fact_update",
          description: "Обновить факт по record id/path.",
          parameters: "record, body?, kind?, source?, tags?, name?, sourceRef?, supersedes?",
          http: "POST /api/agent/workspace-facts/update"
        },
        {
          name: "facts_list",
          description: "Список фактов (новые первые), без semantic.",
          parameters: "kind?, tags?, limit?",
          http: "GET /api/agent/workspace-facts/list"
        },
        {
          name: "facts_search",
          description: "Поиск по contents/facts (semantic + fulltext).",
          parameters: "query, kind?, tags?, limit?",
          http: "GET /api/agent/workspace-facts/search"
        }
      ]
    },
    {
      id: "reference",
      title: "Справочник (contents/reference)",
      tools: [
        {
          name: "reference_entry_create",
          description: "Создать запись в awn-databases/contents/reference/.",
          parameters: "title, body, parent?, tags?, sourceRef?",
          http: "POST /api/agent/workspace-reference/create"
        },
        {
          name: "reference_entry_update",
          description: "Обновить запись по record id/path.",
          parameters: "record, title?, body?, tags?, sourceRef?",
          http: "POST /api/agent/workspace-reference/update"
        },
        {
          name: "reference_entries_list",
          description: "Список записей справочника.",
          parameters: "prefix?, tags?, limit?",
          http: "GET /api/agent/workspace-reference/list"
        },
        {
          name: "reference_entries_search",
          description: "Поиск по contents/reference (semantic + fulltext).",
          parameters: "query, limit?",
          http: "GET /api/agent/workspace-reference/search"
        }
      ]
    },
    {
      id: "glossary",
      title: "Глоссарий (contents/glossary)",
      tools: [
        {
          name: "glossary_term_create",
          description: "Создать термин в awn-databases/contents/glossary/.",
          parameters: "term, definition, aliases?, tags?, marker?, sourceRef?",
          http: "POST /api/agent/workspace-glossary/create"
        },
        {
          name: "glossary_term_update",
          description: "Обновить термин по record id/path.",
          parameters: "record, term?, definition?, aliases?, tags?, marker?, sourceRef?",
          http: "POST /api/agent/workspace-glossary/update"
        },
        {
          name: "glossary_terms_list",
          description: "Список терминов.",
          parameters: "prefix?, tags?, limit?",
          http: "GET /api/agent/workspace-glossary/list"
        },
        {
          name: "glossary_terms_search",
          description: "Поиск по contents/glossary (semantic + fulltext).",
          parameters: "query, limit?",
          http: "GET /api/agent/workspace-glossary/search"
        }
      ]
    },
    {
      id: "filesystem",
      title: "FS (канон через content)",
      tools: [
        {
          name: "list_content",
          description: "Каталог: placement.kind=root + path (folder или \".\"). depth=1|2|all.",
          parameters: "placement, depth?, includeBody?",
          http: "GET /api/workspace/fs/list"
        },
        {
          name: "read_content",
          description: "Файл по placement.kind=root + path.",
          parameters: "placement, part?, format=base64?",
          http: "GET /api/workspace/fs/read"
        },
        {
          name: "write_content",
          description: "Запись/patch placement.kind=root.",
          parameters: "placement, mode?, …",
          http: "POST /api/workspace/fs/write|patch"
        },
        { name: "batch_invoke", description: "Пакет одного tool.", parameters: "tool, items[]", http: "—" },
        { name: "list_root_files", description: "MCP_LEGACY_TOOLS=1 → list_content path=\".\"", parameters: "—", http: "GET /api/system-files" },
        { name: "read_root_file", description: "MCP_LEGACY_TOOLS=1 → read_content kind=root.", parameters: "name", http: "GET /api/workspace/fs/read" },
        { name: "write_root_file", description: "MCP_LEGACY_TOOLS=1 → write_content kind=root.", parameters: "name, content", http: "POST /api/workspace/fs/write" },
        { name: "list_folder", description: "MCP_LEGACY_TOOLS=1 → list_content kind=root.", parameters: "path, depth?", http: "GET /api/workspace/fs/list" },
        { name: "patch_file", description: "MCP_LEGACY_TOOLS=1 → write_content mode=patch.", parameters: "path, old_string, new_string", http: "POST /api/workspace/fs/patch" },
        { name: "read_file", description: "MCP_LEGACY_TOOLS=1.", parameters: "path", http: "GET /api/workspace/fs/read" },
        { name: "write_file", description: "MCP_LEGACY_TOOLS=1.", parameters: "path, content", http: "POST /api/workspace/fs/write" },
        { name: "upload_file", description: "MCP_LEGACY_TOOLS=1. Prefer write_content_binary.", parameters: "path, data", http: "POST /api/workspace/fs/upload" },
        { name: "upload_file_from_url", description: "MCP_LEGACY_TOOLS=1.", parameters: "path, url", http: "POST /api/workspace/fs/import" }
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
      title: "Медиа-облако (module_media_cloud_*)",
      tools: [
        {
          name: "module_media_cloud_providers_list",
          description: "Справочник провайдеров (legacy list_media_cloud_providers).",
          parameters: "workspaceId",
          http: "GET /api/media-cloud/providers"
        },
        {
          name: "module_media_cloud_status",
          description: "Статус offload (legacy get_media_cloud_file_status).",
          parameters: "workspaceId, path, file?, scope?, provider?",
          http: "GET /api/gdrive/status"
        },
        {
          name: "module_media_cloud_sync",
          description: "Toggle локальный offload (legacy sync_media_cloud_file).",
          parameters: "workspaceId, path, file?, scope?, provider?",
          http: "POST /api/gdrive/toggle"
        },
        {
          name: "module_media_cloud_links_repair",
          description: "Починить symlink (legacy repair_media_cloud_links).",
          parameters: "workspaceId",
          http: "POST /api/gdrive/repair-links"
        },
        {
          name: "module_media_cloud_upload",
          description: "Stub remote upload (legacy upload_media_cloud_to_provider_zzz).",
          parameters: "workspaceId, path, file, provider?",
          http: "— (stub)"
        },
        {
          name: "module_media_cloud_url",
          description: "Stub remote URL (legacy get_remote_url_zzz).",
          parameters: "workspaceId, path, file, provider?",
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
