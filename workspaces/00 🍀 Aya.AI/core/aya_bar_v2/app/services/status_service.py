"""Reads runtime status from compatibility files."""

from dataclasses import dataclass
from datetime import datetime
import json
from pathlib import Path
import subprocess


@dataclass
class VoiceStatus:
    state: str = "🟡 Ожидаю"
    phrase: str = ""
    updated_at: str = ""
    battery: str = "--%"
    current_time: str = "--:--:--"


class StatusService:
    def __init__(self, status_file: Path, history_file: Path) -> None:
        self.status_file = status_file
        self.history_file = history_file

    def read_status(self) -> VoiceStatus:
        current_time = datetime.now().strftime("%H:%M:%S")
        battery = self._read_battery_percent()

        if not self.status_file.exists():
            return VoiceStatus(battery=battery, current_time=current_time)
        try:
            lines = self.status_file.read_text(encoding="utf-8").splitlines()
            state = lines[0].strip() if len(lines) > 0 else "🟡 Ожидаю"
            phrase = lines[1].strip() if len(lines) > 1 else ""
            updated = lines[2].strip() if len(lines) > 2 else ""

            # Guard against stale status file when voice process has stopped.
            if "🔊" in state:
                max_age = 120.0
            elif "🟢" in state:
                max_age = 90.0
            else:
                max_age = 6.0
            if self._is_stale(updated, max_age_sec=max_age):
                state = "🟡 Ожидаю"
                phrase = ""

            return VoiceStatus(
                state=state,
                phrase=phrase,
                updated_at=updated,
                battery=battery,
                current_time=current_time,
            )
        except Exception:
            return VoiceStatus(battery=battery, current_time=current_time)

    def _is_stale(self, updated_at: str, max_age_sec: float) -> bool:
        if not updated_at:
            return True
        try:
            ts = datetime.fromisoformat(updated_at)
            age = (datetime.now() - ts).total_seconds()
            return age > max_age_sec
        except Exception:
            return True

    def read_history(self) -> list[str]:
        if not self.history_file.exists():
            return []
        try:
            payload = json.loads(self.history_file.read_text(encoding="utf-8"))
            if isinstance(payload, list):
                return [str(item) for item in payload[:10]]
            return []
        except Exception:
            return []

    def _read_battery_percent(self) -> str:
        try:
            result = subprocess.run(
                ["pmset", "-g", "batt"],
                capture_output=True,
                text=True,
                timeout=2,
            )
            output = result.stdout
            for part in output.split(";"):
                if "%" in part:
                    raw = part.split("%")[0].strip().split()[-1]
                    return f"{raw}%"
        except Exception:
            pass
        return "--%"
