# Voice Setup — Configuration

**Created:** 2026-04-29  
**Status:** Active

## Installed Components

### Virtual Environment
```bash
source ~/voice-env/bin/activate
```

### Packages
- `faster-whisper` — Speech-to-Text
- `torch`, `torchaudio` — PyTorch backend
- `silero` — TTS (5 voices)
- `piper-tts` — TTS (2 voices)
- `scipy` — WAV file handling

## Voice Models Location

### Silero (Primary)
- **Path:** `~/.cache/torch/hub/snakers4_silero-models_master`
- **Russian model:** v3_1_ru (59MB)
- **Available voices:**
  - `kseniya` 👩 — neutral (default)
  - `baya` 👩 — warm, friendly
  - `xenia` 👩 — expressive
  - `aidar` 👨 — neutral male
  - `eugene` 👨 — calm male

### Piper (Backup)
- **Path:** `~/.local/share/piper/`
- **Models:**
  - `ru_RU-irina-medium.onnx` 👩
  - `ru_RU-ruslan-medium.onnx` 👨

## Usage Examples

### STT (Whisper)
```python
from faster_whisper import WhisperModel
m = WhisperModel('medium', device='cpu', compute_type='int8')
segs, info = m.transcribe('audio.ogg', beam_size=5, language='ru')
transcript = ' '.join([s.text for s in segs])
```

### TTS (Silero)
```python
import torch
model, _ = torch.hub.load(repo_path, 'silero_tts', 
                          language='ru', speaker='v3_1_ru',
                          device='cpu', source='local')
audio = model.apply_tts(text="Привет!", speaker='kseniya', sample_rate=48000)
```

### Convert to Telegram Format
```bash
ffmpeg -i input.wav -c:a libopus -b:a 24k output.ogg
```

## User Preferences

**Voice selection:** "От настроения" — switch based on context

See `Config/VoicePreferences.md` for mood mapping.

## Media Output Path

Use `/home/openclaw/.openclaw/media/inbound/` for Telegram voice messages.
