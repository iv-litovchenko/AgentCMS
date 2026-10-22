# Docker — только 3 файла

| Файл | Где |
|------|-----|
| `docker-compose.mac.yml` | Mac, WSL |
| `docker-compose.linux.yml` | VPS |
| `docker-compose.windows.yml` | заготовка (→ WSL + mac) |

## Linux VPS

```bash
cp .env.example .env   # APP_LOCK_*, AGENT_CMS_MCP_TOKEN, MAPTEX_DOMAIN, CADDY_EMAIL
docker compose -f docker-compose.linux.yml up -d --build
```

## Mac

```bash
docker compose -f docker-compose.mac.yml up -d --build
```

`npm run docker:mac` · `npm run docker:linux`

Перенос: volumes + `.env` → новый сервер → `linux.yml up`.
