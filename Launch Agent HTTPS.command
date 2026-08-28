#!/bin/bash
cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm не найден. Установите Node.js: https://nodejs.org/"
  read -r -p "Нажмите Enter для выхода..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Первый запуск: npm install..."
  npm install || {
    read -r -p "Нажмите Enter для выхода..."
    exit 1
  }
fi

echo "Agent CMS: https://localhost:3443"
echo "Остановка: Ctrl+C"
npm run start:https
