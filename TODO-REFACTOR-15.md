# Рефакторинг — часть 15 (набросок)

😊😊😊😊 Пиши туда в самом начале

---

## Вопрос 1 — одна «дверь», роуты, реестр, base URL

**Статус (код):** реестр `lib/platform/platform-apps.js`, `GET /api/platform/apps`, MCP `platform_apps_list`, роуты `/app-*`, редиректы `/control`→`/app-control`, `/mcp`→`/app-mcp`, прокси `/app-mcp`→MCP, dropdown **Apps** в Editor. Остаётся: полный single-process без internal ports, smoke по 1.4.

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
| `chat` | `/app-chat` | ui | Agent CMS Voice (Flow / chat) | voice :3088 → proxy | да |
| `commander` | `/app-commander` | ui | Commander | `server.js` :3188 → proxy | да |
| `control` | `/app-control` | ui | Agent CMS Control (Launcher) | control UI → proxy (было `/control/`, :3288) | да |
| `mcp` | `/app-mcp` | api | Agent CMS MCP (агенты) | `mcp-server/http.js` → proxy | нет (API; ссылка для коннектора) |

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
> - 💡 Smoke-тесты: три сценария (localhost, domain, IP) в `refactor-14-boot-check` или отдельный скрипт.
> - ⚠️ IP + HTTPS: Let's Encrypt на голый IP часто **не работает** — только HTTP или свой сертификат.

### 1.5 Один адрес, два порта (HTTP / HTTPS)

> **NOTE**
> - ✅ Prod: **80 → redirect → 443**.
> - 💡 Dev Mac: можно один HTTP; HTTPS опционально (mkcert / `:3443`).
> - 💡 Не смешивать «один адрес» с «десять path» — один **host**, много **path** (`/`, `/app/...`, `/mcp`).

---

## Вопрос 2 — Docker как база

**Статус (код):** образ (git, python3, ffmpeg, jq, rsync, openssh-client, Docker CLI); Control при `AGENT_CMS_DOCKER_OPS=1` — `up/stop/restart` через `lib/ops/docker-compose-ops.js`; probe по `CMS_API_URL` / MCP health; bootstrap `deployment`; UI «Старт/Стоп/Рестарт CMS» + подсказки compose; `docs/deploy/DOCKER.md`; скрипты `docker-prod-up.sh`, `docker-linux-down.sh`, `docker-mac-down.sh`.

- Как будет работать **Electron**, если каждое приложение…?
- Всё через Docker, **не** ставить Node на хост «вручную».
- В образ: git, Python, что ещё — полный список.
- Mac Docker — **`welcome.command` / `install.command`** → `scripts/docker-mac-*.sh`; README/DOCKER.md обновлены.
- Подняли / опустили Docker.
- Кнопки **старт / стоп / рестарт** в Control — что делают после перехода на Docker?

> **NOTE**
> - ✅ **Prod/VPS:** только `docker-compose.linux.yml` (+ `.env` на хосте).
> - 🍎 **Electron (Mac):** **вне** Docker — нативные `.app` (Editor/Control/Shell); они ходят на **URL** (localhost или VPS). В Docker — **серверная** часть, не замена Electron.
> - ✅ **Mac server:** только **`docker-compose.mac.yml`** (как VPS). `install.command` / `npm start` — legacy, не канон.
> - 📦 **Уже в Dockerfile:** Node 22, bash, curl, git, ffmpeg, python3, build-essential, **Docker CLI** (Control → restart cms). **Git** уже есть.
> - 💡 Опционально в образ: `openssh-client` — только если Control делает `git pull` по SSH.
> - 🎛️ **Кнопки Control:** при `AGENT_CMS_DOCKER_OPS=1` → `docker compose restart/start/stop cms` (уже так). Переименовать в UI: «Контейнер CMS», не «npm start».
> - ⚠️ Control-контейнер с **docker.sock** — только на доверенном хосте.

---

## Вопрос 3 — кнопка «Обновить» в Control (= git pull)

**Статус (код):** action `server-update` → `deploy-update` (`lib/ops/ops-deploy-update.js`); git pull + compose `up -d --build`; app-lock; commit до/после в журнале; mount `AGENT_CMS_HOST_PROJECT` в control; DOCKER.md.

Рядом с Restart — по сути git pull.

> **NOTE**
> - ✅ Полезно на VPS.
> - 💡 Не голый `git pull` на хост без контекста: **`git pull` → `docker compose up -d --build`** (или pull image из registry).
> - ⚠️ Только после **app-lock**; опционально: ветка/tag, не auto-pull `main` на prod.
> - 💡 Лог в Journal: commit до/после, ошибка merge.

---

## Вопрос 4 — MCP-редактор `.env` + ревью всех ключей

**Статус (код):** `lib/ops/platform-root-env.js`; **`platform_env_keys_list`** = example + current в одном ответе; read/write одного ключа; write — app-lock.

> **NOTE**
> - ✅ Control по-прежнему: GET/POST `/api/ops/env-file` (весь файл).
> - 💡 Отдельный `docs/env-reference.md` — опционально; сейчас источник — `.env.example`.
> - ⚠️ **`platform_env_key_write`** через MCP нужна **app-lock** сессия (как ops/env-file).

---

## Вопрос 5 — закрытие паролем (app-lock по зонам)

**Статус (код):** **`APP_LOCK_APPS=control`** (список `editor,chat,commander,control`); `lib/auth/app-lock-apps.js`; `/api/app-lock/status` → `lockedApps` + `apps[]`; Editor/Shell app-lock по appId; Control ops — если `control` в списке. Без `APP_LOCK_APPS` — legacy `editor,control`.

По умолчанию только launcher (`…/app-lancher`). Отдельно launcher / editor / агенты?

> **NOTE**
> - ✅ Один пароль **`APP_LOCK_*`**, зоны — **`APP_LOCK_APPS`** (как `platform_apps_list`, без `mcp`).
> - 💡 Commander: lock в env есть; UI lock на commander — позже (пока только control/editor/chat через app-lock.js).
> - ⚠️ MCP — **`AGENT_CMS_MCP_TOKEN`**, не app-lock UI.

---

## Вопрос 6 — источники / instances (обсуждение отдельно)

Теория «всё это»; Source вместо instances; имя `local:ws-aya` — разделитель; можно ли на сервере подключаться напрямую через **node** — на prod **должно быть недоступно** (и на компе, и на сервере?).

> **NOTE**
> - 💡 Именование source: **`local`** / **`remote`** + **`:`** + workspace id — **`local:ws-aya`** ок; документировать в glossary.
> - ✅ **MCP для агентов (Mac, VPS, любой хост):** только **HTTP(S) URL** (`/app-mcp` или legacy `/mcp`) + **`Authorization: Bearer AGENT_CMS_MCP_TOKEN`**. CMS уже запущен — подключаемся к нему; отдельного «запуска платформы» через MCP нет.
> - ⚠️ **stdio** (`node mcp-server/index.js`) — **не** рекомендуемый путь: локальный sidecar для старых коннекторов без HTTP MCP. В prod-доке и UI — **не** как равноправная альтернатива URL.
> - ⚠️ «Node напрямую на сервере» = обход Docker и политики — **выключить** в prod-доке; локально — только осознанный dev без Docker.
> - 📌 Обсуждение отложено — вынести в отдельный `TODO-REFACTOR-15-Q6.md` когда будет набросок модели instances/sources.
