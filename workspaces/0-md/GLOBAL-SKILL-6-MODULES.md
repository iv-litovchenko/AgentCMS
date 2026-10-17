---
name: agent-cms-modules
description: Модули платформы Agent CMS — сейчас git-модуль (status, diff, commit партиями, push, pull, remote, init) для самого хранилища; сюда же будут добавляться другие модули. Применяй, когда человек просит закоммитить, отправить, забрать или посмотреть изменения хранилища, а также при упоминании module_git_*.
---

# Agent CMS — модули

Модули — дополнительные возможности платформы со своими tools `module_*`. Базовая работа с хранилищем — скилл `agent-cms`. Вызывай модуль только по просьбе человека.

| Модуль | Tools | Статус |
|--------|-------|--------|
| Git | `module_git_*` | есть |

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
