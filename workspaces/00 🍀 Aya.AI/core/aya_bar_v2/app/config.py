"""Application config and paths."""

from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    title: str = "Personal AI Cognitive Operation System (Second Brain)"
    window_size: str = "430x700+100+100"
    update_ms: int = 500
    window_alpha: float = 0.9

    @property
    def root_dir(self) -> Path:
        return Path(__file__).resolve().parents[3]

    @property
    def integration_dir(self) -> Path:
        """Общие файлы бар ↔ голос (раньше `aya-bar/`)."""
        return Path(__file__).resolve().parents[2] / "integration"

    @property
    def status_file(self) -> Path:
        return self.integration_dir / "voice_status.txt"

    @property
    def history_file(self) -> Path:
        return self.integration_dir / "phrase_history.json"

    @property
    def log_file(self) -> Path:
        return self.root_dir / "core" / "aya_bar_v2" / "runtime.log"

    @property
    def settings_file(self) -> Path:
        env = (os.environ.get("AYA_ASSISTANT_SETTINGS") or "").strip()
        if env:
            return Path(env).expanduser().resolve()
        return self.integration_dir / "assistant_settings.json"

    @property
    def stop_tts_signal_file(self) -> Path:
        """Touch из бара → процесс голоса обрывает afplay. См. aya_voice_v2/audio_playback."""
        return self.integration_dir / "voice_stop_tts"
