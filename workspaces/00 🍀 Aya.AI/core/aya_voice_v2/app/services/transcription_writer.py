"""Persists audio and text transcription outputs."""

from datetime import datetime
from pathlib import Path
import wave


class TranscriptionWriter:
    def __init__(self, audio_dir: Path, text_dir: Path, channels: int, rate: int) -> None:
        self.audio_dir = audio_dir
        self.text_dir = text_dir
        self.channels = channels
        self.rate = rate

    def ensure_dirs(self) -> None:
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        self.text_dir.mkdir(parents=True, exist_ok=True)

    def save_wav(self, frames: list[bytes]) -> Path:
        now = datetime.now().strftime("%Y%m%d_%H%M%S")
        output = self.audio_dir / f"voice_{now}.wav"
        with wave.open(str(output), "wb") as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(2)
            wf.setframerate(self.rate)
            wf.writeframes(b"".join(frames))
        return output

    def save_txt(self, wav_path: Path, text: str) -> Path:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        stem = wav_path.stem
        output = self.text_dir / f"{stem}.txt"
        payload = (
            f"Дата: {now}\n"
            f"Аудио: {wav_path.name}\n\n"
            f"{text}\n"
        )
        output.write_text(payload, encoding="utf-8")
        return output
