---
AWN-TYPE: "NODE/SOLO"
AWN-TITLE: Тестовая задача — случайное число
AWN-DESC: "Тестовая cron-нода: раз в час генерирует случайное число от 1 до 100 и записывает в память."
AWN-LOAD: on_demand
AWN-PRIORITY: 50
AWN-TRIGGERS: [тест крона, случайное число, random number test, крон тест]
AWN-STATUS: active
AWN-MEMORY: external
AWN-AUTOMATIZATION: true
AWN-CRON: "0 * * * *"
AWN-CATEGORY: system
AWN-VERSION: 1.0.0
AWN-CREATED: 2026-05-06
AWN-UPDATED: 2026-05-06
---

# Тестовая задача — случайное число

> [!info] О файле
> Нода (`*.node.md`, `NODE/SOLO`): тестовая cron-задача. Выполняется раз в час, генерирует случайное число от 1 до 100 и записывает результат в `*.main.md`.

## Назначение

Проверка работоспособности системы cron-задач в OpenClaw. Простая автоматизированная задача с предсказуемым результатом.

## Расписание

- **Cron:** `0 * * * *` — каждый час в :00 минут
- **Часовой пояс:** UTC (по умолчанию)

## Что делает нода

1. Генерирует случайное целое число от 1 до 100
2. Создаёт или дополняет файл памяти в `Assistant.Ai/Cron/Memory/RandomNumberTest/`
3. Записывает: timestamp, сгенерированное число, номер часа

## Куда пишем память

- Каталог: `Assistant.Ai/Cron/Memory/RandomNumberTest/`
- Имя файла: `YYYY-MM-DD.main.md` (один файл на дату)
- Шаблон записи:

```markdown
## Запись HH:00

- **Время:** HH:00 UTC
- **Число:** XX
- **Итерация:** N-я за сегодня
```

## Ручной запуск

Триггеры: `тест крона`, `случайное число`, `random number test`, `крон тест`

## Пример записи в памяти

```markdown
---
AWN-TYPE: "RECORD/MEMORY"
AWN-OWNER: Assistant.Ai/Cron/RandomNumberTest.node.md
AWN-STATUS: open
AWN-TITLE: "RandomNumberTest — 2026-05-06"
AWN-CREATED: 2026-05-06
AWN-UPDATED: 2026-05-06
TAGS: [cron, test, random]
---

# RandomNumberTest — 2026-05-06

## Запись 15:00

- **Время:** 15:00 UTC
- **Число:** 42
- **Итерация:** 1-я за сегодня

## Запись 16:00

- **Время:** 16:00 UTC
- **Число:** 87
- **Итерация:** 2-я за сегодня
```
