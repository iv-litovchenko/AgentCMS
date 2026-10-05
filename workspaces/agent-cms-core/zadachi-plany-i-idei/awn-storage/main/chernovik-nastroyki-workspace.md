---
awn-type: awn.content.record
awn-name: "Черновик: настройки workspace (agent settings)"
awn-status: open
awn-description: "MVP настроек хранилища — schema в types/settings, values в config.yml"
---

# Черновик: настройки workspace

**Область:** только хранилище (workspace / agent), не платформа CMS.

**Где живёт:**
- schema → `awn-system/types/settings/*.yml`
- values → `config.yml` на уровне ws / area / topic
- UI → sidebar «🟢 Настройки и параметры (static)»

## Наследование

```
workspace/config.yml
  └── area/config.yml      (переопределяет)
        └── topic/config.yml
```

MCP и runtime читают **merged** values снизу вверх (topic wins).

## Типы настроек (MVP)

| id | Файл | Зачем |
|----|------|-------|
| `agent.settings.general` | `general.yml` | язык, стиль, уведомления |
| `agent.settings.mcp` | `mcp.yml` | mode, batch_invoke, confirm |
| `agent.settings.memory` | `memory.yml` | слот, факты, awn-temp, always-context |

`agent.settings.voice` — отдельно, TTS/STT в kit-страницах.

## Пример config.yml (workspace)

**MVP:** плоские ключи (редактор пока не поддерживает вложенные группы).

```yaml
awn_settings:
  agent-language: ru
  response-style: brief
  notify-on-complete: false
  mcp-mode: standard
  batch-enabled: true
  batch-read-limit: 20
  batch-write-limit: 10
  batch-deny-exec: true
  confirm-delete: true
  confirm-exec: true
  default-slot: main
  auto-retain-facts: false
  awn-temp-ttl-days: 30
  always-context-max-files: 0
```

Поля формы — в `schema-mod.yml` → `awn_schema.settings.fields` (см. `agent-cms-test/schema-mod.yml`).

## Кто читает (consumer)

| Настройка | Consumer |
|-----------|----------|
| `mcp-mode` | MCP server перед write/delete |
| `batch-*` | `batch_invoke` (когда появится) |
| `confirm-*` | Shell tool permission UI |
| `default-slot` | create_content без slot |
| `awn-temp-ttl-days` | cron / heartbeat cleanup job |
| `agent-language` | prompt hint в get_session_context |

## Не в workspace settings

| Что | Где |
|-----|-----|
| Shell STT/TTS | `settings.json` shell |
| API keys, TLS | `.env` сервера |
| Глобальные типы CMS | `awn-system/` (read-only для агента) |

## Статус MVP

- [x] UI: кнопка «Открыть настройки проекта» в sidebar
- [x] `schema-mod.yml` → `awn_schema.settings.fields` (agent-cms-test)
- [x] `config.yml` → плоские `awn_settings`
- [x] API `GET /api/agent/workspace-settings`
- [x] `workspaceSettings` в `get_session_context`
- [x] Enforce `mcp-mode` в MCP server (readonly / exec)
- [x] MCP tool `batch_invoke` + enforce `batch-*` лимиты
- [x] Центральный policy: `awn-system/mcp-policy.yml` + `mcp-policy-loader.js`

## Следующий шаг

1. Merged values ws → area → topic
3. Инвалидация кэша настроек при save (сейчас TTL 30с в MCP)
4. Группы полей в UI (Общие / MCP / Память)
