"""Режим ввода из assistant_settings.json (тот же файл, что пишет Aya Bar)."""

from __future__ import annotations

import json
from pathlib import Path

_VALID = frozenset({"fn_button", "always", "meeting", "wake_name", "disabled"})
_LEGACY = {
    "listen": "always",
    "button": "fn_button",
    "voice_profile": "always",
    # если в JSON когда-то окажется подпись с UI или опечатка
    "off": "disabled",
    "none": "disabled",
    "false": "disabled",
    "отключен": "disabled",
    "отключено": "disabled",
    "выключен": "disabled",
    "выключено": "disabled",
}


def normalize_voice_input_mode(raw: str) -> str:
    s = (raw or "").strip().lower()
    if not s:
        s = "always"
    m = _LEGACY.get(s, s)
    return m if m in _VALID else "always"


def load_voice_input_mode(settings_file: Path) -> str:
    try:
        text = settings_file.read_text(encoding="utf-8-sig")
        payload = json.loads(text)
        if not isinstance(payload, dict):
            return "always"
        raw = payload.get("voice_input_mode", "always")
        if raw is None:
            raw = "always"
        mode = normalize_voice_input_mode(str(raw))
        return mode
    except Exception:
        pass
    return "always"


def voice_input_disabled(settings_file: Path) -> bool:
    return load_voice_input_mode(settings_file) == "disabled"
