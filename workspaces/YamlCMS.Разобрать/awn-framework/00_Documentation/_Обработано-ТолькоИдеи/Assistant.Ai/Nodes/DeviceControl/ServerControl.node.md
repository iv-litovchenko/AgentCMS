---
AWN-TYPE: "NODE/SOLO"
AWN-TITLE: Управление сервером
AWN-DESC: "Заглушка: правила и сценарии работы с удалёнными серверами (SSH, деплой, мониторинг)."
AWN-LOAD: on_demand
AWN-PRIORITY: 45
AWN-TRIGGERS:
  - управление сервером
  - сервер
  - ssh
  - vps
  - деплой
AWN-STATUS: draft
AWN-MEMORY: none
AWN-AUTOMATIZATION: false
AWN-CRON: "0 9 * * *"
AWN-CATEGORY: system
AWN-VERSION: 0.1.0
AWN-CREATED: 2026-05-07
AWN-UPDATED: 2026-05-07
---

# Управление сервером

> [!info] О файле
> Нода (`*.node.md`, `NODE/SOLO`): заглушка в папке [[awn-assistant-ai/nodes/device-control/_index.node|DeviceControl]].

Родительский индекс: [[awn-assistant-ai/nodes/device-control/_index.node|Index — DeviceControl]].

## Назначение

Зафиксировать допустимые операции на **хостах** пользователя (команды, бэкапы, перезапуски сервисов). Контент **к заполнению**.

## Контекст

Хосты, пользователи SSH, среды (prod/stage) — указать позже.

## Правила / Ограничения

Деструктивные действия только после явного подтверждения; секреты не хранить в открытом виде в ноде — дописать при активации.
