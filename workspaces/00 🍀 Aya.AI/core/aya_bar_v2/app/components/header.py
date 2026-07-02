"""Header component."""

from __future__ import annotations

import subprocess
import tkinter as tk
from pathlib import Path

from app import theme
from app.components.about_dialog import show_about_program

# Совпадает с aya_voice_v2/scripts/run.sh
_VOICE_PID_FILE = Path("/tmp/aya_voice_v2.pid")


def _signal_voice_process_usr1() -> None:
    """Дублирует файл-сигнал: SIGUSR1 доходит до Python даже при долгой блокировке в C (PyAudio)."""
    try:
        raw = _VOICE_PID_FILE.read_text(encoding="utf-8").strip()
        if raw.isdigit() and int(raw) > 0:
            subprocess.run(
                ["kill", "-USR1", raw],
                check=False,
                capture_output=True,
                timeout=2,
            )
    except (OSError, ValueError, subprocess.TimeoutExpired):
        pass


def touch_stop_tts_signal(stop_tts_file: Path) -> None:
    """Создать сигнал остановки озвучки (файл + SIGUSR1 по PID из run.sh)."""
    try:
        stop_tts_file.parent.mkdir(parents=True, exist_ok=True)
        # write_text обновляет mtime даже если файл уже есть — надёжнее, чем touch() на части систем
        stop_tts_file.write_text("", encoding="utf-8")
    except OSError:
        pass
    _signal_voice_process_usr1()


class Header(tk.Frame):
    def __init__(self, parent: tk.Misc, stop_tts_file: Path) -> None:
        super().__init__(parent, bg=theme.BG)
        self._stop_tts_file = stop_tts_file

        row = tk.Frame(self, bg=theme.BG)
        row.pack(fill="x", pady=(8, 0))

        top_right = tk.Frame(row, bg=theme.BG)
        top_right.pack(side="right")
        tk.Button(
            top_right,
            text="?",
            command=lambda: show_about_program(self),
            bg=theme.BG,
            fg=theme.MUTED,
            activebackground=theme.PANEL,
            activeforeground=theme.TEXT,
            font=("Helvetica", 12, "bold"),
            relief="flat",
            bd=0,
            padx=8,
            pady=2,
            cursor="hand2",
            highlightthickness=1,
            highlightbackground=theme.MUTED,
            highlightcolor=theme.ACCENT,
        ).pack(side="right")
        tk.Button(
            top_right,
            text="Остановить голос",
            command=self._on_stop_tts,
            font=("Helvetica", 11, "bold"),
            bg=theme.BG,
            fg=theme.TEXT,
            activebackground=theme.PANEL,
            activeforeground=theme.TEXT,
            relief="flat",
            bd=0,
            padx=6,
            pady=2,
            cursor="hand2",
            highlightthickness=0,
        ).pack(side="right", padx=(0, 6))

        tk.Label(
            row,
            text="🌌 Aya.AI",
            bg=theme.BG,
            fg=theme.TEXT,
            font=("Helvetica", 20, "bold"),
            anchor="center",
        ).pack(side="left", fill="x", expand=True)

    def _on_stop_tts(self) -> None:
        touch_stop_tts_signal(self._stop_tts_file)
