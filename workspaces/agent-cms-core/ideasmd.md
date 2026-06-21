---
awn-preview: ""
awn-emoji: ""
awn-name: IDEAS.md
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: 2026-06-21T17:39:37.620Z
awn-update: 2026-06-21T17:45:00.000Z
awn-description: "Backlog: Inbox, Диалог, Комментарии — фазы 5–7 и интеграции"
awn-main: false
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-tags: []
awn-color: ""
awn-version: 1
awn-sort: ""
awn-attachments: []
---

# IDEAS · каналы Agent CMS

Backlog развития **Inbox**, **Диалог (Thread)** и **Комментарии** в веб-UI и MCP.  
Cursor остаётся «мозгом»; CMS — память, очереди и обсуждение.

---

## Уже сделано (фазы 1–4)

| Фаза | Суть |
|------|------|
| **1–2** | Inbox (triage), Диалог по теме/файлу, комментарии в Обзоре/Навигации, бейджи в sidebar (🟠 inbox, 🟣 диалог) |
| **3** | MCP: `list_inbox`, `read_inbox_item`, `triage_inbox_item`, `list_comments`, `append_comment`, `read_thread`, …; SSE по теме |
| **4** | 👍 реакции, @mention в sidebar, комментарии к external/media, **один SSE-поток на агента** (`scope=agent`) |

Цвета бейджей: **оранжевый** — необработанные входящие; **фиолетовый** — новое сообщение агента в диалоге; **голубой `@`** — непрочитанные упоминания.

---

## Фаза 5 · интеграции (приоритет)

### 5.1 Webhook Inbox

**Зачем:** класть записи во **|- Входящие** без UI — из n8n, cron, своих скриптов, будущего Telegram-бота.

**Предлагаемый контракт:**

```
POST /api/inbox/webhook?agent=<id>
Header: X-Inbox-Secret: <token>   (или ?secret= в query — хуже, но проще для curl)
Body (JSON): {
  "path": "agent-groups.md",       // тема (manifest)
  "title": "Заголовок",
  "body": "Текст",
  "source": "n8n|telegram|email|…",
  "author": "optional"
}
→ 201 + item (как POST /api/inbox/create)
```

**Детали реализации:**

- Секрет: `INBOX_WEBHOOK_SECRET` в `.env` агента или глобально; без секрета — 401.
- Тот же пайплайн, что `createInboxItem`: `sanitizeInboxIntakeBody`, frontmatter `awn-status: new`, `awn-source`.
- Rate limit (например 60 req/min на agent) — защита от спама.
- Логировать source + IP в meta (опционально `awn-webhook-id` в frontmatter).
- MCP-обёртка: `create_inbox_item` уже есть; webhook — для внешних систем без MCP.

**Проверка:** curl с секретом → запись в `awn-storage/<topic>/inbox/` → оранжевый бейдж → triage в UI.

---

### 5.2 Защита Inbox от untrusted sources

**Зачем:** тело из webhook/Telegram/email — **недоверенный ввод**; не должно ломать triage и не должно «промпт-инжектить» агента при «→ в Диалог».

**Меры (уже частично есть, усилить для `source: external`):**

| Мера | Описание |
|------|----------|
| Strip YAML | Удалять вставленный `---` frontmatter из body (есть в `sanitizeInboxIntakeBody`) |
| Лимит длины | 50k символов + обрезка (есть) |
| Обёртка в диалог | `> **Входящее** · source` при triage to-thread (есть) |
| **Новое:** метка untrusted | Если `source` ∉ whitelist (`ui`, `mcp`, `cursor`) — в UI карточка с иконкой ⚠, preview без raw HTML |
| **Новое:** запрет frontmatter в body | Не сохранять пользовательские `awn-*` ключи из body в файл |
| **Новое:** optional quarantine | Папка `inbox/_quarantine/` или статус `quarantined` до ручного «принять» |

**Whitelist sources (пример):** `ui`, `mcp`, `cursor`, `webhook` (если секрет верный), `telegram` (если подпись бота OK).

---

### 5.3 Telegram → Inbox

**Зачем:** сообщения из Telegram попадают в тему как входящие; человек triage в CMS, агент отвечает через Cursor/MCP.

**Архитектура (без LLM в CMS):**

```
Telegram Bot API
    → маленький сервис / serverless (или node-скрипт в репо)
    → POST webhook Inbox (5.1)
    → тема по mapping chat_id → path
```

**Mapping (конфиг в агенте):**

```yaml
# awn-storage/_/configuration/inbox-sources.yml (черновик)
telegram:
  secret: env:TELEGRAM_BOT_SECRET
  chats:
    - chat_id: -100123456
      topic: agent-groups.md
      default_author: "@telegram_user"
```

**Поведение:**

- Текст сообщения → `body`; имя отправителя → `author`; `source: telegram`.
- Фото/файлы → optional: сохранять в `media/` + ссылка в body inbox.
- Команды бота: `/topic agent-groups` — привязка чата; `/status` — pending count через intake API.

**Не в scope v1:** двусторонний ответ из CMS в Telegram (можно фаза 6).

---

### 5.4 `core.storage-layers.yml` в runtime

**Зачем:** слои памяти (`content`, `inbox`, `thread`, `comments`, …) описаны в доках, но код размазан по константам; один YAML — источник правды для UI, MCP и валидации путей.

**Предлагаемое содержимое (эскиз):**

```yaml
layers:
  inbox:
    subfolder: inbox
    channel: triage
    listable: true
  thread:
    subfolder: thread
    channel: dialogue
  comments:
    subfolder: comments
    channel: discussion
  content:
    subfolder: content
    channel: memory
```

**Runtime:**

- Сервер при старте (или lazy) читает `core.storage-layers.yml` из корня репо или `workspaces/<agent>/`.
- `manifest-paths.js` / server: опционально merge с hardcoded `STORAGE_SUBFOLDER_*`.
- UI: подписи разделов в селекторе домена ноды берутся из YAML.
- MCP docs генерируются или сверяются с этим файлом.

**Выигрыш:** добавление нового слоя (например `references`) — правка YAML + один handler, а не 15 мест в коде.

---

## Фаза 6 · polish UX каналов

### 6.1 Toast / звук при @mention

Сейчас: голубой бейдж `@` в sidebar и в блоке «Комментарии».  
**Добавить:** при SSE `scope=agent` и росте `mentions.unread` — ненавязчивый toast «Вас упомянули в теме X»; опционально звук (localStorage opt-in).  
Клик по toast → открыть тему, режим Обзор/Навигация, прокрутка к комментарию.

### 6.2 MCP `list_mentions`

```
list_mentions({ mentionHandle?, afterId?, limit? })
→ [{ topic, commentId, author, preview, created }]
```

Агент в Cursor видит очередь упоминаний без обхода всех тем.  
Реализация: обход comment dirs или индекс (если появится).

### 6.3 Комментарии к system files

Сейчас: комментарии к теме (`description`), external-файлу, media sidecar.  
**Добавить:** `mode: system`, `name: AGENTS.md` — обсуждение системных файлов агента (как history/comments для system path).

### 6.4 Архив Inbox «разобрано»

Сейчас: triage `mark-done` меняет `awn-status: done`, файлы остаются в `inbox/`.  
**Идея:** периодически или по кнопке «Архивировать разобранное» — перенос в `inbox/_archive/YYYY-MM/` или отдельный слой `inbox-archive` в storage-layers.  
Список Inbox по умолчанию не показывает archived; intake `pending` не считает.

### 6.5 Ответ в Telegram (опционально)

После triage «→ в Диалог» и ответа агента через MCP — hook: если у inbox item есть `awn-telegram-chat-id`, отправить excerpt ответа в Telegram. Требует хранить chat_id в frontmatter inbox при приёме из бота.

---

## Фаза 7 · опционально / долгий горизонт

### 7.1 LLM в браузере

Встроенная модель для черновиков в Inbox/Диалоге без Cursor.  
**Риск:** дублирование «мозга», стоимость, безопасность.  
**Компромисс:** только «улучшить формулировку» локально или вызов API по ключу пользователя.

### 7.2 WebSocket multi-user

SSE сейчас — один пользователь, polling digest по агенту.  
WebSocket — комнаты `agent:<id>`, `topic:<path>` для одновременной работы нескольких людей; presence «кто в теме».  
Сложность: auth, конфликты редактирования, infra.

### 7.3 Push / desktop notifications

Service Worker + Notification API при новых inbox/thread/@mention при закрытой вкладке.  
Зависит от HTTPS и разрешений браузера.

### 7.4 Массовый triage Inbox

Checkbox на карточках, «В работе / Разобрано / → в Диалог» для выбранных.  
API: `POST /api/inbox/triage/batch`.

---

## Рекомендуемый порядок работ

1. **5.1 Webhook Inbox** — максимум пользы, мало UI  
2. **5.2 Untrusted hardening** — сразу после webhook  
3. **5.4 storage-layers.yml** — упростит всё дальше  
4. **5.3 Telegram** — поверх webhook  
5. **6.x** — по боли в ежедневной работе  

---

## Связанные файлы в репо

| Область | Файлы |
|---------|--------|
| Server | `server.js` — inbox, comments, intake, SSE |
| UI | `public/main.js`, `public/styles.css` |
| MCP | `mcp-server/index.js` |
| Пути | `manifest-paths.js` |
| Доки компонентов | `types-of-components/nodes/comments.md`, `documentations/components-ideas.md` |

---

*Обновлено: 2026-06-21 · после фазы 4 (каналы + SSE agent scope)*
