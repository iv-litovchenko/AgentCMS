"""Status info card."""

import tkinter as tk

from app import theme


def status_color(text: str) -> str:
    if "⏸️" in text:
        return theme.MUTED
    if "🔴" in text:
        return theme.DANGER
    if "🟡" in text:
        return theme.WARN
    if "🔊" in text:
        return theme.ACCENT
    return theme.GOOD


def battery_color(percent: int) -> str:
    if percent <= 20:
        return theme.DANGER
    if percent <= 50:
        return theme.WARN
    return theme.GOOD


class StatusCard(tk.Frame):
    def __init__(self, parent: tk.Misc) -> None:
        super().__init__(parent, bg=theme.BG, padx=12, pady=8)
        self.status_label = tk.Label(
            self,
            text="🟢 Слушаю",
            bg=theme.BG,
            fg=theme.GOOD,
            font=("Helvetica", 14, "bold"),
            justify="center",
        )
        self.status_label.pack(anchor="center")

        self.meta_label = tk.Label(
            self,
            text="🔋 --%   🕐 --:--:--",
            bg=theme.BG,
            fg=theme.MUTED,
            font=("Helvetica", 11),
            justify="center",
        )
        self.meta_label.pack(anchor="center", pady=(6, 0))

        self.battery_bar = tk.Canvas(
            self,
            width=220,
            height=6,
            bg=theme.BG,
            highlightthickness=0,
            bd=0,
        )
        self.battery_bar.pack(anchor="center", pady=(5, 4))

        self.phrase_label = tk.Label(
            self,
            text="...",
            bg=theme.BG,
            fg=theme.TEXT,
            font=("Helvetica", 11),
            wraplength=320,
            justify="center",
        )
        self.phrase_label.pack(anchor="center", pady=(8, 0))

        self.time_label = tk.Label(
            self,
            text="",
            bg=theme.BG,
            fg=theme.MUTED,
            font=("Helvetica", 10),
            justify="center",
        )
        self.time_label.pack(anchor="center", pady=(8, 0))

    def update(
        self,
        status: str,
        phrase: str,
        updated_at: str,
        battery: str,
        current_time: str,
    ) -> None:
        percent = self._extract_battery_percent(battery)
        self.status_label.config(text=status, fg=status_color(status))
        self.meta_label.config(text=f"🔋 {battery}   🕐 {current_time}")
        self._draw_battery_bar(percent)
        self.phrase_label.config(text=phrase or "...")
        self.time_label.config(text=updated_at or "")

    def _extract_battery_percent(self, battery: str) -> int:
        try:
            raw = battery.strip().replace("%", "")
            return max(0, min(100, int(raw)))
        except Exception:
            return 0

    def _draw_battery_bar(self, percent: int) -> None:
        width = 220
        height = 6
        fill = int(width * (percent / 100))
        self.battery_bar.delete("all")
        self.battery_bar.create_line(0, height // 2, width, height // 2, fill="#353552", width=2)
        if fill > 0:
            self.battery_bar.create_line(0, height // 2, fill, height // 2, fill=battery_color(percent), width=3)
