# VPS: HTTPS (Let's Encrypt) + Caddy для Agent CMS

Домен **maptex.ru** → IP VPS. Caddy сам получает и продлевает сертификат.

## 1. DNS

- `maptex.ru` → **A** → IP VPS (например `201.34.158.135`)
- Подождать 5–30 мин, проверить: `dig +short maptex.ru`

## 2. Фаервол

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Порты **3000 / 3288 / 3490** наружу **не открывать** — только через Caddy.

## 3. Caddy (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

## 4. Конфиг

Из корня репозитория на VPS:

```bash
sudo cp docs/deploy/caddy-maptex.Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable caddy
sudo systemctl reload caddy
```

## 5. Agent CMS (localhost)

```bash
cd /path/to/YamlCMS
# .env: APP_LOCK_*, AGENT_CMS_MCP_TOKEN=...
HOST=127.0.0.1 CONTROL_HOST=127.0.0.1 ./scripts/agent-cms-http-service.sh start
```

MCP HTTP (второй процесс или systemd unit):

```bash
AGENT_CMS_BASE_URL=http://127.0.0.1:3000 AGENT_CMS_MCP_HTTP_HOST=127.0.0.1 npm run mcp:http
```

## 6. Проверка

```bash
curl -I https://maptex.ru/
curl -I https://maptex.ru/mcp
```

- Браузер: **https://maptex.ru/** — Editor (app-lock)
- Claude connector: **https://maptex.ru/mcp** + Bearer **`AGENT_CMS_MCP_TOKEN`**

## 7. Логи Caddy

```bash
sudo journalctl -u caddy -f
```

Если сертификат не выдаётся: DNS ещё не доехал, порт 80 закрыт, или другой процесс слушает :80.
