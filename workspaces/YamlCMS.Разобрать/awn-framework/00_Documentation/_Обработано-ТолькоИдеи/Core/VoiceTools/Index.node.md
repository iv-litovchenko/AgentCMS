---
AWN-TYPE: "NODE/INDEX"
AWN-TITLE: VoiceTools — инструменты голосового синтеза и распознавания
AWN-DESC: "Скрипты и конфигурация для TTS (Text-to-Speech) и STT (Speech-to-Text) в OpenClaw"
AWN-LOAD: on_demand
AWN-PRIORITY: 35
AWN-TRIGGERS: [voice, голос, tts, stt, синтез, распознавание]
AWN-STATUS: disabled
AWN-MEMORY: internal
AWN-AUTOMATIZATION: false
AWN-CRON: "0 9 * * *"
AWN-CATEGORY: system
AWN-VERSION: 1.0.0
AWN-CREATED: 2026-05-06
AWN-UPDATED: 2026-05-06
---

# VoiceTools — инструменты голоса

> [!info] О файле
> Нода (`*.node.md`, `NODE/INDEX`): реестр скриптов и инструментов для работы с голосом (TTS/STT).

## Описание

Набор Python-скриптов и конфигураций для синтеза речи (TTS) и распознавания голоса (STT) в OpenClaw. Поддерживает несколько движков: Microsoft Edge TTS, Piper TTS, Silero TTS, Whisper STT.

## Структура

| Папка | Назначение |
|-------|------------|
| `Scripts/` | Исполняемые Python-скрипты |
| `Config/` | Конфигурации, модели, настройки |
| `Assets/` | Примеры аудио, тестовые файлы |

## Скрипты

### `Scripts/TtsMicrosoft.py`
**Microsoft Edge TTS** — обёртка для `node-edge-tts`.
- Поддерживает голоса Microsoft (Svetlana, Dmitry и др.)
- Конвертирует в OGG Opus для Telegram
- **Usage:** `python TtsMicrosoft.py 'Текст' /path/output.ogg [voice]`

### `Scripts/VoiceReply.py`
**Piper TTS** — локальный синтез речи.
- Русские голоса: Irina (👩), Ruslan (👨)
- Требует модели в `~/.local/share/piper/`
- **Usage:** `python VoiceReply.py 'Текст' [voice_name]`

## Конфигурация

### `Config/VoiceSetup.md`
Полная инструкция по настройке:
- Virtual environment: `~/voice-env/`
- Установленные пакеты: faster-whisper, torch, silero, piper-tts
- Пути к моделям Silero и Piper
- Примеры использования STT/TTS

### `Config/VoicePreferences.md`
Настройки голосов пользователя.

### `Config/LatestSileroModels.yml`
Список доступных моделей Silero.

## Assets

- `voice_response.ogg` — пример сгенерированного голосового сообщения

## Интеграция

Скрипты вызываются из OpenClaw для генерации голосовых ответов. Выходной путь для Telegram: `/home/openclaw/.openclaw/media/inbound/`.
