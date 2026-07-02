---
created: 2026-03-25
modified: 2026-03-29
model: gpt-5.3-codex*
last_model: qwen-portal/coder-model
---

# Aya Voice v2

Компонентный модуль STT для Aya.

## Что делает

- Слушает микрофон
- Детектит речь через VAD (`webrtcvad`) + громкость (RMS)
- Распознаёт речь через Google Speech (`SpeechRecognition`)
- Сохраняет:
  - **вход (микрофон):** WAV в `08 ❄️ Archive/04 Voice/Audio` (`voice_*.wav`), расшифровка в `08 ❄️ Archive/04 Voice/Text` (`voice_*.txt`)
  - **выход (ответ Аи, если включён голосовой ответ):** MP3 в `08 ❄️ Archive/04 Voice/ReplyAudio` (`reply_*.mp3`), метаданные в `08 ❄️ Archive/04 Voice/ReplyText` (`reply_*.txt` — запрос STT, текст ответа, LLM/TTS)
- Пишет статус в `00 🍀 Aya.AI/core/integration/voice_status.txt` (в `aya-bar/` остаются симлинки для старых скриптов)
  - включая live метрики `vol/thr/vad`
- Если в `core/integration/assistant_settings.json` включено `computer_control_enabled`,
  вставляет распознанный текст в текущее активное поле ввода (macOS)

### Режимы ввода (`voice_input_mode` в баре / `assistant_settings.json`)

| Ключ | Смысл |
|------|--------|
| `fn_button` | Push-to-talk: запись только пока удерживается клавиша (см. `VOICE_PTT_KEY`, по умолчанию **f18** — частая подмена Fn через Karabiner). Нужен пакет **pynput**. |
| `voice_profile` | В интерфейсе помечен **(beta)** и **недоступен для выбора**; в JSON не сохраняется (подменяется на `always`). Распознавание «только твой голос» — в планах. |
| `always` | Непрерывное прослушивание, как раньше `listen`. |
| `meeting` | Длинные фразы и таймауты для записи разговора. |
| `wake_name` | После STT: вставка/ответ только если в тексте есть одно из имён из `VOICE_WAKE_NAMES`. |
| `disabled` | Микрофон не открывается; в `voice_status.txt` — «Отключено», процесс ждёт (перезапуск после смены режима в баре). |

Старые значения в JSON автоматически мапятся: `listen` → `always`, `button` → `fn_button`, `voice_profile` → `always`.

### Переменные для режимов

| Переменная | Назначение |
|------------|------------|
| `VOICE_PTT_KEY` | Клавиша для push-to-talk: `f18`, `f19`, `space`, `ctrl`, … (по умолчанию `f18`). |
| `VOICE_WAKE_NAMES` | Список через запятую, подстроки в распознанном тексте (по умолчанию включает варианты имени и «Ая»). Пусто = не фильтровать. |

### Пока она говорит — новое не слушаем (упрощённо)

Пока идёт **afplay** ответа, основной цикл записи **не крутится**: новая фраза не начнётся, пока озвучка не закончится (или пока не нажмёшь стоп). Микрофон при этом **только сбрасывает буфер** PyAudio (чтение и выброс кадров), **без** распознавания речи и **без** реакции на громкость — то есть это не «слушание нового», а техника от переполнения буфера. Файл `voice_stop_tts` опрашивается **отдельным потоком** каждые ~40 ms, чтобы стоп срабатывал даже когда основной поток блокируется в `stream.read()`.

| Переменная | Назначение |
|------------|------------|
| `VOICE_POST_TTS_COOLDOWN_SEC` | Пауза после **полной** озвучки перед тем как снова активно слушать, сек (по умолчанию `2.8`). |
| `VOICE_POST_TTS_COOLDOWN_BARGE_SEC` | Пауза после **остановки по кнопке** (файл `voice_stop_tts`), по умолчанию `1.0`. |

Программно можно вызвать `stop_active_playback()` из `app.services.audio_playback`.

**Кнопка в баре:** **🔇** в шапке и **«Стоп озвучки»** в настройках — создают `core/integration/voice_stop_tts`; в цикле воспроизведения файл опрашивается и `afplay` обрывается.

### Полезно при фоновом шуме

Подними порог микрофона: `VOICE_FORCE_THRESHOLD` (число), ужесточи VAD: `vad_mode` в коде / дольше `min_audio_sec` через правку `VoiceConfig` или отключи лишние источники звука рядом с микрофоном.

## Полный цикл (вариант 4): голос → текст → Ая → TTS → звук

В баре включи **«Ответ голосом (нейросеть)»** и выбери **модель** в выпадающем списке (`core/integration/assistant_settings.json`: `voice_response_enabled`, `voice_response_model`).

Цепочка:

1. **STT** — Google Speech (как раньше).
2. **LLM** — короткий ответ «Ая»:
   - `aya-voice` / `local` → **Ollama** (локально), модель из переменных окружения.
   - `openai` → **OpenAI-compatible** Chat Completions (`OPENAI_API_KEY`, опционально `OPENAI_BASE_URL`).
3. **TTS** — **ElevenLabs** или **gTTS** (Google, неофициально) → MP3 в **ReplyAudio** → **`afplay`** (macOS).

Статусы в `voice_status.txt`: `🟢 Думаю` (подготовка ответа), `🔊 Говорю` (озвучка).

### Структура архива `08 ❄️ Archive/04 Voice/`

```text
04 Voice/
  Audio/        ← запись с микрофона (WAV)
  Text/         ← расшифровка STT
  ReplyAudio/   ← озвученный ответ Аи (MP3), общий stem с ReplyText
  ReplyText/    ← дата, имя mp3, бэкенд LLM/TTS, запрос и ответ текстом
```

Имя пары файлов: `reply_YYYYMMDD_HHMMSS_microsec` (микросекунды, чтобы не пересекались при частых ответах).

### Файл `.env` в корне workspace

Путь: **корень твоего Desktop-проекта** (папка, внутри которой лежат `00 🍀 Aya.AI/`, `08 ❄️ Archive/` и т.д.) — туда же, где у тебя уже лежит `.env`.

Пример строк:

```env
VOICE_OLLAMA_MODEL=llama3
OLLAMA_HOST=http://127.0.0.1:11434
VOICE_TTS_BACKEND=gtts
ELEVENLABS_API_KEY=
```

При старте `aya_voice_v2` этот файл подхватывается автоматически (`python-dotenv`, `override=False`: значения из терминала важнее).

### Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `ELEVENLABS_API_KEY` | API-ключ ElevenLabs |
| `ELEVENLABS_VOICE_ID` | ID голоса (из личного кабинета ElevenLabs) |
| `ELEVENLABS_MODEL_ID` | Опционально, по умолчанию `eleven_multilingual_v2` |
| `VOICE_OLLAMA_MODEL` или `OLLAMA_MODEL` | Модель Ollama, напр. `llama3` |
| `OLLAMA_HOST` | Опционально, если Ollama не на localhost |
| `OPENAI_API_KEY` | Для режима `openai` в баре |
| `VOICE_OPENAI_MODEL` | Опционально, по умолчанию `gpt-4o-mini` |
| `OPENAI_BASE_URL` | Опционально, для совместимых API |
| `VOICE_SYSTEM_PROMPT` | Опционально, системный промпт для «Ая» |

### Выбор движка озвучки (`VOICE_TTS_BACKEND`)

| Значение | Поведение |
|----------|-----------|
| `auto` (по умолчанию) | Если заданы ключи ElevenLabs — они; иначе **gTTS** |
| `gtts` | Всегда **gTTS** (нужен интернет, без API-ключа) |
| `elevenlabs` | Только ElevenLabs (обязательны ключи) |

Пример только gTTS:

```bash
export VOICE_TTS_BACKEND=gtts
```

Опционально для gTTS: `VOICE_GTTS_LANG` (по умолчанию `ru`), `VOICE_GTTS_TLD` (по умолчанию `com`).

**Важно:** gTTS ходит в сервисы Google; в некоторых сетях тоже может понадобиться VPN, но часто доступен там, где ElevenLabs режут.

Если озвучка отключена или упала, ответ модели всё равно виден в консоли.

## Запуск

```bash
cd "00 🍀 Aya.AI/core/aya_voice_v2"
./scripts/run.sh
```

## Override устройства микрофона

```bash
VOICE_INPUT_DEVICE_INDEX=1 ./scripts/run.sh
```
