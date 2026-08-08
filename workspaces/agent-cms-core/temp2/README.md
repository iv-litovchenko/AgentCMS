# MCP response examples

Agent: `agent-cms-test` · Sample page: `aja-test-oblasti-2031/aja-test-temy-2031/manifest.md`

## Реестры workspace (`registries/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `get_topic_registry` | [examples/registries/get_topic_registry.json](examples/registries/get_topic_registry.json) | yes | 3819 |
| `get_always_context` | [examples/registries/get_always_context.json](examples/registries/get_always_context.json) | yes | 15302 |
| `get_cron_registry` | [examples/registries/get_cron_registry.json](examples/registries/get_cron_registry.json) | yes | 542 |
| `get_heartbeat_registry` | [examples/registries/get_heartbeat_registry.json](examples/registries/get_heartbeat_registry.json) | yes | 501 |
| `get_storage_layout` | [examples/registries/get_storage_layout.json](examples/registries/get_storage_layout.json) | yes | 68350 |
| `get_workspace_table` | [examples/registries/get_workspace_table.json](examples/registries/get_workspace_table.json) | yes | 4840 |
| `get_canonical_model` | [examples/registries/get_canonical_model.json](examples/registries/get_canonical_model.json) | yes | 25320 |

## Типы и каталоги (`types/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `list_types` | — | regen | — |
| `get_type` | — | regen | — |
| `get_type_health` | [examples/types/get_type_health.json](examples/types/get_type_health.json) | yes | 176 |
| `list_components` | [examples/types/list_components.json](examples/types/list_components.json) | yes | 267 |
| `get_platform_index` | [examples/types/get_platform_index.json](examples/types/get_platform_index.json) | yes | 2073 |
| `get_agent_system_status` | [examples/types/get_agent_system_status.json](examples/types/get_agent_system_status.json) | yes | 52 |
| `read_agent_system_file` | [examples/types/read_agent_system_file.json](examples/types/read_agent_system_file.json) | yes | 69 |
| `write_agent_system_file` | [examples/types/write_agent_system_file.json](examples/types/write_agent_system_file.json) | write | — |

## zzz — Старт сессии (`zzz/bootstrap/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `list_agents` | [examples/zzz/bootstrap/list_agents.json](examples/zzz/bootstrap/list_agents.json) | yes | 6133 |
| `get_session_context` | [examples/zzz/bootstrap/get_session_context.json](examples/zzz/bootstrap/get_session_context.json) | yes | 27062 |
| `get_mcp_docs` | [examples/zzz/bootstrap/get_mcp_docs.json](examples/zzz/bootstrap/get_mcp_docs.json) | yes | 23810 |

## zzz — Навигация и поиск (`zzz/navigation/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `get_menu` | [examples/zzz/navigation/get_menu.json](examples/zzz/navigation/get_menu.json) | yes | 19397 |
| `get_active_context` | [examples/zzz/navigation/get_active_context.json](examples/zzz/navigation/get_active_context.json) | yes | 1771 |
| `get_active_page` | [examples/zzz/navigation/get_active_page.json](examples/zzz/navigation/get_active_page.json) | yes | 1771 |
| `search_workspace` | [examples/zzz/navigation/search_workspace.json](examples/zzz/navigation/search_workspace.json) | yes | 4509 |
| `get_site_map` | [examples/zzz/navigation/get_site_map.json](examples/zzz/navigation/get_site_map.json) | yes | 5097 |

## zzz — Страницы (Page) (`zzz/pages/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `get_page_meta` | [examples/zzz/pages/get_page_meta.json](examples/zzz/pages/get_page_meta.json) | yes | 587 |
| `page_exists` | [examples/zzz/pages/page_exists.json](examples/zzz/pages/page_exists.json) | yes | 86 |
| `read_page_body` | [examples/zzz/pages/read_page_body.json](examples/zzz/pages/read_page_body.json) | yes | 1936 |
| `read_page_properties` | [examples/zzz/pages/read_page_properties.json](examples/zzz/pages/read_page_properties.json) | yes | 1257 |
| `read_page_schema` | [examples/zzz/pages/read_page_schema.json](examples/zzz/pages/read_page_schema.json) | yes | 1384 |
| `read_page_config` | [examples/zzz/pages/read_page_config.json](examples/zzz/pages/read_page_config.json) | yes | 191 |
| `read_page_env` | [examples/zzz/pages/read_page_env.json](examples/zzz/pages/read_page_env.json) | yes | 97 |
| `list_page_slots` | [examples/zzz/pages/list_page_slots.json](examples/zzz/pages/list_page_slots.json) | yes | 3442 |
| `create_page` | [examples/zzz/pages/create_page.json](examples/zzz/pages/create_page.json) | write | — |
| `delete_page` | [examples/zzz/pages/delete_page.json](examples/zzz/pages/delete_page.json) | write | — |
| `move_page` | [examples/zzz/pages/move_page.json](examples/zzz/pages/move_page.json) | write | — |
| `rename_page` | [examples/zzz/pages/rename_page.json](examples/zzz/pages/rename_page.json) | write | — |
| `write_page_body` | [examples/zzz/pages/write_page_body.json](examples/zzz/pages/write_page_body.json) | write | — |
| `write_page_config` | [examples/zzz/pages/write_page_config.json](examples/zzz/pages/write_page_config.json) | write | — |
| `write_page_env` | [examples/zzz/pages/write_page_env.json](examples/zzz/pages/write_page_env.json) | write | — |
| `write_page_properties` | [examples/zzz/pages/write_page_properties.json](examples/zzz/pages/write_page_properties.json) | write | — |
| `write_page_schema` | [examples/zzz/pages/write_page_schema.json](examples/zzz/pages/write_page_schema.json) | write | — |

## zzz — Контент в слотах (Content) (`zzz/content/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `list_content` | [examples/zzz/content/list_content.json](examples/zzz/content/list_content.json) | yes | 8680 |
| `content_exists` | [examples/zzz/content/content_exists.json](examples/zzz/content/content_exists.json) | yes | 150 |
| `get_content_meta` | [examples/zzz/content/get_content_meta.json](examples/zzz/content/get_content_meta.json) | yes | 150 |
| `read_content_body` | [examples/zzz/content/read_content_body.json](examples/zzz/content/read_content_body.json) | yes | 492 |
| `read_content_properties` | [examples/zzz/content/read_content_properties.json](examples/zzz/content/read_content_properties.json) | yes | 44 |
| `create_content` | [examples/zzz/content/create_content.json](examples/zzz/content/create_content.json) | write | — |
| `delete_content` | [examples/zzz/content/delete_content.json](examples/zzz/content/delete_content.json) | write | — |
| `import_content_from_url` | [examples/zzz/content/import_content_from_url.json](examples/zzz/content/import_content_from_url.json) | write | — |
| `move_content` | [examples/zzz/content/move_content.json](examples/zzz/content/move_content.json) | write | — |
| `rename_content` | [examples/zzz/content/rename_content.json](examples/zzz/content/rename_content.json) | write | — |
| `upload_content` | [examples/zzz/content/upload_content.json](examples/zzz/content/upload_content.json) | write | — |
| `write_content_body` | [examples/zzz/content/write_content_body.json](examples/zzz/content/write_content_body.json) | write | — |
| `write_content_properties` | [examples/zzz/content/write_content_properties.json](examples/zzz/content/write_content_properties.json) | write | — |

## zzz — Накопители awn-data (`zzz/data-stores/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `list_data_stores` | [examples/zzz/data-stores/list_data_stores.json](examples/zzz/data-stores/list_data_stores.json) | yes | 2067 |
| `get_data_store` | [examples/zzz/data-stores/get_data_store.json](examples/zzz/data-stores/get_data_store.json) | yes | 3712 |
| `read_data_store_schema` | [examples/zzz/data-stores/read_data_store_schema.json](examples/zzz/data-stores/read_data_store_schema.json) | no | — |
| `create_data_record` | [examples/zzz/data-stores/create_data_record.json](examples/zzz/data-stores/create_data_record.json) | write | — |
| `create_data_store` | [examples/zzz/data-stores/create_data_store.json](examples/zzz/data-stores/create_data_store.json) | write | — |
| `write_data_store_schema` | [examples/zzz/data-stores/write_data_store_schema.json](examples/zzz/data-stores/write_data_store_schema.json) | write | — |

## zzz — Системные файлы (`zzz/system/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `list_system_files` | [examples/zzz/system/list_system_files.json](examples/zzz/system/list_system_files.json) | yes | 1771 |
| `read_system_file` | [examples/zzz/system/read_system_file.json](examples/zzz/system/read_system_file.json) | yes | 61 |
| `notify_user` | [examples/zzz/system/notify_user.json](examples/zzz/system/notify_user.json) | write | — |
| `write_system_file` | [examples/zzz/system/write_system_file.json](examples/zzz/system/write_system_file.json) | write | — |

## zzz — Inbox / thread / comments (`zzz/workflow/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `list_inbox` | [examples/zzz/workflow/list_inbox.json](examples/zzz/workflow/list_inbox.json) | yes | 1994 |
| `read_dialogs` | [examples/zzz/workflow/read_dialogs.json](examples/zzz/workflow/read_dialogs.json) | yes | 210 |
| `get_topic_intake` | [examples/zzz/workflow/get_topic_intake.json](examples/zzz/workflow/get_topic_intake.json) | yes | 331 |
| `get_intake_batch` | [examples/zzz/workflow/get_intake_batch.json](examples/zzz/workflow/get_intake_batch.json) | yes | 595 |
| `list_comments` | [examples/zzz/workflow/list_comments.json](examples/zzz/workflow/list_comments.json) | yes | 250 |
| `append_comment` | [examples/zzz/workflow/append_comment.json](examples/zzz/workflow/append_comment.json) | write | — |
| `append_dialog` | [examples/zzz/workflow/append_dialog.json](examples/zzz/workflow/append_dialog.json) | write | — |
| `create_inbox_item` | [examples/zzz/workflow/create_inbox_item.json](examples/zzz/workflow/create_inbox_item.json) | write | — |
| `toggle_comment_reaction` | [examples/zzz/workflow/toggle_comment_reaction.json](examples/zzz/workflow/toggle_comment_reaction.json) | write | — |
| `triage_inbox_item` | [examples/zzz/workflow/triage_inbox_item.json](examples/zzz/workflow/triage_inbox_item.json) | write | — |

## Свободная память (`workspace/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `list_adopt_folders` | [examples/workspace/list_adopt_folders.json](examples/workspace/list_adopt_folders.json) | yes | 875 |
| `browse_workspace_folder` | [examples/workspace/browse_workspace_folder.json](examples/workspace/browse_workspace_folder.json) | yes | 1210 |
| `scan_workspace_folder` | [examples/workspace/scan_workspace_folder.json](examples/workspace/scan_workspace_folder.json) | yes | 2168 |
| `upload_workspace_file` | [examples/workspace/upload_workspace_file.json](examples/workspace/upload_workspace_file.json) | write | — |

## Agent Shell (`shell/`)

| Tool | File | Live | Bytes |
|------|------|------|-------|
| `shell_get_status` | [examples/shell/shell_get_status.json](examples/shell/shell_get_status.json) | yes | 2851 |
| `shell_camera_snapshot` | [examples/shell/shell_camera_snapshot.json](examples/shell/shell_camera_snapshot.json) | write | — |
| `shell_post_message` | [examples/shell/shell_post_message.json](examples/shell/shell_post_message.json) | write | — |
| `shell_screenshot` | [examples/shell/shell_screenshot.json](examples/shell/shell_screenshot.json) | write | — |
| `shell_stop_tts` | [examples/shell/shell_stop_tts.json](examples/shell/shell_stop_tts.json) | write | — |

Generated: 2026-08-07T19:40:06.586Z

## Also

- [`1.json`](1.json) — минимальный пример `read_page_schema` (пустые layers)
- [`generate-examples.mjs`](generate-examples.mjs) — перегенерация

```bash
AGENT_CMS_AGENT=agent-cms-test node workspaces/agent-cms-core/temp/generate-examples.mjs
```
