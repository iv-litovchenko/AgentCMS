# Agent CMS — инстансы MCP, workspace и туннель

**Статус:** конспект обсуждения (голос / Claude) · дополняет **`TODO.SERVER.md`**

**Зачем файл:** одна шпаргалка — термины, деревья, Claude Desktop vs claude.ai, что видно в Editor и что видит агент в MCP.

---

## Резюме (кратко)

### 1) Новое в терминологии — **инстанс**

| Понятие | Что это |
|---------|---------|
| **Workspace (хранилище / agent в API)** | Папка внутри **одного** запущенного CMS: medcenter, downloads, «из коробки» и т.д. |
| **Инстанс MCP** | **Откуда MCP берёт данные** — отдельный **экземпляр CMS** (Mac, VPS, Mac через hub), не отдельное хранилище на диске |

Раньше всё подразумевалось как «один Mac → один CMS». Теперь у агента в списке может быть **`instanceId:workspaceId`**, если источников несколько.

**На главной Editor инстансы не показываются** — только workspace **этого** CMS.

### 2) Пять хранилищ на одном Mac — инстансы не обязательны

Если все workspace живут на **одном** процессе CMS на компе:

- Достаточно одного инстанса **`local`** (по умолчанию).
- Агент выбирает medcenter / downloads через обыальный **`workspaces_list`** и **`session_context_get({ workspaceId })`**.
- UI «Инстансы MCP» нужен **на будущее** или когда появится VPS / туннель.

### 3) Editor (браузер) vs MCP (агент)

| Где | Что видишь | Id / URL |
|-----|------------|----------|
| **Главная Editor** (`http://localhost:3001` или свой порт) | Только **5 workspace этого Mac** | `?agent=medcenter` — id из манифеста, **без** префикса `local:` |
| **Claude Desktop + MCP** | Список из **`workspaces_list`** | При одном local — часто как сейчас; при нескольких инстансах — **`local:medcenter`**, **`server:medcenter`**, … |
| **claude.ai** | Только то, что доступно по **HTTPS MCP на сервере** | `localhost` **не работает** |

Префикс **`local:`** — для **MCP-tools**, не для адресной строки сайта.

---

## Дерево (один Mac, 5 workspace)

```
Mac (один CMS + один MCP для Desktop)
│
├── Инстанс MCP: local
│
└── Workspaces:
    ├── medcenter
    ├── downloads
    └── … (ещё 3, в т.ч. «из коробки»)
```

---

## Дерево: агент, Desktop, облако, туннель

```
🤖 Агент

├─ 🖥️ Claude Desktop (Mac)
│  └─ MCP stdio: node …/mcp-server/index.js  (без URL в интернет)
│     └─ local → CMS на Mac → все workspace
│
├─ ☁️ claude.ai
│  └─ Коннектор: https://ваш-сайт.ru/mcp (+ token)
│     └─ MCP на VPS
│        ├─ remote → CMS на сервере (workspace на VPS)
│        └─ tunnel → доступ к workspace на Mac (см. ниже)
│
└─ 🕳️ Туннель
   Mac: npm run tunnel:device ──исходящий WS──▶ hub (CMS на VPS)
   Запрос marina-macbook:medcenter → hub пересылает на Mac → ответ агенту
   (Mac не открывает порты наружу)
```

---

## Дерево: цель «один коннектор Desktop — local + server + tunnel»

```
Claude Desktop (один MCP stdio)
        │
        ▼
   MCP на Mac
        │
        ├── local  → CMS на Mac
        │      ├── medcenter
        │      ├── downloads
        │      └── …
        │
        ├── remote → CMS на VPS
        │      └── medcenter
        │
        └── tunnel (deviceId marina-macbook) → через hub к Mac
               └── marina-macbook:medcenter  (те же папки на Mac)
```

Конфиг Claude **без адресов** — серверы в **`.agent-cms-global/instances.json`**.

### Где настраивать (продуктовое правило)

| Место | Роль |
|-------|------|
| **Agent CMS Control** (Electron) | **Единственное UI** — URL, token, tunnel, сохранение в `.agent-cms-global/instances.json` |
| **Editor (MCP Server modal)** | **Нет инстансов** — только документация tools и JSON для Claude |
| **HTTP API** | `GET /api/platform/mcp-instances` — redacted (ops); **POST → 403** |

**Почему не Editor:** это не настройка workspace, а **проводка MCP на машине** (секреты, Claude Desktop, путь к репо). Editor может быть на VPS в браузере — не место для token ноутбука. Control = «пульт установки», как JSON для Claude.

**Почему не MCP-tools:** агент не должен получать token в контекст; запись инстансов — действие человека/Control, не чата.

Пример файла: **`.agent-cms-global/instances.example.json`**

---

## Виды «источников» (не только Mac + tunnel)

| Вариант | Для кого |
|---------|----------|
| **MCP stdio на Mac** | Claude Desktop |
| **MCP HTTP на Mac** (`http://localhost:3490/mcp`) | Cursor Desktop |
| **MCP HTTPS на VPS** | claude.ai, удалённый Cursor |
| **remote** в instances.json | Второй CMS по URL (VPS, другой домен) |
| **tunnel** | Данные на Mac, а MCP «сидит» на hub |
| **Docker CMS** | Тот же смысл local/remote, другой способ запуска |
| **Несколько remote** | Несколько id инстансов: `server1:…`, `server2:…` |

**Не отдельный тип:** несколько **workspace** под одним **local**.

---

## Как выглядит MCP — по сценариям

### Claude Desktop (локально)

```json
{
  "mcpServers": {
    "agent-cms": {
      "command": "node",
      "args": ["/Users/macbook/Desktop/YamlCMS/mcp-server/index.js"]
    }
  }
}
```

Локальный CMS MCP ищет сам (runtime / порты 3001, 3000, …). После смены **instances.json** — перезапуск Claude Desktop.

### claude.ai

- Только **`https://…/mcp`** на сервере (TLS обязателен).
- Без туннеля — workspace **только на VPS**.
- С туннелем — ещё id вида **`deviceId:workspace`** с Mac.

### Cursor (локально)

- URL: **`http://localhost:3490/mcp`** (если запущен `npm run mcp:http`).

---

## Что делает туннель (одной фразой)

**Исходящее** соединение с Mac к hub на VPS; удалённый MCP **не лезет в localhost**, а шлёт вызов через hub на подключённый **tunnel:device**.

Проба (hub = локальный Docker CMS): см. блок «Попробовать» в **`TODO.SERVER.md`** (`npm run tunnel:device`, env `AGENT_CMS_TUNNEL_*`).

---

## Что уже в коде (проба)

- **`workspaces_list`** — id с префиксом `instanceId:workspaceId`
- **`instances.json`** + UI только в Control
- Туннель: `/api/tunnel/ws`, `tunnel:device`, invoke/devices API

Подробности деплоя и портов — **`TODO.SERVER.md`**, коннекторы — **`docs/connectors/README.md`**.

---

## Обсудить (голосом с Claude)

- Достаточно ли ясно в UI, что **инстанс ≠ workspace**?
- Нужно ли на главной Editor намёк «сейчас local, remote в MCP» или не трогать?
- Один чат Claude = один MCP; второй CMS — второй чат или один merged list — комфортно ли?
- claude.ai: только hub + token; OAuth в URL — когда делать?
- Именование: в API ещё **agent**, в MCP инструкциях **workspaceId** — унифицировать подсказки?
- Сценарий Marina: medcenter на Mac + копия на VPS — один список `local:…` / `server:…` или два коннектора проще psychologically?

---

## Связанные файлы

- `TODO.SERVER.md`
- `.agent-cms-global/instances.example.json`
- `lib/instances/instances-store.js`
- `mcp-server/index.js`, `mcp-server/lib/instance-registry.js`, `mcp-server/lib/workspace-ref.js`
- `lib/tunnel/*`, `scripts/tunnel-device.js`
