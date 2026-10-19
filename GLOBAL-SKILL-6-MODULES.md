---
name: agent-cms-modules
description: Модули платформы Agent CMS — git-модуль (status, diff, commit, push, pull, remote, init), короткие ссылки (create/get/delete/list), другие module_* по мере появления. Применяй по просьбе человека: git-операции, публичные короткие URL, module_git_* / create_short_link и т.д.
---

# Agent CMS — модули

Модули — дополнительные возможности платформы. Базовая работа с хранилищем — скилл `agent-cms`. Вызывай модуль только по просьбе человека.

| Модуль | Tools | Статус |
|--------|-------|--------|
| Git | `module_git_*` | есть |
| Короткие ссылки | `create_short_link`, `get_short_link`, `delete_short_link`, `list_short_links` | есть |

Новые модули добавляй в эту таблицу и отдельным разделом ниже.

## Git

Git **самого хранилища** (клоны в `awn-repositories/` — через `exec_command` / `exec_shell`). Кроме `module_git_status` и `module_git_diff` всё заблокировано при `mcp-mode=readonly`. Коммит, push и pull — только по просьбе человека.

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
| Создать (идемпотентно) | `create_short_link({ path, view?, code?, replace? })` или «Поделиться» в меню «Ссылки» |
| Найти по коду или пути | `get_short_link({ code })` / `get_short_link({ path })` |
| Список | `list_short_links()` или модуль редактора «Короткие ссылки» |
| Удалить | `delete_short_link({ code })` |

**URL:** `/link/{workspaceId}/{code}` — лендинг с превью workspace и страницы, кнопка «Просмотр» → полный CHPU-URL. API: `GET /api/public/short-link?agentId=&code=`, обложка `…/cover`.

**Ограничение:** при перемещении/удалении целевого файла запись в реестре остаётся — ссылка может устареть (`targetExists: false` в UI/API).
