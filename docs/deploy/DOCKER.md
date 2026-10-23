# Docker — только 3 файла

| Файл | Где |
|------|-----|
| `docker-compose.mac.yml` | Mac, WSL |
| `docker-compose.linux.yml` | VPS |
| `docker-compose.windows.yml` | заготовка (→ WSL + mac) |

## Linux VPS

```bash
cp .env.example .env   # APP_LOCK_*, AGENT_CMS_MCP_TOKEN, AGENT_CMS_PUBLIC_DOMAIN, AGENT_CMS_CADDY_EMAIL, AGENT_CMS_PUBLIC_URL
docker compose -f docker-compose.linux.yml up -d --build
# или
npm run docker:linux
```

Остановить стек на хосте:

```bash
npm run docker:down:linux
# или scripts/docker-linux-down.sh
```

## Mac

```bash
docker compose -f docker-compose.mac.yml up -d --build
npm run docker:mac
npm run docker:down
```

Перенос: volumes + `.env` → новый сервер → `linux.yml up`.

## Electron и Docker

- **Сервер (CMS, MCP, Control в браузере, Caddy)** — в Docker на VPS или локально через `docker-compose.mac.yml`.
- **Desktop (.app)** — Editor, Control, Shell, Commander на Mac **вне** образа: нативные Electron-приложения подключаются к **URL** (`AGENT_CMS_PUBLIC_URL`, `https://maptex.ru/…` или `https://localhost:…`).
- На VPS Node на хост **не нужен** — только Docker Engine + `.env`.

## Control: кнопки старт / стоп / рестарт

В контейнере `control` включено `AGENT_CMS_DOCKER_OPS=1` и смонтирован `/var/run/docker.sock`.

| Кнопка в UI | Действие |
|-------------|----------|
| **Старт CMS** | `docker compose up -d cms mcp` (сервисы из `AGENT_CMS_DOCKER_UP_SERVICES`) |
| **Стоп CMS** | `docker compose stop cms` |
| **Рестарт CMS** | `docker compose restart cms mcp` |

Control и Caddy **не** останавливаются кнопкой «Стоп CMS». Полный down — с хоста: `docker compose … down`.

## В образе (apt)

Node 22 (base image), bash, curl, **git**, **python3**, **ffmpeg**, **jq**, **rsync**, **openssh-client**, build-essential, **Docker CLI** + Compose plugin (Control → compose на хосте).

Секреты и домен — только в `.env` на хосте, не в образе.
