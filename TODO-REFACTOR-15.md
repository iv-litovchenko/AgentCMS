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
| 7 | Electron | ==✅ закрыто (v1)== — URL-shell, offline UI, `electron-app build/shortcuts`, pack `shared/`; 7.4 поддомены · единый launcher — отложено |
| 8 | Mount хранилищ / «не видно ws» | ✅ закрыто |
| 9.1 | Установщик Mac / Windows / Linux | 🟡 v1 закрыто (`install.sh`; Windows/WSL; v1.1 — native) |
| 9.2 | CLI `agent-cms` (вместо raw compose/git) | 🟡 v1 закрыто (lifecycle/rebuild; v1.1 — update≈Q3, env lock) |
| 10 | Edge-приложения на поддоменах (Caddy + compose) | 🟡 v0 — qwenpaw + `all.*` + заглушка `*.domain` |

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
| **`platform_services_list`** | — | `GET /api/platform/services` |

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

## ✅ Вопрос 7 — Electron (стратегия, кратко)

**Статус:** ==✅ **закрыто (v1).**== Клиенты `.app` по URL; offline, сборка, ярлыки. **Отложено:** поддомены (7.4), единый launcher, local vs prod в UI (7.5).

**Канон после Q1/Q2:** сервер — **Docker** (или dev `npm start`) на **одном host** (`:3000`, path `app-*`). Работа — **браузер** (`/`, `/app-chat`, `/app-control`, …).

**Electron — не замена серверу, а оболочка:** отдельные `.app` (Editor, Shell, Control, Commander) только открывают **те же public URL**, что и вкладки. Без запущенного Docker (или legacy dev-сервера) `.app` **сервер не поднимет** — это клиент.

**Дальше (идея, не обязательство):** один **launcher `.app`** с несколькими окнами на `app-*`, вместо четырёх отдельных Electron-приложений. Существующие `.app` можно **оставить** для привычных пользователей.

**Итог:** архитектура одна (CMS в Docker + single door); Electron опционален — «нативные окна над тем же веб-UI», не отдельный стек.

**План работ (согласовано):**

1. ✅ **Electron URL-shell** — `desktop/shared/url-shell.js`; Editor / Voice / Control / Commander грузят `AGENT_CMS_PUBLIC_URL` + path; legacy: `AGENT_CMS_ELECTRON_LEGACY=1`.
2. ✅ **Offline-экран** — `desktop/shared/offline.html` (общий для всех `.app`, иконка + заголовок окна) + probe; **`build-desktop-subapp.js`** копирует `shared/` в asar.
3. ✅ **CLI `agent-cms-cli status`** + **`npm run cms:status`** — `scripts/cms-http-status.js` (HTTP + compose ps).
4. ✅ **CLI `agent-cms-cli electron-app shortcuts`** (+ **`electron-app build`**) · Browser Extension launcher `.app` · dev: **`npm run cms:shortcuts`**.

> **NOTE**
> - ✅ Согласовано с Q2 и `docs/deploy/DOCKER.md` (Electron опционален, URL = браузер).
> - 💡 Dev-only в реестре (Q1): desktop Electron — `visible: false`, не path на CMS.
> - 📌 Задача на потом: единый launcher vs статус-кво — отдельный мини-TODO или пункт в desktop/, когда понадобится.

### 7.1 — Сохранить Electron, ярлыки и команды

**Статус v1:** ==✅== **`agent-cms-cli electron-app shortcuts`** — ACMS-Editor / Chat / Control / Commander / Browser Extension; **`electron-app build pack`**.

**Отложено:** один launcher `.app` вместо четырёх — по желанию.

### 7.2 — Несколько оболочек, один URL

**Статус v1:** ==✅== см. URL-shell выше.

**Идея:** несколько Electron-приложений **как сейчас**, но по сути это **обёртки**: каждое окно грузит **тот же public URL**, что и браузер (`AGENT_CMS_PUBLIC_URL` + path):

- Editor → `/`
- Voice → `/app-chat`
- Control → `/app-control`
- Commander → `/app-commander`

**Не поднимают** Docker/CMS сами — только клиент к уже запущенному стеку.

### 7.3 — Статус стека перед открытием окна

**Идея:** если сервер **выключен**, Electron **ничего полезного не покажет** (ошибка / пустая страница) — нужна явная проверка.

**Статус v1:** ==✅== **`agent-cms-cli status`** + offline в `.app` («Повторить»). README / `desktop/README.md`.

### 7.4 — `chat.localhost` vs `localhost/app-*`

**Идея:** вместо path **`http://127.0.0.1:3000/app-chat`** — отдельные **поддомены** (`chat.localhost`, `control.localhost`, …).

**Сомнения (обсудить):**

- Хуже ли для **единого контроля** над «семью» UI-приложениями (общий shell, app-lock, switcher, одна сессия)?
- Доп. DNS / hosts / Caddy / сертификаты vs **одна дверь** Q1.
- Electron и браузер — одинаковые URL или разные привычки?

**Пока канон Q1:** один host + **`/app-*`**; поддомены — только если явно выиграем (и не ломаем реестр `platform_apps_list`).

### 7.5 — Куда смотрит Electron: localhost или сервер

**Идея (обсудить с Q6 / workspace source):** оболочка открывает

- **local** — `http://127.0.0.1:3000/…` (Mac + Docker на этой машине), или
- **server** — `https://ваш-vps/…` (данные на VPS, Electron просто клиент).

**Открытый вопрос:** один `.app` с переключателем «хост» в настройках vs разные ярлыки «Agent CMS (local)» / «Agent CMS (prod)»; связь с полем **environment** при создании workspace (справочно, не mount).

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

## 🟡 Вопрос 9.1 — установщик (Mac / Windows / Linux)

**Статус:** 🟡 **v1 закрыто** — [`scripts/install.sh`](scripts/install.sh), GitHub `curl | bash`; Windows [`install.ps1`](scripts/install.ps1) → WSL. **Без npm.** Осталось v1.1: native Windows, опц. Homebrew/deb; **push** фиксов compose/MCP на `main`.

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

## 🟡 Вопрос 9.2 — CLI `agent-cms` (вместо длинных compose/git-команд)

**Статус:** 🟡 **v1 закрыто** — [`scripts/agent-cms`](scripts/agent-cms) + [`agent-cms-cli-lib.sh`](scripts/agent-cms-cli-lib.sh); PATH через install.sh. Осталось v1.1: **`update` ≈ Q3**, app-lock на **`env set`**, completion / Windows `.cmd`.

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
| **Control «Обновить»** (`deploy-update`, app-lock, journal) | CLI **`update`** = только `git pull --ff-only` (без rebuild), **не** тот же HTTP-ops (Q3) |
| **Legacy npm-стек** | `AGENT_CMS_WELCOME_LEGACY`, **`agent-cms-stack.sh`** — не в CLI |
| **app-lock на CLI `env set`** | запись в `.env` с хоста без пароля (доверенный оператор); MCP/Control — с lock |

**TODO (v1.1):**

- [x] **`agent-cms down`** — compose down + `workspace-mounts`.
- [ ] **`agent-cms update`** — выровнять с Q3: опционально deploy-update (app-lock, лог).
- [x] **`env show` / `env set`** — Node + `platform-root-env.js` (whitelist `.env.example`).
- [x] **`uninstall`** — symlink + config; **`--purge`** = down stack, репо вручную.
- [ ] Legacy welcome/stack — **`agent-cms legacy …`** (низкий приоритет).

**Артефакты:** ✅ bash CLI + `agent-cms-env-cli.js`; install.sh → `~/.local/bin/agent-cms-cli` (+ alias `agent-cms`). Позже: completion, update≈Q3.

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

---

## 📌 Вопрос 10 — edge-приложения на поддоменах (вне CMS, без смены Q1)

**Статус:** 🟡 **v0 в репо** — `AGENT_CMS_EDGE_SERVICES_ENABLED=1`, Caddy (Linux) + **Mac HTTP gate**, `platform_services_list`, Control edge health. Дальше: Hermes и др.

**Не путать с Q7.4:** там — поддомены *вместо* `/app-chat` для **платформенных** UI. **Q10 — другое:** канон Q1 **остаётся** — Agent CMS на основном хосте (`maptex.ru` / `localhost:3000`) и пути **`/app-*`**. Поддомены — для **отдельных внешних сервисов** (сторонний образ, свой UI/API), которые живут **рядом** с CMS в compose; снаружи — **Caddy по `Host`** (VPS) или **CMS HTTP gate** (Mac).

### 10.1 Зачем

- Пример: **QwenPaw** — контейнер [`agentscope/qwenpaw`](https://hub.docker.com/r/agentscope/qwenpaw) (или аналог), свой порт внутри сети `agent-cms`.
- Снаружи: **`qwenpaw.localhost`** (dev) · **`qwenpaw.sitename.ru`** (prod).
- **Linux/VPS:** Caddy по `Host`, CMS **не** роутит edge. **Mac v0:** CMS `:3000` + `AGENT_CMS_EDGE_HTTP_GATE` (`edge-host-gateway` в `server.js`).

### 10.2 Именование (канон — черновик)

| Роль | Поддомен | Комментарий |
| --- | --- | --- |
| **Основная платформа** | apex / `www` | `https://sitename.ru/` + `/app-*` (Q1) |
| **Одно edge-app** | `{appId}.` | `qwenpaw.`, `foo.` — **appId** = slug сервиса в compose |
| **Каталог / агрегатор** | **`all.`** («Все») | `all.localhost` · `all.sitename.ru` — ссылки на edge-сервисы + CMS |

**Почему не `apps.`:** созвучно с **`/app-*`** и реестром platform apps; **`all.`** = «все сервисы на этом хосте».

Отдельный контейнер агрегатора (статика или лёгкий nginx/caddy snippet + JSON манифест списка) — **да, отдельный сервис**, не часть `cms`. Манифест можно позже тянуть из `.agent-cms-global` или Control (ops), v0 — статический `index.html` в образе/volume.

### 10.3 Инфра (чеклист)

1. **DNS (prod):** `*.sitename.ru` → A на VPS (Beget и т.п.); apex как сейчас.
2. **Compose:** сервис `qwenpaw` (image, env, `expose`, без publish на хост); сеть `agent-cms`.
3. **Caddy** (`docs/deploy/docker-Caddyfile` или overlay):
   - `qwenpaw.{domain}` → `reverse_proxy qwenpaw:PORT`;
   - `all.{domain}` → агрегатор;
   - `{domain}` / `:80` → как сейчас → `cms:3000`.
4. **TLS:** wildcard `*.sitename.ru` (Let’s Encrypt) или отдельный cert на каждый поддомен; локально часто достаточно **HTTP** `:80` + `*.localhost` → 127.0.0.1 в браузере.
5. **После `.env` / Caddy:** recreate (`agent-cms-cli restart` на Linux), не rebuild образа CMS — см. DOCKER.md.

### 10.4 Неизвестный поддомен (`blabla.*`) — проблема и v0-решение

**Проблема:** при wildcard DNS `*.sitename.ru` запрос `blabla.sitename.ru` попадает на VPS. Если Caddy по умолчанию всё ведёт на **`cms:3000`**, пользователь видит **Editor с «чужим» Host** — путаница URL, cookies, ощущение «сломанного» CMS.

**Канон v0:** явные host → `qwenpaw`, `all`; **остальные** `*.domain` → **статическая заглушка** (`edge-static/unknown`), **не CMS**. Apex `sitename.ru` → CMS без изменений.

**Ограничение v0:** неизвестный `foo.*` → заглушка только **`http://foo…`**. **`https://foo…`** без LE wildcard (DNS-01) не открывается — **не** делать site `*.domain` / `tls internal`: перехватывает `qwenpaw` / `all` и ломает Let's Encrypt. Маршрут unknown — matcher `host` в блоке `:80`, не wildcard site.

### 10.5 Границы / риски

- **Cookies / CORS / SSO** — разные origin; app-lock CMS **не** распространяется на `qwenpaw.*` автоматически.
- **Секреты** — env **у каждого** edge-сервиса; не смешивать с whitelist CMS `.env.example` без явного решения.
- **Реестр Q1 (`platform_apps_list`)** — только **встроенные** `app-*`; edge — **`platform_services_list`** / `GET /api/platform/services`.
- **MCP Host allowlist** — при обращении к MCP с поддомена дописать хосты в `AGENT_CMS_MCP_ALLOWED_HOSTS` (если нужно).

### 10.6 Артефакты

- [x] `docker-compose.edge-services.yml` + **`AGENT_CMS_EDGE_SERVICES_ENABLED=1`** в CLI compose args.
- [x] Данные сервисов: **`workspaces/${AGENT_CMS_SERVICES_DATA_DIR}/<service-id>/`** (default `0-services-data/qwenpaw`).
- [x] `docs/deploy/docker-Caddyfile.edge` + `qwenpaw` + **`all.`** + `*.domain` → unknown.
- [x] DOCKER.md — таблица host → backend.
- [x] Control: ссылки / health edge (`/api/platform/services`, мониторинг).
- [x] Mac без Caddy — `docker-compose.edge-services.mac.yml` + `AGENT_CMS_EDGE_HTTP_GATE`.
- [x] MCP **`platform_services_list`**.
- [ ] Hermes и др. — по одному сервису + строка в Caddy (динамический каталог без compose — не v0).
- [ ] 🟡 Wildcard HTTPS `*.domain` (DNS-01) — не блокер v0.

> **NOTE**
> - ✅ **Решение:** `/app-*` **не трогаем**; поддомены — edge-контейнеры + **`all.`** как каталог.
> - 💡 Q7.4 (chat.localhost) остаётся **отложено**; Q10 не заменяет path-маршруты CMS.
> - 📌 Связь с REFACTOR-19 / MCP-instances — только если edge-app нужен в workspace; иначе чисто infra.

### 10.7 Q10 — что решили (кратко)

| Решение | Статус |
|--------|--------|
| **`/app-*` на apex не трогаем** — CMS на главном домене | ✅ |
| **Поддомены только для сторонних app** (не Q7.4, не `/app-chat` на subdomain) | ✅ |
| **Каталог-агрегатор — `all.`** («Все»), не `apps.` | ✅ |
| **Edge-app — `{slug}.`** (пример `qwenpaw.`) | ✅ |
| **Прокси по Host:** **Caddy** (Linux/VPS); CMS **не** роутит edge на prod | ✅ VPS |
| **Mac без Caddy** — edge на **`localhost:3000`** (`AGENT_CMS_EDGE_HTTP_GATE`, `edge-host-gateway`) | ✅ v0 |
| **Неизвестный `blabla.*` → заглушка**, не Editor CMS | ✅ v0 (`http://`); 🟡 `https://` без wildcard LE |
| **Включение — `AGENT_CMS_EDGE_SERVICES_ENABLED=1`** + overlay compose | ✅ |
| **Пример v0 — QwenPaw** (`docker-compose.edge-services.yml` / `.mac.yml`) | ✅ |
| **Доку — README, DOCKER.md, `.env.example`** | ✅ |
| **Новый edge-app = compose + строка Caddy** (Hermes и т.д.) | ✅ принцип · ❌ автоматики |
| **Динамически без правки compose** | ❌ не v0 · 💡 ниже |
| **Wildcard HTTPS `*.domain` (один cert, DNS-01)** | 🟡 позже · не блокер v0 |
| **Control — ссылки / health edge** | ✅ (`/api/platform/services`, мониторинг) |
| **MCP `platform_services_list`** | ✅ |
| **App-lock / cookies единые с edge** | ❌ нет, разные origin |

### 10.8 💡 v1 — каталог edge-сервисов без ручного compose (идея)

По аналогии с **`workspace-mounts`**: реестр на диске → CLI генерирует overlay перед `up`.

| Env (черновик) | Назначение |
| --- | --- |
| **`AGENT_CMS_EDGE_SERVICES_MANIFEST`** | Путь к JSON реестра (default `.agent-cms-global/edge-services.json`): `serviceId`, image, port, subdomain slug, `dataOnDisk`, env. |
| **`AGENT_CMS_EDGE_SERVICES_GENERATE`** | **`1`** — при `agent-cms-cli restart` пересобрать **`docker-compose.edge-services.generated.yml`** + фрагмент Caddy из manifest; **`0`** — только статический overlay из git (v0). |

**Поток:** Control/MCP правят manifest → `restart` → compose + Caddy + `platform_services_list` из одного источника. v0: manifest нет, QwenPaw/`all` зашиты в repo.

### 10.9 💡 v1 — свой `.env` у каждого edge-сервиса (идея)

**Зачем:** ключи Kilo/OpenAI, порты, флаги QwenPaw/Hermes **не смешивать** с корневым `.env` CMS (`APP_LOCK_*`, `AGENT_CMS_MCP_TOKEN`, `AGENT_CMS_*`).

**Канон (черновик):**

```text
workspaces/0-services-data/
└── qwenpaw/
    ├── .env              ← только этот контейнер (env_file в compose)
    ├── …                 ← /app/working (runtime, не в git)
    ├── _secret/
    └── _backups/
```

| Уровень | Что хранить |
| --- | --- |
| **Корень репо `.env`** | Платформа: lock, MCP, `AGENT_CMS_EDGE_SERVICES_ENABLED`, `AGENT_CMS_PUBLIC_DOMAIN`, `AGENT_CMS_SERVICES_DATA_DIR` |
| **`<service-id>/.env`** | Секреты и настройки **конкретного** образа (API keys, model id, `QWENPAW_*` и т.д.) |
| **Manifest (§10.8)** | Ссылка `envFile: workspaces/0-services-data/qwenpaw/.env` или inline `env` только для автогена compose |

**Правила:** `.env` сервиса **не в git** (как корневой `.env`); в `0-services-data/.gitignore` — игнор `/*/.env`; пример — `qwenpaw/.env.example` в repo (без секретов).

**v0 сейчас:** один корневой `.env` + `AGENT_CMS_QWENPAW_INTERNAL_URL` для CMS; `env_file` на `qwenpaw/.env` — не подключён.