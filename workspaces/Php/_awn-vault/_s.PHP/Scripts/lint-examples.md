# Lint примеров PHP

Запускает `php -l` на всех `.php` в `Content/Примеры кода/` (если появятся файлы).

## Команда

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(dirname "$0")/.."
EXAMPLES="${ROOT}/Content/Примеры кода"
find "$EXAMPLES" -name '*.php' -print0 | while IFS= read -r -d '' f; do
  php -l "$f"
done
echo "OK: syntax check passed"
```

Сохранить как `Scripts/lint-examples.sh`, chmod +x.

## Переменные

Читает `PHP_BIN` и `EXAMPLES_DIR` из `.env` слота.
