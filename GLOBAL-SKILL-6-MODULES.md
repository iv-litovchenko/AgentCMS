---
name: agent-cms-modules
description: Модули платформы Agent CMS — git (module_git_*), короткие ссылки (module_short_link_*), медиа-облако (module_media_cloud_*), файлообменник (module_file_hub_*). По просьбе человека.
---

# Agent CMS — модули

Модули — дополнительные возможности платформы. Базовая работа с хранилищем — скилл `agent-cms`. Вызывай модуль только по просьбе человека.

| Модуль | Tools | Статус |
|--------|-------|--------|
| Git | `module_git_*` | есть |
| Короткие ссылки | `module_short_link_*` (legacy: `create_short_link`, …) | есть |
| Медиа-облако | `module_media_cloud_*` (legacy: `list_media_cloud_*`, `sync_media_cloud_file`, …) | локально есть; remote — stub |
| Файлообменник | `module_file_hub_outbound_*`; inbound — stub `*_zzz` (legacy: `*_file_hub_*`) | outbound есть |

Новые модули добавляй в эту таблицу и отдельным разделом ниже.

## Git

Git **самого хранилища** (клоны в `awn-repositories/` — через `tool_command_exec` / `tool_shell_exec`). Кроме `module_git_status` и `module_git_diff` всё заблокировано при `mcp-mode=readonly`. Коммит, push и pull — только по просьбе человека.

| Задача | Tool |
|--------|------|
| Ветка, изменения, коммиты, партии | `module_git_status` |
| Что изменилось | `module_git_diff` (`path` — один файл) |
| Закоммитить | `module_git_commit` |
| Отправить / забрать | `module_git_push` (по умолчанию `origin`, текущая ветка, `-u`) / `module_git_pull` |
| Remote | `module_git_remote` (`action: set\|remove`, `name`, `url`) |
| Создать репозиторий | `module_git_init` (ветка `main`) |

`module_git_pull`: стратегия из настроек (`module-git-pull-strategy`); переопределение — `rebase: true` или `strategy: merge|rebase`.

**Коммит партиями** (как «Сохранить» в UI):

1. `module_git_status` → `changes` (`commitBatchId`, `commitAllowed`, `sizeBytes`).
2. `module_git_commit({ batchIds: [...], messageSuffix? })`: «записи» → `["records"]`, «изображения» → `["images"]`. Партия больше лимита — `["images#1"]`, затем `["images#2"]`. Без `batchIds` — все партии по порядку, коммит на партию, пустые пропускаются.
3. Id партий: `records`, `records-history`, `images`, `sources`, `documents`, `media`, `design-2d`, `design-3d`, `design-bim`, `archives`, `other`, `configs`, `out-of-batch`.

Старый режим: `batched: false` + `message` — один коммит по фильтру расширений.

## Короткие ссылки

Публичный короткий URL на страницу workspace **без свойства на целевом файле** — только реестр `awn-short-links/{code}.md` (`awn-type: awn.annotation.short-link`: `awn-code`, `awn-target-path`, `awn-view`, `awn-created-at`).

| Задача | Tool / UI |
|--------|-----------|
| Создать (идемпотентно) | `module_short_link_create({ path, view?, code?, replace? })` или «Поделиться» в меню «Ссылки» |
| Найти по коду или пути | `module_short_link_get({ code })` / `module_short_link_get({ path })` |
| Список | `module_short_link_list()` или модуль редактора «Короткие ссылки» |
| Удалить | `module_short_link_delete({ code })` |

**URL:** `/link/{workspaceId}/{code}` — лендинг с превью workspace и страницы, кнопка «Просмотр» → полный CHPU-URL. API: `GET /api/public/short-link?agentId=&code=`, обложка `…/cover`.

**Ограничение:** при перемещении/удалении целевого файла запись в реестре остаётся — ссылка может устареть (`targetExists: false` в UI/API).

## Медиа-облако

Локальный offload в `awn-media-cloud/_blobs/` (симлинк на месте файла). Remote Google/Яндекс — только stub.

| Задача | Tool |
|--------|------|
| Справочник провайдеров | `module_media_cloud_providers_list` |
| Статус symlink / registry | `module_media_cloud_status` (`path` manifest, `file` — полный путь от корня, `scope`: file \| topic) |
| Включить/выключить offload | `module_media_cloud_sync` |
| Починить symlink | `module_media_cloud_links_repair` |
| Upload на API провайдера | `module_media_cloud_upload` (stub) |
| Публичный URL на провайдере | `module_media_cloud_url` (stub) |

## Файлообменник (Shell)

Две панели UI: **inbound** (Shell → vault) и **outbound** (vault → Shell). MCP outbound = очередь экспорта контента.

| Задача | Tool |
|--------|------|
| Список исходящих | `module_file_hub_outbound_list` |
| Добавить контент в выдачу | `module_file_hub_outbound_enqueue` (`path` — файл контента) |
| Убрать из очереди | `module_file_hub_outbound_remove` |
| Очистить очередь | `module_file_hub_outbound_clear` |
| Inbound inbox | `module_file_hub_inbound_list_zzz` (stub) |
| Inbound upload | `module_file_hub_inbound_upload_zzz` (stub) |
