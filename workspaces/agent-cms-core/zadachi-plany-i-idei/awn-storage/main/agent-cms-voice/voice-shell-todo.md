# Agent Shell · голос — TODO и статус

Краткий чеклист (август 2026). Обновлять по мере реализации.

## Уже сделано

| Что | Статус |
|---|---|
| **5 режимов в UI** | ✅ Живой диалог · По имени · Запись встречи · Голосовое · Shift |
| **Миграция** Web/Side/Live → hold/live/fn_button | ✅ |
| **«Глобально»** — галочка + sidecar | ✅ |
| **Голосовое** — удержание 🎤 | ✅ |
| **Anti-echo (частично)** — стоп TTS при начале записи | ✅ |
| **`awn-dialogs/chats/`** — дописывание Q/A | ✅ |
| **`records/meeting/`** — pcm при стоп встречи | ✅ |
| **Движок STT** — авто (browser / sidecar), без ручного select | ✅ |
| **Sidecar API** — live, wake, meeting, PTT, voice-record | ✅ |

---

## Ещё не учтено / доделать

| Тема | Статус |
|---|---|
| **Длина куска Live** — 1 мин? VAD? пауза? | ❌ не решено |
| **Wake по имени** | ⚠️ фильтр подстроки; режим **≠ Live** в UI, логика сырая |
| **Tap 🎤** (нажал–стоп) vs **удержание** | ❌ сейчас только hold |
| **Выбор клавиши PTT** — не только Shift (`SHELL_PTT_KEY`) | ❌ в UI нет |
| **Живой диалог** | ⚠️ VAD/пауза, без полноценного «разговора» |
| **Anti-echo полный** | ⚠️ нет cooldown после TTS, не игнорит свой голос |
| **Shift** | ⚠️ без «Глобально» — только Shell в фокусе; Electron ≠ браузер |
| **iPhone** | ❌ глобально / sidecar по сути недоступно |
| **Запись встречи** | ⚠️ pcm + STT; нет сводки / таймкодов / UI прогресса |
| **`awn-dialogs/chats/`** | ⚠️ нет UI просмотра |
| **`records/`** | ⚠️ нет wav/mp3, единого именования, списка |
| **Только мой голос** | ❌ |
| **Computer control** | ❌ (в поле, не в чат) |
| **TTS `ttsPrompt` / VOICE-END** | ⚠️ если пусто — dual-reply не работает |
| **Движок STT вручную** | ✅ авто browser/sidecar; ❌ выбор модели (Whisper и т.д.) |
| **Проактив + wake** | ❌ skill / политика агента |
| **Compose chips** (Web, Recall…) | ❌ заглушки |
| **Sidecar agent** | ⚠️ `AGENT_CMS_AGENT` = agent в URL Shell |
| **Права macOS** | ⚠️ микрофон / Accessibility для Shift глобально |

---

## Режимы (целевая модель)

1. **Живой диалог** — sidecar, речь по паузе → агенту  
2. **По имени** — wake-слово из ⚙️ STT (отдельно от Live)  
3. **Запись встречи** — 🎤 старт/стоп  
4. **Голосовое** — удерживать 🎤  
5. **Shift** — удерживать клавишу  

+ ☑ **Глобально** (sidecar, любое приложение)  
+ ☑ **Голосовой ввод (STT)** вкл/выкл  

---

## Sidecar

```bash
AGENT_CMS_AGENT=agent-cms-core npm run shell:sidecar
```

Должен совпадать с `?agent=` в URL Shell.

---

## Дальше по плану (логичный порядок)

### 1. Довести runtime до «боевого» (Фаза 3 — начало)

Сейчас bridge работает, но поверхностно:

- [ ] **Per-runtime панели** (не одна общая bridge) — свои поля, health, «открыть UI»
- [ ] **Health в chip** для Hermes / OpenClaw / Agent Zero / Cursor / Codex / Claude
- [ ] **Сессии и история** для OpenAI-compatible (не только single-turn)
- [ ] **Agent Zero** — pairing token, проверка `/health`
- [ ] **STT refine** — сейчас только через QwenPaw; решить политику для других runtime

### 2. Связка CMS ↔ Voice в UI

- [ ] Кнопка **«Открыть Voice»** в шапке CMS (рядом с MCP)
- [ ] Кнопка **«Открыть CMS»** в Voice (`#shell-open-cms`) — проверить URL на `:3443`
- [ ] **Desktop/Electron:** заголовок Agent CMS Voice, дефолт `:3488`
- [ ] **Sidecar:** `AGENT_CMS_VOICE_URL` + API через Voice или напрямую CMS — унифицировать

### 3. Голос — догнать Aya (Фаза 2, хвосты)

По help в `index.html` ещё ❌ (часть уже есть в коде, help устарел):

- [ ] anti-echo / cooldown после TTS
- [ ] meeting / wake_name в sidecar стабильно
- [ ] метрики mic (vol/thr/vad), выбор устройства
- [ ] архив голосовых записей

### 4. Конфигурация и деплой

- [ ] `npm run start:https` — документировать 4 порта одной шпаргалкой
- [ ] `.env`: `VOICE_PORT`, `CMS_API_URL`, ключи runtime
- [ ] Убрать/закрыть legacy `/shell/` на CMS (оставить только redirect)
- [ ] Обновить help в Voice (`index.html`) — фазы и чеклисты

### 5. Фаза 3 — multi-agent routing (ещё не делали)

- [ ] Routing по **теме / группе / intent** («спроси OpenClaw про heartbeat»)
- [ ] Несколько runtime одновременно (think vs log vs TTS)
- [ ] Launch profiles + heartbeat для OpenClaw/Hermes

### 6. Полировка продукта

- [ ] Spoken vs full reply для TTS везде
- [ ] Monitor-страница / phrase history
- [ ] IPC в desktop: screenshot, clipboard
- [ ] Настройки Voice в CMS configuration (сейчас только `.agent-shell/settings.json`)

---

## Рекомендуемый следующий шаг

**П.1 + П.2** — runtime по-настоящему + кнопка CMS→Voice:

1. Health + свои панели для Hermes / OpenClaw / Agent Zero
2. Кнопка в CMS **🎤 Voice** → `https://<host>:3488/<agent>/`
3. Обновить help и sidecar env

Приоритет на выбор: **runtime health** · **кнопка в CMS** · **sidecar/anti-echo**

