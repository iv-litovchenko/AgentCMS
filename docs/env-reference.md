# Справочник ключей `.env`

**`platform_env_keys_list`**: для каждого ключа — **`example`** (из `.env.example`, схема) и **`current`** (из **`.env` в репозитории**). Whitelist для read/write — ключи из example.

Чтение/запись одного ключа: **`platform_env_key_read`** / **`platform_env_key_write`** (write — app-lock).  
Полный файл в Control: **`/api/ops/env-file`**.

Устаревшие имена (не задавать): `PORT`, `TLS_PORT`, `MAPTEX_DOMAIN`, `CADDY_EMAIL`, `AGENT_CMS_BASE_URL` как главный URL → **`AGENT_CMS_PUBLIC_URL`**.
