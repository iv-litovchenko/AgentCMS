"""Configuration and paths for aya_voice_v2."""

from dataclasses import dataclass
import os
from pathlib import Path


def workspace_root_path() -> Path:
    """Корень workspace (родитель `00 🍀 Aya.AI/`), там же обычно лежит `.env`."""
    return Path(__file__).resolve().parents[4]


def core_integration_dir() -> Path:
    """Общие файлы бар ↔ голос: `core/integration/` (раньше `aya-bar/`)."""
    return Path(__file__).resolve().parents[2] / "integration"


def assistant_settings_json_path() -> Path:
    """Тот же путь, что и у бара (`AYA_ASSISTANT_SETTINGS` или `core/integration/assistant_settings.json`)."""
    env = (os.environ.get("AYA_ASSISTANT_SETTINGS") or "").strip()
    if env:
        return Path(env).expanduser().resolve()
    return core_integration_dir() / "assistant_settings.json"


def load_workspace_dotenv() -> None:
    """Подтянуть переменные из `<корень проекта>/.env` (не перетирает уже выставленные в shell)."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    env_file = workspace_root_path() / ".env"
    if env_file.is_file():
        load_dotenv(env_file, override=False)


@dataclass(frozen=True)
class VoiceConfig:
    chunk: int = 1024
    channels: int = 1
    rate: int = 16000
    threshold: int = 1000
    speech_timeout: float = 2.6
    listening_idle_guard_sec: float = 1.9
    max_record_sec: int = 30
    min_audio_sec: float = 0.4
    start_voice_chunks: int = 2
    pre_roll_sec: float = 1.0
    post_roll_sec: float = 0.35
    continue_threshold_ratio: float = 0.5
    cooldown_after_record_sec: float = 1.2
    live_status_every_chunks: int = 8
    language: str = "ru-RU"
    vad_enabled: bool = True
    vad_mode: int = 2  # 0..3 (3 is strictest)
    vad_start_ratio: float = 0.2
    vad_continue_ratio: float = 0.12

    @property
    def workspace_root(self) -> Path:
        return workspace_root_path()

    @property
    def archive_dir(self) -> Path:
        return self.workspace_root / "08 ❄️ Archive" / "04 Voice"

    @property
    def audio_dir(self) -> Path:
        return self.archive_dir / "Audio"

    @property
    def text_dir(self) -> Path:
        return self.archive_dir / "Text"

    @property
    def reply_audio_dir(self) -> Path:
        """Долговременное хранение озвучки ответа Аи (MP3)."""
        return self.archive_dir / "ReplyAudio"

    @property
    def reply_text_dir(self) -> Path:
        """Метаданные + текст запроса/ответа для каждого reply_*.mp3."""
        return self.archive_dir / "ReplyText"

    @property
    def status_file(self) -> Path:
        return core_integration_dir() / "voice_status.txt"

    @property
    def assistant_settings_file(self) -> Path:
        return assistant_settings_json_path()

    @property
    def stop_tts_signal_file(self) -> Path:
        """Создаёт бар (touch) — голос обрывает afplay при воспроизведении."""
        return core_integration_dir() / "voice_stop_tts"
