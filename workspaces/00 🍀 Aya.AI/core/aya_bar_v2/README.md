---
created: 2026-03-25
modified: 2026-03-29
model: gpt-5.3-codex*
last_model: qwen-portal/coder-model
---

# Aya Bar v2

Компонентный бар для Aya на macOS.

## Цели

- Сохранить визуальный стиль первой версии
- Разделить UI на переиспользуемые компоненты
- Общее состояние с голосом: `../integration/voice_status.txt`, `assistant_settings.json`, `phrase_history.json` (в `aya-bar/` — симлинки на эти файлы)

## Структура

- `app/components/` — UI-компоненты
- `app/services/` — чтение статуса и истории
- `app/views/` — сборка окна
- `scripts/run.sh` — запуск из текущего терминала
- `scripts/run_macos_terminal.sh` — macOS: новое окно **Terminal.app** (если из Cursor падает Tk)

## Запуск

```bash
cd "00 🍀 Aya.AI/core/aya_bar_v2"
./scripts/run.sh
```

Из **Cursor** при краше Python/Tk (`Abort trap: 6`, стек `TkpOpenDisplay` / `_RegisterApplication`):

```bash
./scripts/run_macos_terminal.sh
```

## Troubleshooting

- **`Abort trap: 6` / краш в `libtcl9tk` + `HIServices`**: часто **Python 3.14 + Tcl/Tk 9** и запуск из встроенного терминала IDE. Запусти **`./scripts/run_macos_terminal.sh`** или обычный **Terminal.app** вручную с тем же `cd` и `python3 -m app.main`.
- Попробуй **`AYA_BAR_USE_SYSTEM_PYTHON=1 ./scripts/run.sh`** — другой связки Python + Tk.
- Опциональный фон Nebula: **`AYA_BAR_NEBULA=1`** и `pip install Pillow` (см. `run.sh`).
