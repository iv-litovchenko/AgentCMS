"""Google TTS через библиотеку gTTS (неофициальный клиент). Требуется интернет."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path


class GttsTts:
    def save_to_file(self, text: str, output_path: Path) -> bool:
        """Только запись MP3 без воспроизведения."""
        from gtts import gTTS

        raw = (text or "").strip()
        if not raw:
            return False
        lang = os.environ.get("VOICE_GTTS_LANG", "ru").strip() or "ru"
        tld = os.environ.get("VOICE_GTTS_TLD", "com").strip() or "com"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        tts = gTTS(text=raw, lang=lang, tld=tld)
        tts.save(str(output_path))
        return True

    def speak(self, text: str, output_path: Path | None = None) -> bool:
        from app.services.audio_playback import play_mp3_blocking

        raw = (text or "").strip()
        if not raw:
            return False
        lang = os.environ.get("VOICE_GTTS_LANG", "ru").strip() or "ru"
        tld = os.environ.get("VOICE_GTTS_TLD", "com").strip() or "com"

        if output_path is not None:
            if not self.save_to_file(raw, output_path):
                return False
            _ = play_mp3_blocking(output_path)
            return True

        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp.close()
        path = Path(tmp.name)
        try:
            if not self.save_to_file(raw, path):
                return False
            _ = play_mp3_blocking(path)
            return True
        finally:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
