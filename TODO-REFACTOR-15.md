# Рефакторинг — часть 15 (набросок)

😊😊😊😊 Пиши туда в самом начале

---

## ✅ Вопрос 1 — одна «дверь», роуты, реестр, base URL

**Статус:** ✅ **закрыто.** Реестр, `/app-*`, legacy-редиректы, прокси control/mcp/commander, chat на CMS, `AGENT_CMS_SINGLE_HTTP_DOOR`, extension → `/app-chat`, Caddy → только `cms:3000`, smoke **`npm run check:app-door`** (статика 1.4: localhost/domain/IP + live).

> **NOTE**
> - 💡 **WebRTC/mic** — разовая ручная проверка на HTTPS (см. DOCKER.md); на закрытие Q1 не блокирует.
> - 💡 **Dev:** `AGENT_CMS_EXPOSE_INTERNAL_PORTS=1` — отдельные порты 3088/3288/3490.

---

### 1.1 Отказ от кучи портов — только HTTP + HTTPS

ОДНА ДВЕРЬ НА ВСЕ: отказываемся от такого количества портов, снаружи всего два — HTTP и HTTPS.

> **NOTE**
> - ✅ Направление верное: **prod уже так** (Caddy 80/443 → cms/mcp внутри Docker).
> - 💡 Внутри compose процессы могут слушать 3000/3490 и т.д. — **наружу не светим**.
> - ⚠️ Voice/chat (WebRTC, mic) — проверить, что после схлопывания портов **не ломается** `/app-chat` или отдельный path.

### 1.1.1 `app` или `door`?

Какое слово лучше — app? Или door?

Идея: префикс в роутере `app-*`:

- `https://localhost:3000/` — по умолчанию editor (можно не вписывать)
- `https://localhost:3000/app-chat` (shell)
- `https://localhost:3000/app-commander`
- `https://localhost:3000/app-mcp`
- `https://localhost:3000/app-lancher`

Подняли один раз — все приложения работают.

#### Канон: платформенные приложения (`app-*`)

Один **public host** (из `AGENT_CMS_PUBLIC_URL`); снаружи только **HTTP + HTTPS**. Путь **`app-{id}`** — сегмент URL (через дефис, как в роутере).

| `app_id` | Public path | kind | Название (README) | Сейчас / процесс | В dropdown Editor |
| --- | --- | --- | --- | --- | --- |
| `editor` | `/` | ui | Agent CMS Editor | `server.js` :3000 | — (вы здесь) |
| `chat` | `/app-chat` | ui | Agent CMS Voice (Flow / chat) | shell на CMS; voice :3088 внутри | да |
| `commander` | `/app-commander` | ui | Commander | :3188 внутри → proxy CMS | да |
| `control` | `/app-control` | ui | Agent CMS Control (Launcher) | :3288 внутри → proxy CMS | да |
| `mcp` | `/app-mcp` | api | Agent CMS MCP (агенты) | :3490 внутри → proxy CMS | нет (API; ссылка для коннектора) |

- **Legacy redirect (опц.):** `/control/` → `/app-control`, `/mcp` → `/app-mcp`.
- **Dev-only** (не в public registry или `visible: false`): desktop Electron, browser-extension, toolbar — отдельные клиенты, не path на CMS.

> **NOTE**
> - ✅ Формат **`app-*`** принимаем для всех entry points, **включая MCP** (`/app-mcp`).
> - 💡 **Editor** без префикса — **`/`**, id `editor` только в реестре.
> - ⚠️ Зарезервировать **`app-*`** в роутере CMS, чтобы не пересекаться с workspace paths.
> - ⚠️ **`kind: api`** — не открывать как вкладку в dropdown; показывать URL для Claude/Cursor.

### 1.2 Dropdown приложений в Editor (рядом с языком)

> **NOTE**
> - ✅ UX ок.
> - 💡 Список **только из реестра** (1.3), не хардкод в UI.
> - 💡 Показывать **public URL** (из base URL), не «localhost:3288».

### 1.3 MCP — реестр приложений платформы

MCP со списком приложений: что где работает, по каким адресам открывается, порты (dev), типа реестр с URL.

**Именование MCP** (как в [README.md](README.md): `platform_info_get`, `platform_docs_list`, …):

| Канон | Legacy alias | HTTP (CMS) |
| --- | --- | --- |
| **`platform_apps_list`** | `list_platform_apps` | `GET /api/platform/apps` |

Ответ (кратко): `{ apps: [{ appId, title, kind, publicPath, publicUrl, internalPort?, running? }] }` — строки из таблицы «Канон: платформенные приложения» + вычисленный URL.

> **NOTE**
> - ✅ Реализовать в `mcp-server/lib/platform-tools.js` по образцу `platform_config_list`.
> - 💡 **Prod:** в списке только **publicUrl**; `internalPort` — если dev или явный debug-флаг.
> - 💡 Editor dropdown и Control — **тот же** `/api/platform/apps`, не дублировать JSON.

### 1.4 Название сайта + адрес проекта (переезд)

Параметры: название сайта, адрес сайта. Проверить настройку адреса для переезда:

- localhost
- sitename.ru
- IP `000.000.000.000`

> **NOTE**
> - ✅ Одна каноническая **`AGENT_CMS_PUBLIC_URL`** (или `AGENT_CMS_BASE_URL`) + **`AGENT_CMS_SITE_TITLE`**.
> - 💡 Все ссылки в UI/MCP/Control **генерировать только от public URL**.
> - ✅ Smoke 1.4 (public URL matrix): `scripts/refactor-15-app-door-check.js --offline`.
> - ⚠️ IP + HTTPS: Let's Encrypt на голый IP часто **не работает** — только HTTP или свой сертификат.

### 1.5 Один адрес, два порта (HTTP / HTTPS)

> **NOTE**
> - ✅ Prod: **80 → redirect → 443**.
> - 💡 Dev Mac: можно один HTTP; HTTPS опционально (mkcert / `:3443`).
> - 💡 Не смешивать «один адрес» с «десять path» — один **host**, много **path** (`/`, `/app/...`, `/mcp`).

---

## ✅ Вопрос 2 — Docker как база

**Статус:** ✅ **закрыто.** Mac/VPS — compose; канон **Docker + браузер**; Electron — опциональный клиент по URL. Control: подписи **Compose up / Stop cms / Restart**; `docs/deploy/DOCKER.md` (абзац для людей + чеклист образа). **`openssh-client` убран из образа** — pull по HTTPS; SSH в образ позже, если понадобится.

> **NOTE**
> - ⚠️ Control + **docker.sock** — только на доверенном хосте.
> - 💡 Пересборка образа после смены Dockerfile: `docker compose … up -d --build`.

---

## ✅ Вопрос 3 — кнопка «Обновить» в Control (= git pull)

**Статус:** ✅ **закрыто** (достаточно для использования). Код: `server-update` → `deploy-update` (`lib/ops/ops-deploy-update.js`); `git pull --ff-only` + `docker compose up -d --build`; app-lock; commit до/после в `.run/deploy-update.log`; `AGENT_CMS_HOST_PROJECT`; флаг `AGENT_CMS_DEPLOY_UPDATE_ENABLED`; DOCKER.md.

> **NOTE**
> - ✅ Полезно на VPS — сделано.
> - ✅ Не голый `git pull`: pull + compose build — сделано.
> - ✅ Только после **app-lock** — сделано.
> - 💡 Позже по желанию: Journal вместо файла, tag/registry, guard main на prod.

---

## ✅ Вопрос 4 — MCP-редактор `.env` + ревью всех ключей

**Статус:** ✅ **закрыто** (достаточно для использования). Код: `lib/ops/platform-root-env.js`; MCP **`platform_env_keys_list`** / **`platform_env_key_read`** / **`platform_env_key_write`**; HTTP `/api/platform/env-keys`, `/api/platform/env-key`; whitelist из `.env.example`; write + redacted secrets — app-lock.

> **NOTE**
> - ✅ Control: GET/POST `/api/ops/env-file` (весь файл).
> - ✅ **`platform_env_key_write`** — app-lock (как ops/env-file).
> - 💡 Позже по желанию: полный `docs/env-reference.md`, UI по ключам, онбординг в скиллах.

---

## ✅ Вопрос 5 — закрытие паролем (app-lock по зонам)

**Статус:** ✅ **закрыто**. Один пароль **`APP_LOCK_*`**, список зон **`APP_LOCK_APPS`** (`editor`, `chat`, `commander`, `control`); `lib/auth/app-lock-apps.js`; `/api/app-lock/status`; UI lock — Editor, Shell/chat, Commander, Control ops; без `APP_LOCK_APPS` — legacy `editor`+`control`. **MCP** — отдельно **`AGENT_CMS_MCP_TOKEN`**, не app-lock.

> **NOTE**
> - ✅ Список приложений под пароль = id из реестра UI (не `mcp`).
> - 💡 Политика «что в `.env.example` по умолчанию lock» — на усмотрение prod.

---

## Вопрос 6 — источники / instances (обсуждение отдельно)

Теория «всё это»; Source вместо instances; имя `local:ws-aya` — разделитель; можно ли на сервере подключаться напрямую через **node** — на prod **должно быть недоступно** (и на компе, и на сервере?).

> **NOTE**
> - 💡 Именование source: **`local`** / **`remote`** + **`:`** + workspace id — **`local:ws-aya`** ок; документировать в glossary.
> - ✅ **MCP для агентов (Mac, VPS, любой хост):** только **HTTP(S) URL** (`/app-mcp` или legacy `/mcp`) + **`Authorization: Bearer AGENT_CMS_MCP_TOKEN`**. CMS уже запущен — подключаемся к нему; отдельного «запуска платформы» через MCP нет.
> - ⚠️ **stdio** (`node mcp-server/index.js`) — **не** рекомендуемый путь: локальный sidecar для старых коннекторов без HTTP MCP. В prod-доке и UI — **не** как равноправная альтернатива URL.
> - ⚠️ «Node напрямую на сервере» = обход Docker и политики — **выключить** в prod-доке; локально — только осознанный dev без Docker.
> - 📌 Обсуждение отложено — вынести в отдельный `TODO-REFACTOR-15-Q6.md` когда будет набросок модели instances/sources.

---

## Вопрос 7 — Electron (стратегия, кратко)

**Статус:** 📌 **решение зафиксировано**, реализация launcher — по желанию позже.

**Канон после Q1/Q2:** сервер — **Docker** (или dev `npm start`) на **одном host** (`:3000`, path `app-*`). Работа — **браузер** (`/`, `/app-chat`, `/app-control`, …).

**Electron — не замена серверу, а оболочка:** отдельные `.app` (Editor, Shell, Control, Commander) только открывают **те же public URL**, что и вкладки. Без запущенного Docker (или legacy dev-сервера) `.app` **сервер не поднимет** — это клиент.

**Дальше (идея, не обязательство):** один **launcher `.app`** с несколькими окнами на `app-*`, вместо четырёх отдельных Electron-приложений. Существующие `.app` можно **оставить** для привычных пользователей.

**Итог:** архитектура одна (CMS в Docker + single door); Electron опционален — «нативные окна над тем же веб-UI», не отдельный стек.

> **NOTE**
> - ✅ Согласовано с Q2 и `docs/deploy/DOCKER.md` (Electron опционален, URL = браузер).
> - 💡 Dev-only в реестре (Q1): desktop Electron — `visible: false`, не path на CMS.
> - 📌 Задача на потом: единый launcher vs статус-кво — отдельный мини-TODO или пункт в desktop/, когда понадобится.

---

## Вопрос 8 — не видно хранилищ (`ws-aya`, `ws-medsente`, `DOWNLOADWS`)

**Статус:** 📌 **диагностика / чеклист** (не баг Control UI — данные и реестр).

**Факт (Mac + compose):** CMS видит только то, что лежит в **`./workspaces`** репозитория (mount `→ /app/workspaces`). Если папок `ws-aya` / `ws-medsente` / `DOWNLOADWS` там нет — в Editor / `workspaces_list` их не будет.

```
Почему не видно ws-aya / ws-medsente / DOWNLOADWS
│
├─ A. Данные не в том каталоге (часто)
│   ├─ лежат на Mac в другом пути или в старом Docker volume `cms-workspaces`
│   └─ → скопировать / symlink в `YamlCMS/workspaces/<id>/`
│
├─ B. Docker mount
│   ├─ контейнер видит только `./workspaces` хост-проекта
│   └─ → положить папки туда или добавить volume в compose
│
├─ C. Папка есть, но нет в реестре CMS
│   ├─ недостаточно «просто папка на диске» — нужен manifest / register
│   └─ → `workspaces_scan` → `workspace_register` (MCP или UI)
│
├─ D. Смотрим не тот UI
│   ├─ Control ≠ дерево хранилищ
│   └─ → Editor, MCP `workspaces_list`, настройки workspace
│
└─ E. Индекс / кэш
    └─ → после появления папок: scan + rebuild indexes при необходимости
```

**Быстрая проверка:**

```bash
ls ./workspaces
docker compose -f docker-compose.mac.yml exec cms ls /app/workspaces
```

Если id нет в **обоих** списках — сначала **A/B**, затем **C**.

> **NOTE**
> - 💡 Связь с Q6: имена вида **`local:ws-aya`** — про source/instance, не заменяют физический каталог в `workspaces/`.
> - ⚠️ `.agent-cms-global` — отдельный mount; реестр workspace может ссылаться на id, которого нет на диске после миграции с named volumes.
