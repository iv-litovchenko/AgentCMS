# Edge-сервисы — данные на диске

Служебный каталог под **runtime** контейнеров (QwenPaw, позже Hermes и др.), не vault CMS.

```
workspaces/0-services-data/
└── qwenpaw/          → Docker /app/working
    ├── _secret/      → /app/working.secret
    └── _backups/     → /app/working.backups
```

Env: **`AGENT_CMS_SERVICES_DATA_DIR=0-services-data`** (имя этой папки).  
Содержимое `qwenpaw/` (кроме `_secret` / `_backups`) **не в git** — только на сервере/локально.
