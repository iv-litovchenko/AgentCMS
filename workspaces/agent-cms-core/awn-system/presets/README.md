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

Shell (Agent Shell): пресеты `shell-tts-prompt.yml`, `shell-stt-prompt.yml` и `shell-proactive-prompt.yml` — заготовки для кнопок «Вставить заготовку» в настройках Shell (`GET /api/shell/prompt-templates`). STT: блоки `[stt]…[/stt]` в сообщении. TTS-формат: текст для голоса → `[tts-break]` → текст для экрана. Проактивность: плейсхолдеры `{{idle_seconds}}`, `{{idle_minutes}}`.

Порядок в меню — `sort.yml` (`sortOrder`).

Агент может переопределять platform presets файлами в `{workspace}/awn-system/presets/` (merge по `target-file`).
