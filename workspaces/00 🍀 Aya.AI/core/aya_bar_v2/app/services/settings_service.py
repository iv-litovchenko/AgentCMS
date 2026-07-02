"""Persistent quick settings for Aya bar controls."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path


VOICE_INPUT_MODES = ("fn_button", "voice_profile", "always", "meeting", "wake_name", "disabled")

VOICE_INPUT_MODE_LABELS: dict[str, str] = {
    "fn_button": "Слышу по кнопке Fn",
    "voice_profile": "Слышу по распознованию твоего голоса (beta)",
    "always": "Слышу все и всегда",
    "meeting": "Записываю встречу (разговор)",
    "wake_name": "Отзываюсь по моему имени",
    "disabled": "Отключен",
}

# В списке бара показываются, но выбрать нельзя (ожидают реализации).
VOICE_INPUT_MODES_UI_DISABLED = frozenset({"voice_profile"})

_LEGACY_VOICE_INPUT_MODES = {"listen": "always", "button": "fn_button"}

VOICE_OUTPUT_MODELS = ("aya-voice", "openai", "local")


@dataclass
class QuickSettings:
    voice_input_mode: str = "always"
    voice_response_enabled: bool = False
    voice_response_model: str = "aya-voice"
    computer_control_enabled: bool = False
    safe_guard_stub_enabled: bool = False
    window_topmost: bool = True

    def normalize(self) -> "QuickSettings":
        self.voice_input_mode = _LEGACY_VOICE_INPUT_MODES.get(
            self.voice_input_mode, self.voice_input_mode
        )
        if self.voice_input_mode in VOICE_INPUT_MODES_UI_DISABLED:
            self.voice_input_mode = "always"
        if self.voice_input_mode not in VOICE_INPUT_MODES:
            self.voice_input_mode = "always"
        if self.voice_response_model not in VOICE_OUTPUT_MODELS:
            self.voice_response_model = "aya-voice"
        return self


class SettingsService:
    def __init__(self, settings_file: Path) -> None:
        self.settings_file = settings_file

    def load(self) -> QuickSettings:
        if not self.settings_file.exists():
            return QuickSettings()
        try:
            payload = json.loads(self.settings_file.read_text(encoding="utf-8-sig"))
            if not isinstance(payload, dict):
                return QuickSettings()
            data = QuickSettings(
                voice_input_mode=str(payload.get("voice_input_mode", "always")),
                voice_response_enabled=bool(payload.get("voice_response_enabled", False)),
                voice_response_model=str(payload.get("voice_response_model", "aya-voice")),
                computer_control_enabled=bool(payload.get("computer_control_enabled", False)),
                safe_guard_stub_enabled=bool(payload.get("safe_guard_stub_enabled", False)),
                window_topmost=bool(payload.get("window_topmost", True)),
            )
            return data.normalize()
        except Exception:
            return QuickSettings()

    def save(self, settings: QuickSettings) -> None:
        data = settings.normalize()
        self.settings_file.parent.mkdir(parents=True, exist_ok=True)
        body = json.dumps(asdict(data), ensure_ascii=False, indent=2)
        path = self.settings_file
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(body, encoding="utf-8")
        tmp.replace(path)
