"""Архив ответов Аи: MP3 (TTS) + рядом TXT с запросом и ответом."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path


class ReplyArchiveWriter:
    def __init__(self, reply_audio_dir: Path, reply_text_dir: Path) -> None:
        self.reply_audio_dir = reply_audio_dir
        self.reply_text_dir = reply_text_dir

    def ensure_dirs(self) -> None:
        self.reply_audio_dir.mkdir(parents=True, exist_ok=True)
        self.reply_text_dir.mkdir(parents=True, exist_ok=True)

    def allocate_reply_paths(self) -> tuple[Path, Path]:
        stem = f"reply_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        return (
            self.reply_audio_dir / f"{stem}.mp3",
            self.reply_text_dir / f"{stem}.txt",
        )

    @staticmethod
    def write_sidecar(
        txt_path: Path,
        *,
        audio_rel_name: str,
        user_text: str,
        reply_text: str,
        llm_line: str,
        tts_backend: str,
    ) -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        payload = (
            f"Дата: {now}\n"
            f"Аудио: {audio_rel_name}\n"
            f"LLM: {llm_line}\n"
            f"TTS: {tts_backend}\n\n"
            f"--- Запрос (STT) ---\n{user_text}\n\n"
            f"--- Ответ Аи ---\n{reply_text}\n"
        )
        txt_path.write_text(payload, encoding="utf-8")
