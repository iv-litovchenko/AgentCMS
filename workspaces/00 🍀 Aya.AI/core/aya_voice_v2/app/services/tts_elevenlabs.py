"""ElevenLabs TTS + macOS playback (afplay)."""

from __future__ import annotations

import json
import os
import tempfile
import urllib.error
import urllib.request
from pathlib import Path


class ElevenLabsTts:
    def __init__(self) -> None:
        self.api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
        self.voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "").strip()
        self.model_id = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2").strip()

    def is_configured(self) -> bool:
        return bool(self.api_key and self.voice_id)

    def synthesize_to_file(self, text: str, output_path: Path | None = None) -> Path:
        if not self.is_configured():
            raise RuntimeError("Задай ELEVENLABS_API_KEY и ELEVENLABS_VOICE_ID")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"
        payload = json.dumps(
            {
                "text": text,
                "model_id": self.model_id,
            },
            ensure_ascii=False,
        ).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "xi-api-key": self.api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                audio = resp.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            raise RuntimeError(f"ElevenLabs HTTP {exc.code}: {detail}") from exc
        if output_path is not None:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(audio)
            return output_path
        path = Path(tempfile.gettempdir()) / "aya_voice_elevenlabs_reply.mp3"
        path.write_bytes(audio)
        return path

    def speak(self, text: str, output_path: Path | None = None) -> bool:
        from app.services.audio_playback import play_mp3_blocking

        path = self.synthesize_to_file(text, output_path=output_path)
        _ = play_mp3_blocking(path)
        return True
