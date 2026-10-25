# Рефакторинг — часть 15 (набросок)

😊😊😊😊 Пиши туда в самом начале

| Q | Тема | Статус |
| --- | --- | --- |
| 1 | Одна дверь `/app-*` | ✅ закрыто |
| 2 | Docker как база | ✅ закрыто |
| 3 | Обновить в Control | ✅ закрыто |
| 4 | `.env` + MCP keys | ✅ закрыто |
| 5 | App-lock | ✅ закрыто |
| 6 | Instances / источники | 📌 пока без полной модели |
| 7 | Electron | 📌 решение зафиксировано |
| 8 | Mount хранилищ / «не видно ws» | ✅ закрыто |
| 9.1 | Установщик Mac / Windows / Linux | ✅ v1 (`scripts/install.sh`, без npm) |
| 9.2 | CLI `agent-cms` (вместо raw compose/git) | ✅ v1 (`scripts/agent-cms` + symlink) |

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

**Статус (пока):** без полноценных **instances** — два **коннектора MCP** в Control (local + server, просмотр); создание workspace — поле **«источник»** в Editor (`environment`: `local` | `production` = server в UI).

Теория «всё это»; Source вместо instances; имя `local:ws-aya` — разделитель.

> **NOTE**
> - 💡 Именование source: **`local`** / **`server`** (в реестре `production`) + **`:`** + workspace id — **`local:ws-aya`** — справочно для агента (Q6).
> - ✅ **MCP:** только **HTTP** `…/app-mcp` + **Bearer** — в UI Control и JSON-конфиге; **stdio / node mcp-server** в prod и в гайде Control **не показываем**.
> - 📌 Редактирование `instances.json` и коннекторов — **скоро**; старые идеи instances/tunnel — в `TODO.MCP-INSTANCES.md`.
> - 📌 Полная модель — отдельный `TODO-REFACTOR-15-Q6.md` позже.

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

## ✅ Вопрос 8 — не видно хранилищ (`ws-aya`, `ws-medsente`, `DOWNLOADWS`)

**Статус:** ✅ **закрыто.** Один дефолтный корень + **доп. mount-корни** через Control / MCP; базовый compose не трогаем.

**Канон (Docker):**

- Дефолт: **`./workspaces`** → `/app/workspaces` (или **`AGENT_CMS_WORKSPACES_DIR`** в `.env`).
- Доп. каталоги на хосте: **`.agent-cms-global/workspace-mounts.json`** + **`docker-compose.workspace-mounts.yml`** → второй `-f` при `compose up`; UI **Control «Папки хранилищ (Docker)»**; MCP **`platform_workspace_mounts_list`** / **`platform_workspace_mounts_write`** (write — app-lock). Док: **`docs/deploy/DOCKER.md`** (#docker-workspace-mounts), **README** (.env).
- Discover в контейнере — **только смонтированные** корни (не весь Mac).

**Если id всё ещё не видно** (операционный чеклист, не баг UI):

```
├─ A. Папки не смонтированы → добавить корень в workspace-mounts + restart stack
├─ B. Папка есть, нет manifest → workspaces_scan / workspace_register
├─ C. Реестр .agent-cms-global устарел после миграции с named volumes
└─ D. Индекс → rebuild при необходимости
```

```bash
ls ./workspaces
docker compose -f docker-compose.mac.yml exec cms ls /app/workspaces
```

> **NOTE**
> - ✅ Решение зафиксировано; доработки — только по операционному чеклисту ниже (mount / register / индекс).
> - 💡 Q6: **`local:ws-id`** — справочный source, не заменяет mount на диске.

---

## Вопрос 9.1 — установщик (Mac / Windows / Linux)

**Статус:** ✅ **v1** — [`scripts/install.sh`](scripts/install.sh), GitHub `curl | bash`; Windows [`install.ps1`](scripts/install.ps1) → WSL. **Без npm.**

**Цель:** одна (или три короткие) команды «скачать и поставить»; пользователь **не** клонирует репо руками.

| ОС | Куда ставим код | Compose-файл |
| --- | --- | --- |
| **macOS** | `~/agent-cms` (`/Users/<user>/agent-cms`) | `docker-compose.mac.yml` |
| **Linux** | `~/agent-cms` (`/home/<user>/agent-cms`) | `docker-compose.mac.yml` / linux |
| **Linux VPS** | `/opt/agent-cms` (`install.sh --vps`) | `docker-compose.linux.yml` |
| **Windows** | `%USERPROFILE%\agent-cms` или WSL `~/agent-cms` | `docker-compose.windows.yml` |

**Установщик делает:** detect OS → `git clone` / `pull` → symlink **`agent-cms`** → подсказка **`rebuild` / `start`** (Docker **не** обязателен на этом шаге). Опция **`--start`** — сразу rebuild/start, если Docker Running.

**Каналы доставки (черновик):**

- **Unix:** `curl -fsSL …/install.sh | bash` (Mac + Linux).
- **Windows:** `install.ps1` / winget / installer (решить: native Docker Desktop vs WSL2-only).
- **Позже:** Homebrew cask/tap (Mac), optional `.deb` — обёртка над тем же скриптом.
- **Не делаем:** publish в npm (CLI = symlink на bash в репо).

**Артефакты:** ✅ `scripts/install.sh`, `scripts/install.ps1`, README.

> **NOTE**
> - 💡 Q9.2 ставит бинарь **`agent-cms`** в PATH; установщик 9.1 может вызывать его или положить shim.
> - 💡 Согласовано с Q2; `curl | bash` — только доверенный URL.

---

## Вопрос 9.2 — CLI `agent-cms` (вместо длинных compose/git-команд)

**Статус:** ✅ **v1** — [`scripts/agent-cms`](scripts/agent-cms) + [`agent-cms-cli-lib.sh`](scripts/agent-cms-cli-lib.sh); PATH через install.sh.

**Имя команды (канон):** бинарь **`agent-cms`** (alias **`agent cms`** — опционально через shell-completion / второй symlink).

**CLI знает:** где лежит install root (config `~/.config/agent-cms/config.json` или env **`AGENT_CMS_HOME`**), какой compose-файл для текущей ОС, public URL из `.env`.

**Группы команд (черновик дерева — см. ответ в чате / финализировать здесь):**

| Группа | Примеры | Заменяет |
| --- | --- | --- |
| **info** | `version`, `doctor`, `paths`, `status` | ручные проверки Docker/портов |
| **lifecycle** | `start`, `stop`, `restart`, `logs`, `ps` | `docker compose … up/down/logs/ps` |
| **build** | `rebuild`, `pull` (images) | `cms-rebuild.command`, `--build` |
| **update** | `update` (= pull git + rebuild) | Control «Обновить» / Q3 с терминала |
| **open** | `open editor`, `open control`, `open chat` | копипаст URL |
| **config** | `env show`, `env set KEY` (?) | ops/env — осторожно, app-lock |
| **install** | `install`, `uninstall` (?) | делегат в 9.1 |

**Не в v1 CLI:** полный MCP, правка workspaces — остаётся Editor/Control/MCP.

### Q9.2 — что уже в CLI (v1)

Day-to-day Docker на Mac/Linux: **`agent-cms start|stop|restart|down|rebuild|update|logs|ps`** — обёртки над `docker-mac-*.sh`, `docker-prod-up.sh`, compose + `workspace-mounts`. **`env show/set`**, **`uninstall [--purge]`** — [`agent-cms-env-cli.js`](scripts/agent-cms-env-cli.js) + bash.

**Запасной путь (не удалять):** `cms-*.command`, **`npm run docker:*`** ([package.json](package.json)).

### Q9.2 — что не перенесено (пока только старые пути)

| Пробел | Сейчас |
| --- | --- |
| **Control «Обновить»** (`deploy-update`, app-lock, journal) | CLI **`update`** = только `git pull --ff-only` + rebuild, **не** тот же HTTP-ops (Q3) |
| **Legacy npm-стек** | `AGENT_CMS_WELCOME_LEGACY`, **`agent-cms-stack.sh`** — не в CLI |
| **app-lock на CLI `env set`** | запись в `.env` с хоста без пароля (доверенный оператор); MCP/Control — с lock |

**TODO (v1.1):**

- [x] **`agent-cms down`** — compose down + `workspace-mounts`.
- [ ] **`agent-cms update`** — выровнять с Q3: опционально deploy-update (app-lock, лог).
- [x] **`env show` / `env set`** — Node + `platform-root-env.js` (whitelist `.env.example`).
- [x] **`uninstall`** — symlink + config; **`--purge`** = down stack, репо вручную.
- [ ] Legacy welcome/stack — **`agent-cms legacy …`** (низкий приоритет).

**Артефакты:** ✅ bash CLI + `agent-cms-env-cli.js`; install.sh → `~/.local/bin/agent-cms`. Позже: completion, update≈Q3.

> **NOTE**
> - 💡 **`agent-cms update`** должен совпадать по политике с Q3 (`--ff-only`, app-lock на prod).
> - 💡 Windows: тот же бинарь (Node) или `agent-cms.cmd` wrapper.

```
📦 9.1 Установщик
├── 🍎 mac     → install.sh → ~/agent-cms
├── 🐧 linux   → install.sh → ~/agent-cms (VPS: --vps → /opt/agent-cms)
├── 🪟 windows → install.ps1/WSL   → Projects или WSL /opt
└── 🎯 итог    → clone + CLI; stack вручную agent-cms rebuild/start

🖥️ 9.2 CLI agent-cms
├── ℹ️  info       → version · doctor · paths · status
├── ▶️  lifecycle  → start · stop · restart · logs · ps
├── 🔨 build       → rebuild · (pull images)
├── ⬆️  update      → update (= git pull + compose build, как Q3)
├── 🌐 open        → editor · control · chat · mcp-url
├── ⚙️  config      → env show · (env set — позже, lock)
└── 📥 install     → install · uninstall (→ 9.1)
```