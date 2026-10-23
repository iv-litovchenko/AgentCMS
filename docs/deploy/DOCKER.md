# Docker — только 3 файла

| Файл | Где |
|------|-----|
| `docker-compose.mac.yml` | Mac, WSL |
| `docker-compose.linux.yml` | VPS |
| `docker-compose.windows.yml` | заготовка (→ WSL + mac) |

## Mac = Docker + браузер (канон)

1. **Docker Desktop** + `.env` в репозитории.
2. Поднять стек: **`docker-start.command`** / `npm run docker:start` (первый раз или после кода — **`docker-rebuild.command`** / `npm run docker:rebuild`).
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

| Действие | npm | Двойной клик (Mac) |
|----------|-----|---------------------|
| Старт | `npm run docker:start` | `docker-start.command` |
| Стоп cms/mcp | `npm run docker:stop` | `docker-stop.command` |
| Рестарт | `npm run docker:restart` | `docker-restart.command` |
| Пересобрать образы | `npm run docker:rebuild` | `docker-rebuild.command` |
| Полный down | `npm run docker:down` | — |

`npm run docker:mac` = **`docker:rebuild`** (как раньше, с `--build`).

Снаружи один адрес (`AGENT_CMS_PUBLIC_URL`); порты 3088/3288/3490 — **только внутри** compose.

### Одна дверь (`app-*`)

| Путь | Приложение |
|------|------------|
| `/` | Editor |
| `/app-chat` | Voice / shell |
| `/app-commander` | Commander |
| `/app-control` | Control (Launcher) |
| `/app-mcp` | MCP HTTP (Cursor + Bearer) |

Mac: с хоста публикуется только **3000** (плюс mount `./public` для UI без rebuild). VPS: **80/443**. Проверка: `npm run check:app-door`. После смены домена/IP — `AGENT_CMS_PUBLIC_URL` в `.env` и restart `cms`.

**Ручная проверка:** mic/WebRTC в `/app-chat` по HTTPS с телефона.

Перенос: volumes + `.env` → новый сервер → `linux.yml up`.

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
