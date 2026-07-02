"""Writes runtime status for Aya bar integration."""

from datetime import datetime
from pathlib import Path


class StatusWriter:
    def __init__(self, status_file: Path) -> None:
        self.status_file = status_file

    def write(self, status: str, phrase: str = "") -> None:
        self.status_file.parent.mkdir(parents=True, exist_ok=True)
        payload = f"{status}\n{phrase}\n{datetime.now().isoformat()}"
        self.status_file.write_text(payload, encoding="utf-8")
