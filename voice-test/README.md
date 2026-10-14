# voice-test — сравнение TTS

Локальная площадка для пробной озвучки трёх движков:

| Движок | Где работает | Зависимости |
|--------|----------------|-------------|
| **Microsoft Edge TTS** | сразу | `edge-tts-universal` из корня репозитория |
| **Kokoro** | локально (CPU/GPU) | Python: см. `requirements.txt` |
| **Chatterbox** | локально | Python: см. `requirements.txt` |

## Запуск

**Вариант A — отдельный сервер (браузер откроется сам на macOS):**

```bash
npm run voice:test
```

→ [http://127.0.0.1:3099/](http://127.0.0.1:3099/)

**Вариант B — через основной CMS:**

```bash
npm start
```

→ [http://127.0.0.1:3000/voice-test/](http://127.0.0.1:3000/voice-test/)

Не открывайте `index.html` двойным щелчком — API не заработает.

Порт: `VOICE_TEST_PORT` (по умолчанию `3099`).

## Python (Edge TTS — рекомендуется)

Microsoft периодически ломает старый WebSocket; **Python `edge-tts`** работает стабильнее, чем npm `edge-tts-universal`.

```bash
cd voice-test
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install edge-tts
# или всё сразу:
pip install -r requirements.txt
```

Сервер сам найдёт `voice-test/.venv/bin/python`.

## Kokoro (мультиязычный v1)

```bash
npm run voice:test:kokoro
```

Языки в UI: en-us, en-gb, es, fr, ja, zh, hi, it, pt-br.

## Kokoro RU (Sveta, Masha, Dima)

```bash
npm run voice:test:kokoro-ru
```

Скачает [zaakirio/kokoro-ru](https://huggingface.co/zaakirio/kokoro-ru) (~400+ MB) в `voice-test/models/kokoro-ru/`.

## Chatterbox

Отдельный venv **Python 3.11** (не смешивать с Kokoro на 3.13):

```bash
npm run voice:test:chatterbox
```

Нужен **PyTorch 2.6+** (есть на Apple Silicon / Linux). На **Intel Mac** PyPI часто даёт только torch 2.2 — Chatterbox может остаться «нет» или упасть при озвучке; тогда используйте Edge/Kokoro или машину с M‑чипом.

### Kokoro — файлы модели

Скачайте с [релизов kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx/releases) и положите в `voice-test/models/`:

- `kokoro-v1.0.onnx`
- `voices-v1.0.bin`

Или укажите пути через `KOKORO_ONNX` и `KOKORO_VOICES`.

Первый запуск Chatterbox скачивает веса через Hugging Face (несколько ГБ).

## API

`POST /api/tts` — JSON:

```json
{ "engine": "edge", "text": "Привет!", "voice": "ru-RU-SvetlanaNeural", "rate": 1 }
```

`engine`: `edge` | `kokoro` | `chatterbox`

Ответ: `{ "engine", "mimeType", "audio" }` — `audio` в base64.

`GET /api/status` — какие движки доступны.
