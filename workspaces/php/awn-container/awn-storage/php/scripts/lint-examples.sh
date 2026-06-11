#!/usr/bin/env bash
# Проверка синтаксиса PHP-файлов в примерах темы
set -euo pipefail
SLOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLES="${SLOT_DIR}/Content/Примеры кода"
PHP_BIN="${PHP_BIN:-php}"

if [ ! -d "$EXAMPLES" ]; then
  echo "Examples dir not found: $EXAMPLES"
  exit 0
fi

count=0
while IFS= read -r -d '' f; do
  "$PHP_BIN" -l "$f"
  count=$((count + 1))
done < <(find "$EXAMPLES" -name '*.php' -print0)

echo "Checked ${count} file(s)"
