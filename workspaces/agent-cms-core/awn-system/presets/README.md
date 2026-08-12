# awn-system/presets/

Заготовки содержимого **системных файлов** workspace (`.env`, `SKILL.md`, `AGENTS.md`, …).

Используются UI при создании/редактировании корневых системных файлов (жёлтая полоска «Вставить шаблон») и API `GET /api/system-file-templates`.

## Формат записи (`{slug}.yml`)

```yaml
id: awn.preset.env
name: Переменные окружения — .env
target-file: .env
hint-title: …
hint-text: …
status: active          # active | draft | deprecated | inactive (как у типов)
sort: 2
body: |
  # содержимое для вставки
```

- **`status: active`** — шаблон участвует в runtime (кнопка «Вставить»).
- **`draft` / `inactive`** — только в меню редактора, не подставляется автоматически.
- **`deprecated`** — как у типов: ещё в runtime, но помечен устаревшим.

Порядок в меню — `sort.yml` (`sortOrder`).

Агент может переопределять platform presets файлами в `{workspace}/awn-system/presets/` (merge по `target-file`).
