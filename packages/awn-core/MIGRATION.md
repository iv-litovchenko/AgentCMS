# Миграция в packages/awn-core

Таблица переноса из корня репозитория. **Не удалять** старые файлы до обновления всех `require()`.

## manifest/

| Сейчас | Будет | Содержание |
|--------|-------|------------|
| `manifest-paths.js` | `manifest/index.js` | workspace, area, topic, awn-storage, history, bundle paths |

**Зависимости:** только `path`.

**Кто импортирует:** `server.js`, `awn-types-loader.js`, `agent-registry.js`, `public/main.js` (дубли констант).

---

## yaml/

| Сейчас | Будет |
|--------|-------|
| `awn-yaml-utils.js` | `yaml/index.js` |

parseTypeYaml, loadYamlFileSync, listYamlFilesSync.

---

## loaders/types/

| Сейчас | Будет |
|--------|-------|
| `awn-types-loader.js` | `loaders/types/index.js` |

loadAgentTypes, getAwnTypesPayload, getTopicSchemaPayload, mergeTypeFields, awn_schema parse/apply.

**Зависит от:** manifest, yaml, loaders/fields, loaders/blocks.

---

## loaders/fields/

| Сейчас | Будет |
|--------|-------|
| `awn-fields-loader.js` | `loaders/fields/loader.js` |
| `awn-field-registry.js` | `loaders/fields/registry.js` |

fieldRegistry, fieldDefSchema, loadAgentFields.

**Источник данных (фаза 2):**

```
1. agent-cms-core/types-of-components/**/configuration/schema.yml
2. awn-types/fields/*.yml                    (override / legacy)
3. {agentRoot}/awn-types/fields/*.yml        (override агента)
```

---

## loaders/blocks/

| Сейчас | Будет |
|--------|-------|
| `awn-blocks-loader.js` | `loaders/blocks/index.js` |

blockRegistry, blockGroups.

---

## catalog/

| Сейчас | Будет |
|--------|-------|
| `catalog-loader.js` | `catalog/loader.js` |
| `catalog-items.js` | `catalog/items.js` |
| `catalog-normalize.js` | `catalog/normalize.js` |
| `catalog-migration.js` | `catalog/migration.js` |
| `platform-agent.js` | `catalog/platform-agent.js` |

Справочники `data/catalog/` — данные, не код.

---

## agents/

| Сейчас | Будет |
|--------|-------|
| `agent-registry.js` | `agents/registry.js` |

discover agents, awn-agents.json, agent-* prefix.

---

## markdown/

| Сейчас | Будет |
|--------|-------|
| `markdown-link-rewriter.js` | `markdown/link-rewriter.js` |

---

## handlers/ (новое, фаза 3)

Вынести из `public/main.js`:

| Логика | Будет |
|--------|-------|
| `resolvePropsFieldWidget` | `handlers/fields/resolve-widget.js` |
| `createPropsForm*Control` | `handlers/fields/widgets/*.js` |
| `createTopicSchemaSettingControl` | `handlers/fields/schema-editor.js` |
| block insert / palette | `handlers/blocks/` |

**Связь со schema.yml:**

```yaml
# types-of-components/fields/.../string/schema.yml
widget: input    → handlers/fields/widgets/input.js
```

UI (`public/main.js`) только вызывает registry по `widget` + `typeId`.

---

## Остаётся в корне (приложение)

| Файл | Почему |
|------|--------|
| `server.js` | HTTP shell, static, wiring (позже → `packages/awn-server`) |
| `docs-registry.js` | docs для UI modals |
| `public/main.js` | DOM, routing, editor (тонкий после handlers/) |
| `public/*.js` | UI panels |
| `mcp-server/` | MCP transport |
| `electron/` | desktop shell |
| `awn-types/` | legacy до фазы 2 |
| `docs/api-*.js`, `docs/mcp-*.js` | machine docs |

---

## Порядок работ (рекомендуемый)

1. `index.js` re-export — ничего не ломается
2. Move `yaml/` + `manifest/` → обновить require в loaders
3. Move `loaders/*` → server.js `require('@agent-cms/core/loaders/types')`
4. Schema resolver: glob `schema.yml` в agent-cms-core
5. Extract handlers → уменьшить main.js
6. (опционально) `packages/awn-server`

---

## Проверка после каждого шага

```bash
npm start
# открыть agent-cms-core → examples → string-field-full → sample-record → Свойства
```
