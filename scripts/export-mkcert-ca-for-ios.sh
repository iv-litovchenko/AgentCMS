#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

node -e "
const path = require('path');
const { exportMkcertRootCa, isMkcertDev } = require('./lib/mkcert-ios-ca');
const root = process.argv[1];
if (!isMkcertDev(root)) {
  console.error('Сертификаты не mkcert. Сначала: npm run setup:certs');
  process.exit(1);
}
const result = exportMkcertRootCa(root);
if (!result.ok) {
  console.error('Не удалось экспортировать CA:', result.reason || 'unknown');
  process.exit(1);
}
console.log('CA для iPhone:', result.path);
" "$ROOT"

IP="$(cat "$ROOT/.dev-certs/last-ip.txt" 2>/dev/null || echo 127.0.0.1)"
echo ""
echo "На iPhone откройте по HTTP (важно — без s):"
echo "  http://${IP}:3088/dev/mkcert-root-ca.pem"
echo ""
echo "Затем:"
echo "  1. Установить профиль (Настройки → Загруженный профиль)"
echo "  2. Настройки → Основные → Об этом устройстве → Доверие сертификатам"
echo "  3. Включить «mkcert …»"
echo ""
echo "После этого https://${IP}:3488/ откроется без предупреждений."
