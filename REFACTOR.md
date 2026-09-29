# Рефакторинг структуры проекта

Ссылки на чаты Cursor (история проекта YamlCMS). UUID — идентификатор чата в истории Cursor.

## Этап 1

### Корень репо и JS

| Тема | Чат |
|------|-----|
| Бардак в корне JS (таблица переносов, `public/`) | [Бардак в корне JS](43d169c7-e12e-4fd8-b973-40cf5c6b0e34) |
| Почистить корень JS (куда перенести, команды в корне) | [Почистить корень JS](4ab23c72-da7f-4aa4-b96f-f0ce2bd6c444) |

### Смежные обсуждения

| Тема | Чат |
|------|-----|
| Структура `.agent-cms` | [Структура .agent-cms](28f239ce-eee5-4b45-be71-b2a862c64d1b) |
| Файлы в корне `awn-system` | [awn-system в корне](310d48e2-f1a9-4daa-ba98-45cf844fa627) |
| `.command` в корне → Agent CMS Control | [Команды и Control app](cd322d59-895f-4b92-be64-26e1c6e0ca40) |
| Перенос в `public/_storage/drafts` | [public/_storage](6cd82291-820d-4416-8edb-d1c87a4d3c52) |
| Плоская структура хранилища / `tree.json` | [Плоская структура](f1817144-b88d-47dc-936e-3deccfcaaee2) |

### В workspace (не Cursor)

- Claude, 2026-09-10 — монолитный `server.js`, уборка кода: `workspaces/agent-cms-test/awn-dialogs/claude/924375f6-b5a0-4fab-a5dc-3740d514cb7a/2026-09-10.md`
- Идея `packages/` vs корень: `packages/README.md`, `workspaces/agent-cms-core/runtime/packages-layout.md`

## «Резать server.js» — что это

Сейчас почти вся логика внутри одного файла (~27k строк). «Резать» = выносить куски в отдельные файлы в lib/ (роуты, хелперы, API), а в server.js оставить тонкий запуск: подключил модули → слушает порт.

### Зачем (кратко)

- Не тащить 80 файлов из корня за один раз — новый код уже не лежит в корне.
- Проще читать, ревьюить и не ломать соседнее при правке.
- Это другая задача, не замена переносу: перенос = разложить уже существующие модули; резка = уменьшить монолит server.js.

Итого: сейчас делаете перенос. Резку server.js — потом, по желанию, параллельно или после.

## Итоговый план переноса (дерево)

**Этап 1 — только перенос.** Эмодзи: ❌ остаётся · ✅ лёгкая группа · ⚠️ средняя · 🔴 тяжёлая (фаза 4)

```
YamlCMS/
│
├── ❌ server.js  →  (корень, не двигаем)
├── ⚠️ voice-server.js  →  server/voice-server.js   (или оставить в корне)
│
├── ✅ lib/api/
│   ├── exists-api.js  →  lib/api/exists-api.js
│   ├── content-schema-api.js  →  lib/api/content-schema-api.js
│   ├── ui-context-api.js  →  lib/api/ui-context-api.js
│   ├── idle-screensaver-rest-api.js  →  lib/api/idle-screensaver-rest-api.js
│   ├── pomodoro-rest-api.js  →  lib/api/pomodoro-rest-api.js
│   └── page-slots-api.js  →  lib/api/page-slots-api.js
│
├── ✅ lib/services/
│   ├── identity-service.js  →  lib/services/identity-service.js
│   ├── document-extract-service.js  →  lib/services/document-extract-service.js
│   ├── script-exec-service.js  →  lib/services/script-exec-service.js
│   ├── web-search-service.js  →  lib/services/web-search-service.js
│   ├── sidecar-service.js  →  lib/services/sidecar-service.js
│   ├── dependencies-service.js  →  lib/services/dependencies-service.js
│   ├── workspace-brain-service.js  →  lib/services/workspace-brain-service.js
│   ├── workspace-facts-service.js  →  lib/services/workspace-facts-service.js
│   ├── workspace-journal-service.js  →  lib/services/workspace-journal-service.js
│   └── awn-repositories-service.js  →  lib/services/awn-repositories-service.js
│
├── ✅ lib/media/
│   ├── media-import.js  →  lib/media/media-import.js
│   ├── media-thumbs.js  →  lib/media/media-thumbs.js
│   ├── base64-upload.js  →  lib/media/base64-upload.js
│   └── gdrive-sync.js  →  lib/media/gdrive-sync.js
│
├── ✅ lib/tools/
│   ├── broken-links-scanner.js  →  lib/tools/broken-links-scanner.js
│   └── markdown-link-rewriter.js  →  lib/tools/markdown-link-rewriter.js
│
├── ⚠️ lib/docs/
│   ├── api-docs.js  →  lib/docs/api-docs.js
│   ├── mcp-docs.js  →  lib/docs/mcp-docs.js
│   └── docs-registry.js  →  lib/docs/docs-registry.js
│
├── ⚠️ lib/agents/
│   ├── agent-registry.js  →  lib/agents/agent-registry.js
│   └── agent-system.js  →  lib/agents/agent-system.js
│
├── ⚠️ lib/workspace/
│   ├── workspace-agent-settings.js  →  lib/workspace/workspace-agent-settings.js
│   ├── workspace-path-resolver.js  →  lib/workspace/workspace-path-resolver.js
│   ├── workspace-importance.js  →  lib/workspace/workspace-importance.js
│   ├── workspace-compose-templates.js  →  lib/workspace/workspace-compose-templates.js
│   ├── workspace-index-exclude.js  →  lib/workspace/workspace-index-exclude.js
│   ├── workspace-shell-settings-bridge.js  →  lib/workspace/workspace-shell-settings-bridge.js
│   ├── workspace-route-settings-bridge.js  →  lib/workspace/workspace-route-settings-bridge.js
│   ├── workspace-ui-settings-bridge.js  →  lib/workspace/workspace-ui-settings-bridge.js
│   ├── workspace-voice-settings-bridge.js  →  lib/workspace/workspace-voice-settings-bridge.js
│   ├── workspace-media-settings-bridge.js  →  lib/workspace/workspace-media-settings-bridge.js
│   ├── workspace-window-settings-bridge.js  →  lib/workspace/workspace-window-settings-bridge.js
│   └── ws-list-bridge.js  →  lib/workspace/ws-list-bridge.js
│
├── ⚠️ lib/catalog/
│   ├── catalog-loader.js  →  lib/catalog/catalog-loader.js
│   ├── catalog-items.js  →  lib/catalog/catalog-items.js
│   ├── catalog-migration.js  →  lib/catalog/catalog-migration.js
│   ├── catalog-normalize.js  →  lib/catalog/catalog-normalize.js
│   ├── components-loader.js  →  lib/catalog/components-loader.js
│   └── type-catalog-loader.js  →  lib/catalog/type-catalog-loader.js
│
├── ✅ lib/ui/
│   └── ui-context-focus.js  →  lib/ui/ui-context-focus.js
│
├── 🔴 lib/platform/          (фаза 4, одним заходом)
│   ├── platform-sources.js  →  lib/platform/platform-sources.js
│   ├── platform-agent.js  →  lib/platform/platform-agent.js
│   └── platform-ui-rotators.js  →  lib/platform/platform-ui-rotators.js
│
├── 🔴 lib/awn/
│   ├── awn-yaml-utils.js  →  lib/awn/awn-yaml-utils.js
│   ├── awn-data-loader.js  →  lib/awn/awn-data-loader.js
│   ├── awn-data-csv.js  →  lib/awn/awn-data-csv.js
│   ├── awn-types-loader.js  →  lib/awn/awn-types-loader.js
│   ├── awn-blocks-loader.js  →  lib/awn/awn-blocks-loader.js
│   ├── awn-fields-loader.js  →  lib/awn/awn-fields-loader.js
│   ├── awn-field-registry.js  →  lib/awn/awn-field-registry.js
│   ├── awn-enum-options.js  →  lib/awn/awn-enum-options.js
│   ├── awn-canonical-model.js  →  lib/awn/awn-canonical-model.js
│   ├── awn-system-presets-loader.js  →  lib/awn/awn-system-presets-loader.js
│   ├── awn-data-agents-bridge.js  →  lib/awn/awn-data-agents-bridge.js
│   ├── awn-data-types-bridge.js  →  lib/awn/awn-data-types-bridge.js
│   ├── awn-data-taxonomies-bridge.js  →  lib/awn/awn-data-taxonomies-bridge.js
│   ├── awn-taxonomy-record.js  →  lib/awn/awn-taxonomy-record.js
│   ├── awn-taxonomy-catalog-bridge.js  →  lib/awn/awn-taxonomy-catalog-bridge.js
│   ├── awn-taxonomy-service.js  →  lib/awn/awn-taxonomy-service.js
│   └── types-yaml-bridge.js  →  lib/awn/types-yaml-bridge.js
│
└── 🔴 lib/config/
    ├── manifest-paths.js  →  lib/config/manifest-paths.js
    ├── storage-slot-routing.js  →  lib/config/storage-slot-routing.js
    ├── schema-mod-paths.js  →  lib/config/schema-mod-paths.js
    ├── configuration-schema.js  →  lib/config/configuration-schema.js
    ├── section-schema.js  →  lib/config/section-schema.js
    ├── chpu-resolver.js  →  lib/config/chpu-resolver.js
    ├── settings-store.js  →  lib/config/settings-store.js
    ├── mcp-policy-loader.js  →  lib/config/mcp-policy-loader.js
    ├── index-policy.js  →  lib/config/index-policy.js
    ├── node-read-state.js  →  lib/config/node-read-state.js
    ├── node-config-bundle.js  →  lib/config/node-config-bundle.js
    └── storage-record-extensions.js  →  lib/config/storage-record-extensions.js
```

**Порядок:** ✅ `api` → `services` → `media` → `tools` → ⚠️ `docs` → `agents` → `workspace` → `catalog` → `ui` → 🔴 `platform` + `awn` + `config` (вместе + `scripts/` + electron `build.files`).

**После переноса в корне:** `server.js`, опционально `voice-server.js`, `package.json`, `*.command`, README, env.

**Этап 2 (отдельно):** резать `server.js`, не обязателен для переноса.

## Этап 3 — `public/` (перенос + правка `index.html` / редких ссылок)

Эмодзи: ❌ не двигаем · ✅ лёгко · ⚠️ несколько ссылок

```
public/
│
├── ❌ main.js  →  (корень public/, не двигаем)
│
├── ⚠️ public/js/core/
│   ├── topic-schema-slot-specs.js  →  public/js/core/topic-schema-slot-specs.js
│   ├── node-config-bundle.js  →  public/js/core/node-config-bundle.js
│   ├── project-version.js  →  public/js/core/project-version.js
│   ├── platform-status.js  →  public/js/core/platform-status.js
│   └── slug-translit.js  →  public/js/core/slug-translit.js
│
├── ✅ public/js/app/
│   ├── app-lock.js  →  public/js/app/app-lock.js
│   ├── app-lock-scanner.js  →  public/js/app/app-lock-scanner.js
│   ├── app-footer-voice-cmd.js  →  public/js/app/app-footer-voice-cmd.js
│   ├── app-home-title-rotator.js  →  public/js/app/app-home-title-rotator.js
│   ├── header-slogan-rotator.js  →  public/js/app/header-slogan-rotator.js
│   ├── connection-status.js  →  public/js/app/connection-status.js
│   └── privacy-mode.js  →  public/js/app/privacy-mode.js
│
├── ✅ public/js/panels/
│   ├── discuss-panel.js  →  public/js/panels/discuss-panel.js
│   ├── languagetool-panel.js  →  public/js/panels/languagetool-panel.js
│   ├── semantic-index-panel.js  →  public/js/panels/semantic-index-panel.js
│   ├── file-find-bar.js  →  public/js/panels/file-find-bar.js
│   ├── api-docs-ui.js  →  public/js/panels/api-docs-ui.js
│   ├── mcp-docs-primitives-help.js  →  public/js/panels/mcp-docs-primitives-help.js
│   ├── companion-docs.js  →  public/js/panels/companion-docs.js
│   ├── cms-page-picker.js  →  public/js/panels/cms-page-picker.js
│   └── page-picker-extract.js  →  public/js/panels/page-picker-extract.js
│
├── ✅ public/js/editor/
│   ├── document-viewer.js  →  public/js/editor/document-viewer.js
│   ├── marker-blocks-preview.js  →  public/js/editor/marker-blocks-preview.js
│   ├── page-snapshot.js  →  public/js/editor/page-snapshot.js
│   ├── external-file-mask.js  →  public/js/editor/external-file-mask.js
│   └── material-file-icons.js  →  public/js/editor/material-file-icons.js
│
├── ✅ public/js/markdown/
│   ├── markdown-github-alerts.js  →  public/js/markdown/markdown-github-alerts.js
│   ├── markdown-it-task-lists.js  →  public/js/markdown/markdown-it-task-lists.js
│   └── markdown-it-footnote.min.js  →  public/js/markdown/markdown-it-footnote.min.js
│
├── ✅ public/js/mermaid/
│   ├── mermaid-diagram-chrome.js  →  public/js/mermaid/mermaid-diagram-chrome.js
│   ├── mermaid-diagram-panzoom.js  →  public/js/mermaid/mermaid-diagram-panzoom.js
│   └── mermaid-diagram-theme.js  →  public/js/mermaid/mermaid-diagram-theme.js
│
├── ✅ public/js/pomodoro/
│   ├── pomodoro-state-bootstrap.js  →  public/js/pomodoro/pomodoro-state-bootstrap.js
│   ├── pomodoro-state-api.js  →  public/js/pomodoro/pomodoro-state-api.js
│   ├── pomodoro-break-emoji.js  →  public/js/pomodoro/pomodoro-break-emoji.js
│   ├── workspace-pomodoro.js  →  public/js/pomodoro/workspace-pomodoro.js
│   ├── idle-screensaver-breaks-client.js  →  public/js/pomodoro/idle-screensaver-breaks-client.js
│   └── workspace-idle-screensaver.js  →  public/js/pomodoro/workspace-idle-screensaver.js
│
└── ✅ public/js/cms/
    ├── awn-dashboards.js  →  public/js/cms/awn-dashboards.js
    └── awn-enum-options.js  →  public/js/cms/awn-enum-options.js
```

**Порядок:** ✅ `mermaid` → `markdown` → `pomodoro` → `panels` → `app` → `editor` → `cms` → ⚠️ `core` (плюс grep `topic-schema` / `node-config-bundle` в `server` и индексах).

**После:** в корне `public/` — `main.js`, `index.html`, `styles.css`, папки `shell/`, `vendor/`, `shared/`, `_storage/`.

**Чек:** `npm start` + открыть CMS, консоль без 404 на `/….js`.