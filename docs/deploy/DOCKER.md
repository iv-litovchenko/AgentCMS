# Docker — только 3 файла

| Файл | Где |
|------|-----|
| `docker-compose.mac.yml` | Mac, WSL |
| `docker-compose.linux.yml` | VPS |
| `docker-compose.windows.yml` | заготовка (→ WSL + mac) |

## Mac = Docker + браузер (канон)

1. **Docker Desktop** + `.env` в репозитории.
2. Поднять стек: **`cms-start.command`** / `npm run cms:start` (первый раз или после кода — **`cms-rebuild.command`** / `npm run cms:rebuild`).
3. Работать в **Chrome/Safari**: Editor `http://127.0.0.1:3000/`, Control `/app-control/`, chat `/app-chat/`.

**Node на Mac для сервера не ставим** — он уже внутри образов `cms`, `mcp`, `control`.

**Electron (.app)** — **опционально**: отдельные окна Editor/Shell/Control, но они только открывают **тот же URL**, что и браузер. Без запущенного Docker (или legacy `npm start`) `.app` сервер **не поднимет**.

Legacy dev: `AGENT_CMS_WELCOME_LEGACY=1` + `npm start` — не канон для «сервера на Mac».

## Linux VPS

```bash
# .env в репо; на VPS поправьте DOMAIN, PUBLIC_URL, токены
docker compose -f docker-compose.linux.yml up -d --build
# или
npm run docker:linux
```

Снаружи **80/443** (Caddy → `cms:3000`). Node на хост **не нужен** — Docker Engine + `.env`.

Остановить стек:

```bash
npm run docker:down:linux
```

## Mac (команды)

Префикс **`cms-`** — короткие имена (≤12 символов до `.command`).

| Действие | npm (канон) | Mac |
|----------|-------------|-----|
| Старт | `npm run cms:start` | `cms-start.command` |
| Стоп | `npm run cms:stop` | `cms-stop.command` |
| Рестарт | `npm run cms:restart` | `cms-restart.command` |
| Rebuild | `npm run cms:rebuild` | `cms-rebuild.command` |
| Down | `npm run docker:down` | — |

Алиасы: `docker:start` … = `cms:*`. `docker:mac` = **`cms:rebuild`**.

Снаружи один адрес (`AGENT_CMS_PUBLIC_URL`); порты 3088/3288/3490 — **только внутри** compose.

### Одна дверь (`app-*`)

| Путь | Приложение |
|------|------------|
| `/` | Editor |
| `/app-chat` | Voice / shell |
| `/app-commander` | Commander |
| `/app-control` | Control (Launcher) |
| `/app-mcp` | MCP HTTP (Cursor + Bearer) |

Mac/VPS bind-mount (без rebuild для UI/кода):

```
📦 cms
├── public/              → Editor, shell, commander
├── workspaces/
├── host-project/        → .env
├── .agent-cms-global/   → списки ws, platform.yml, runtime (было volume)
├── desktop/agent-control/ → bootstrap/actions
└── lib/, server.js, control-server.js

🧩 control → desktop/agent-control/ui + lib (Launcher UI)
🔌 mcp     → mcp-server/ + lib/ (restart контейнера mcp после правок)
```

**Rebuild образа** — только `package.json`, Dockerfile, native-модули; **`.env` в образ не запекается** (см. `.dockerignore`).

**После смены `.env`** — не rebuild, а **пересоздание контейнеров** (env подхватывается при create):

| Платформа | Команда | Что внутри |
|-----------|---------|------------|
| **Linux / VPS** | `agent-cms-cli restart` | `docker compose up -d --force-recreate` (cms, mcp, control, **caddy**) |
| **Mac** | см. ниже | `cms-restart.command` = только `compose restart` — **старый env остаётся** |

Mac после правок `.env` / домена:

```bash
docker compose -f docker-compose.mac.yml up -d --force-recreate cms mcp control
```

VPS вручную (эквивалент CLI `restart`):

```bash
docker compose -f docker-compose.linux.yml up -d --force-recreate cms mcp control caddy
```

Проверка: `npm run check:app-door`.

## Edge-приложения на поддоменах (Q10, v0)

**Не заменяют `/app-*`** на apex. По умолчанию **`AGENT_CMS_EDGE_APPS=1`** (в `.env.example` и compose); выключить edge: **`0`** + restart.

| Платформа | Compose overlay | Маршрутизация |
|-----------|-----------------|---------------|
| **Linux/VPS** | `docker-compose.edge-apps.yml` (+ Caddy) | Caddy по `Host` |
| **Mac** | `docker-compose.edge-apps.mac.yml` | CMS `:3000`, `AGENT_CMS_EDGE_HTTP_GATE=1`, `AGENT_CMS_PUBLIC_DOMAIN=localhost` → `http://qwenpaw.localhost:3000`, `http://all.localhost:3000` |

MCP: **`platform_apps_edge_list`** → `GET /api/platform/apps/edge`. Control: блок **Edge-приложения** в мониторинге.

| Host | Куда |
|------|------|
| `https://ваш-домен/` | CMS (как раньше) |
| `qwenpaw.ваш-домен` | контейнер [`agentscope/qwenpaw`](https://hub.docker.com/r/agentscope/qwenpaw) :8088 |
| `all.ваш-домен` | статический каталог «Все» |
| `blabla.ваш-домен` | **заглушка** «сервис не найден» (не CMS) |

Локально с **`AGENT_CMS_PUBLIC_DOMAIN=localhost`**: `http://qwenpaw.localhost/`, `http://all.localhost/`, `http://foo.localhost/` → заглушка.

DNS (prod): `*.ваш-домен` → A на VPS. Новый edge-app ≈ сервис в **`docker-compose.edge-apps.yml`** + блок в **`docs/deploy/docker-Caddyfile.edge`**. После правок — **`agent-cms-cli restart`**.

**HTTPS wildcard** (один LE cert на `*.domain`) — DNS-01 у регистратора, позже. Известные host (`maptex.ru`, `qwenpaw.`, `all.`) — Let's Encrypt. Случайный `foo.domain` — заглушка только по **HTTP**; по HTTPS без wildcard cert не обслуживается (намеренно: wildcard site в Caddy ломает LE на известных поддоменах).

**Если после правок Caddy «всё упало»** (пустой ответ, TLS без сертификата):

1. `git pull`, проверить `.env`: `AGENT_CMS_PUBLIC_DOMAIN=maptex.ru`, `AGENT_CMS_EDGE_APPS=1`, `AGENT_CMS_CADDY_EMAIL=…`.
2. Валидация конфига (edge overlay):
   ```bash
   cd /opt/agent-cms
   docker compose -f docker-compose.linux.yml -f docker-compose.workspace-mounts.yml -f docker-compose.edge-apps.yml run --rm caddy caddy validate --config /etc/caddy/Caddyfile
   ```
3. `agent-cms-cli restart` (или `--force-recreate caddy`).
4. Если HTTPS всё ещё с «Caddy Local Authority» — пересоздать volume сертификатов и снова поднять Caddy (Let's Encrypt перевыпустит):
   ```bash
   docker compose -f docker-compose.linux.yml -f docker-compose.workspace-mounts.yml -f docker-compose.edge-apps.yml stop caddy
   docker volume rm agent-cms_caddy-data agent-cms_caddy-config 2>/dev/null || true
   docker compose -f docker-compose.linux.yml -f docker-compose.workspace-mounts.yml -f docker-compose.edge-apps.yml up -d caddy
   ```
5. **Аварийно без edge:** `AGENT_CMS_EDGE_APPS=0` в `.env` → `restart` (базовый `docker-Caddyfile`, только apex CMS).

**Ручная проверка:** mic/WebRTC в `/app-chat` по HTTPS с телефона.

Перенос: **`./workspaces`**, **`./.agent-cms-global`**, `.env` → новый сервер → `linux.yml up`. (Старые Docker volumes `cms-workspaces` / `cms-global` — скопируйте в эти папки на хосте.)

## Docker workspace mounts

Несколько каталогов с workspace на хосте (Desktop, Downloads, второй диск) без правки **`docker-compose.mac.yml`** / **`docker-compose.linux.yml`**.

| Артеfact | Назначение |
|----------|------------|
| **`.agent-cms-global/workspace-mounts.json`** | Список корней (источник правды) |
| **`docker-compose.workspace-mounts.yml`** | В git; CMS дописывает `cms`/`mcp` volumes при сохранении списка |

**По умолчанию:** `./workspaces` → `/app/workspaces` (строка в базовом compose или **`AGENT_CMS_WORKSPACES_DIR`**).

**Доп. папки:** Control → **«Папки хранилищ (Docker)»** или MCP **`platform_workspace_mounts_list`** / **`platform_workspace_mounts_write`** (write — app-lock). После сохранения — **рестарт** cms/mcp:

```bash
docker compose -f docker-compose.mac.yml -f docker-compose.workspace-mounts.yml up -d
# Linux:
docker compose -f docker-compose.linux.yml -f docker-compose.workspace-mounts.yml up -d
```

`npm run cms:start` / **`docker-mac-lib.sh`** и **`docker-prod-up.sh`** всегда подключают второй `-f`. На Mac для совпадения путей в manifest удобно mount **1:1** (`/Users/you/ws:/Users/you/ws`).

Discover в Docker сканирует **только** смонтированные корни (не весь `$HOME`).

## Что внутри образа

| Компонент | Зачем |
|-----------|--------|
| **Node 22** | CMS, MCP, Control |
| **git** | «Обновить» в Control (`git pull` на хосте через mount) |
| **python3**, **ffmpeg** | скрипты, медиа |
| **jq**, **rsync**, **curl**, **bash** | ops, health, deploy |
| **g++**, **make**, **pkg-config** | сборка native-модулей (better-sqlite3, sharp) при `docker build` |
| **Docker CLI + Compose plugin** | Control: `docker compose up/stop/restart` через socket хоста |

**Не в образе:** Electron, **openssh-client** (пока не нужен — для `git pull` используйте **HTTPS** remote; SSH добавим в образ, если понадобится).

## Control: compose-кнопки

В контейнере `control`: `AGENT_CMS_DOCKER_OPS=1`, `/var/run/docker.sock`.

| Кнопка в UI | Действие |
|-------------|----------|
| **Compose up** | `docker compose up -d cms mcp` |
| **Stop cms** | `docker compose stop cms` |
| **Restart cms** | `docker compose restart cms mcp` |
| **Pull + build** | `git pull` на хосте → `compose up -d --build` (если включено) |

Control и Caddy **не** останавливаются кнопкой Stop. Полный down — с хоста: `docker compose … down`.

## Обновление с VPS (Control)

Кнопка **Pull + build**, только после **app-lock**:

1. `git pull --ff-only` в `AGENT_CMS_HOST_PROJECT` (mount `/host-project`)
2. `docker compose up -d --build` (лог: `.run/deploy-update.log`)

`.env`: `AGENT_CMS_DEPLOY_UPDATE_ENABLED=1`, опционально `AGENT_CMS_DEPLOY_GIT_REMOTE`, `AGENT_CMS_DEPLOY_GIT_BRANCH`, `AGENT_CMS_DEPLOY_SKIP_PULL=1`.

Конфиг — **`.env` в git** на хосте; `.env.example` — схема ключей. Секреты не запекаются в образ.
