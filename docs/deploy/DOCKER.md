# Agent CMS — Docker

## Быстрый старт

```bash
cp .env.example .env   # APP_LOCK_*, AGENT_CMS_MCP_TOKEN
docker compose up -d --build
```

| Сервис | URL |
|--------|-----|
| Editor | http://localhost:3000 |
| Control | http://localhost:3288 |
| MCP | http://localhost:3490/mcp |

Данные: volumes `cms-workspaces`, `cms-global`.

## HTTPS (maptex.ru)

```bash
export MAPTEX_DOMAIN=maptex.ru
docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build
```

Порты **80/443** на хосте. DNS → IP сервера.

## Зависимости в образе

- Node **22**
- **build**: make, g++, pkg-config (native npm-модули)
- **runtime**: bash, curl, git, lsof, ffmpeg, Python 3 (+ venv/pip для опционального STT)
- **Control**: Docker CLI + Compose plugin (управление контейнером `cms` через `/var/run/docker.sock`)

## Control и два процесса

- **cms** — `server.js` (`CONTROL_AUTOSTART=0`)
- **control** — `control-server.js` (:3288), кнопки старт/стоп → `docker compose start|stop|restart cms`

## Полезные команды

```bash
docker compose ps
docker compose logs -f cms
docker compose restart cms
docker compose down
```
