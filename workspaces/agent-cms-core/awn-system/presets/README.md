# awn-system/presets/ (legacy)

**Перенесено в** `awn-data/system-presets/` — коллекция инфоблоков.

Редактируйте записи там (`{slug}.md`), порядок — `sort.json`.

Loader: `awn-system-presets-loader.js` читает `awn-data/system-presets` (platform + override в workspace агента). Legacy YAML в этой папке больше не используется.

Миграция: `node scripts/migrate-presets-to-awn-data.js`
