# Реестр компонентов platform core

**Единый язык CMS:** каждый тип системы — **топик** (`awn.topic`) внутри **области**.

```
components/
└── fields/              legacy · типы полей
    └── string/          awn.topic · awn.string
        ├── manifest.md
        └── awn-storage/configuration/schema.yml

types/                     канон · page/content/slot/field типы
awn-system/types/          runtime-копия типов агента
```

**Markdown-блоки** — `awn-data/markdown-blocks/` (не components).

## Включить / выключить

| `awn-status` | Runtime |
|--------------|---------|
| `🟢 Открыта` | **активен** — поле/блок/тип в UI и API |
| `🟡 Черновик` | только в дереве CMS, **не** в runtime |
| `🔴 Закрыта` | **выключен**, как удалённый из реестра |

## Добавить новое поле

```bash
node scripts/scaffold-component.js field my-field
```

1. Отредактируй `components/fields/my-field/awn-storage/configuration/schema.yml`
2. В `manifest.md` поставь `awn-status: "🟢 Открыта"`
3. Поле появится в `/api/awn-types` → `fieldRegistry`

## Добавить markdown-блок

Запись в `awn-data/markdown-blocks/blocks/{slug}.md` или MCP `create_data_record`.

## API для агента

- `GET /api/components` — активные топики + схемы
- MCP `list_components`
- `GET /api/awn-types` — fields, blocks, types
- `GET /api/awn-data?store=markdown-blocks/blocks` — блоки палитры

Loader: `components-loader.js` — fields (legacy); `type-catalog-loader.js` — types/; `awn-blocks-loader.js` — блоки из awn-data.
