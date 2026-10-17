# Agent CMS — запуск на сервере

**Статус:** черновик деплоя · **✅** docker-compose · **✅** MCP Streamable HTTP (без TLS) · **❌** prod reverse-proxy / TLS

Краткие ответы на три вопроса — в § «Резюме»; ниже — чеклист и детали.

---

## Резюме (кратко)

### 1) Что нужно, чтобы проект жил на сервере?

**Минимум сейчас (без Docker):**

| Компонент | Как запускается | Зависимости |
|-----------|-----------------|-------------|
| **CMS (Editor)** | `npm run start` или `npm run start:https` | Node **18+**, `npm install` (native: `better-sqlite3`, `sharp`) |
| **Voice** (опц.) | вместе с CMS при `VOICE_AUTOSTART≠0`, или `npm run voice:start` | тот же Node, прокси API → CMS |
| **Commander** (опц.) | `npm run commander:start` | статика + локальный HTTP |
| **MCP** | `npm run mcp` | **отдельный процесс**, ходит в CMS по **`AGENT_CMS_BASE_URL`** |

**Docker + `docker-compose.yml`** — разумный целевой вариант: один образ Node, volume на `workspaces/` (+ при необходимости `.agent-cms-global/`), env для портов и TLS, reverse proxy снаружи.

**«Подняли на компе — доступно с других машин»:** да, если слушать не только loopback:

- CMS: `HOST=0.0.0.0` (если `HOST` не задан — поведение зависит от Node; для LAN явно лучше `0.0.0.0`).
- Voice по умолчанию: `VOICE_HOST` / fallback **`127.0.0.1`** — с других хостов **не виден**, пока не задать `VOICE_HOST=0.0.0.0`.
- Фаервол должен пропускать нужные порты; в prod — **HTTPS** (mkcert локально, Let's Encrypt / Traefik / Caddy на сервере).

### 2) MCP на отдельный порт и «полноценный адрес» в Cursor

**Сейчас:** MCP — только **`stdio`** (`mcp-server/index.js` → `StdioServerTransport`). В Cursor/Claude в конфиг кладут **команду + env** (`node …/mcp-server/index.js`, `AGENT_CMS_BASE_URL=…`), а не URL.

**Цель:** отдельный **HTTP(S) endpoint** (Streamable HTTP / SSE — по спецификации MCP), например:

`https://cms.example.com/mcp` или `https://mcp.example.com:3490/mcp`

Тогда в **Cursor Desktop → MCP** можно указать **URL**, без локального пути к репо.

**Связь слоёв:**

- **CMS** — REST `/api/*` (уже есть; MCP-клиент так и работает).
- **MCP transport** — новый слушатель (отдельный порт или path за nginx), auth (token / mTLS), лимиты из `platform.yml` → `mcp`.

### 3) «Локальные порты» и «серверные» — ты прав

Это **не два разных набора приложений**, а **одни и те же роли** с разными **значениями env / DNS / TLS**:

| Роль | Dev (localhost) | Prod (пример) |
|------|-----------------|---------------|
| Editor HTTP | `3000` | за reverse proxy или выключен |
| Editor HTTPS | `3443` (mkcert) | `443` / свой `TLS_PORT` |
| Voice HTTP/HTTPS | `3088` / `3488` | те же env или только HTTPS |
| Commander | `3188` | опционально, часто не наружу |
| **MCP HTTP** | **`3490`** (`npm run mcp:http`) | **`AGENT_CMS_MCP_HTTP_PORT`**, token **`AGENT_CMS_MCP_TOKEN`** |

Канон имён портов: `lib/config/agent-cms-ports.js` (`AGENT_CMS_EDITOR_*`, `AGENT_CMS_VOICE_*`, …). Для сервера — `.env` или compose `environment:` + проброс volume.

**MCP для удалённого Cursor:** в env клиента (или в URL-сессии) всё равно нужен **`AGENT_CMS_BASE_URL=https://твой-сервер`** — MCP-tools бьют в CMS API, не только в transport.

---

## Текущие порты (дефолты)

```
Editor:     HTTP 3000   HTTPS 3443
Voice:      HTTP 3088   HTTPS 3488
Commander:  HTTP 3188
MCP stdio:  (без порта) · MCP HTTP: 3490 → `/mcp`
```

Скрипт экспорта: `node lib/config/agent-cms-ports.js`

---

## Быстрый старт (Docker на Mac)

**Ошибка `docker-credential-osxkeychain: not found`:** Docker CLI из Homebrew, а helper — в Docker Desktop. Перед сборкой:

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
```

(или запускай `docker` из Docker Desktop, не `brew install docker`.)

```bash
docker compose up -d --build
# UI:  http://localhost:3000
# MCP: http://localhost:3490/mcp  (+ AGENT_CMS_MCP_TOKEN если задан в .env)
```

Локально без Docker: `HOST=0.0.0.0 npm start` + `AGENT_CMS_MCP_HTTP_HOST=0.0.0.0 npm run mcp:http`.

Коннекторы (Claude stdio / Cursor HTTP): **`docs/connectors/README.md`**

---

## TODO — инфраструктура

- [x] **`Dockerfile`**: Node 20, `npm ci --omit=dev`, entrypoint `cms` | `mcp`
- [x] **`docker-compose.yml`**: `cms` + `mcp`, volumes `workspaces`, `.agent-cms-global`
- [x] **`.env.example`**: HOST, MCP HTTP, token, порты
- [ ] **Reverse proxy**: nginx/Caddy — TLS termination, WebSocket если понадобится, rate limit на `/api`
- [ ] **Бэкапы**: volume `workspaces/` (+ git remotes workspace modules)
- [x] **Health**: compose healthcheck → `GET /api/agent/mcp-ping`; MCP → `GET /health`

## TODO — MCP remote

- [x] Transport **Streamable HTTP** — `mcp-server/http.js`, `npm run mcp:http`
- [x] Env: **`AGENT_CMS_MCP_HTTP_PORT`**, **`AGENT_CMS_MCP_HTTP_HOST`**, **`AGENT_CMS_MCP_TOKEN`**
- [ ] Документация + UI: блок «Remote MCP URL» рядом с текущим JSON stdio
- [ ] Безопасность: не светить exec/delete без auth; HTTPS обязателен наружу

## TODO — сеть / LAN / prod

- [ ] Явный режим **`AGENT_CMS_BIND=lan|loopback|all`** вместо разрозненных `HOST` / `VOICE_HOST`
- [ ] Сценарий «домашний сервер в LAN»: mkcert или внутренний CA
- [ ] Сценарий «VPS»: Let's Encrypt, только 443 наружу, MCP и API за одним доменом или subdomain

## Не обязательно на первом этапе

- Electron desktop на сервере
- Commander наружу (достаточно CMS UI)
- Отдельный контейнер под MCP (можно второй process в том же compose после HTTP transport)

---

## Связанные файлы

- `server.js`, `voice-server.js`, `commander-server.js`
- `lib/config/agent-cms-ports.js`
- `mcp-server/index.js`, `mcp-server/README.md`
- `commands/server-start.command`, `scripts/start-mobile-https.sh`

---

## Обсудить

- **Electron и порты:** сейчас только `PORT` / `VOICE_PORT` при запуске (`PORT=3100 npm run cms:desktop`); `.env` и `AGENT_CMS_EDITOR_*` Electron не читает; `tryNextPort` может сдвинуть порт. Нужно ли унифицировать с `agent-cms-ports.js` и UI/настройкой в desktop?
- **Несколько CMS / MCP в Claude:** локальный инстанс и «как сервер» на одном Mac — два коннектора, разные URL. Практика: **один чат = один коннектор**; второй CMS — второй чат или выключить лишний MCP в настройках чата. **`agentId`** (workspace) — внутри выбранного CMS; не различает два URL, только хранилища одного инстанса. Документировать в UI/README?
