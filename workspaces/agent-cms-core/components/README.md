# Реестр компонентов platform core

**Единый язык CMS:** каждый тип системы — **топик** (`awn.topic`) внутри **области**.

```
components/
├── fields/              awn.area · типы полей
│   └── string/          awn.topic · awn.string
│       ├── manifest.md
│       └── awn-storage/configuration/schema.yml
├── markdown-blocks/     awn.area · блоки редактора
│   └── h2/              awn.topic · awn.block.h2
└── frames/              awn.area · frame-типы (topic, area…)
    └── topic/           awn.topic · awn.topic
```

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

## Добавить новый markdown-блок

```bash
node scripts/scaffold-component.js block callout
```

1. Заполни `schema.yml` — `template`, `icon`, `group`
2. `awn-status: "🟢 Открыта"` → блок в палитре редактора

## API для агента

- `GET /api/components` — активные топики + схемы
- MCP `list_components`
- `GET /api/awn-types` — fields, blocks, types (из тех же топиков)

Loader: `components-loader.js` — читает `awn.topic` + `awn-storage/configuration/schema.yml`.
