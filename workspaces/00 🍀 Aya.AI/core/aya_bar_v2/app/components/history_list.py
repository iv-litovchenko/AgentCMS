"""Last recognized message card."""

import re
import tkinter as tk

from app import theme

EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF\U00002700-\U000027BF\U000024C2-\U0001F251]")


def sanitize_text(text: str) -> str:
    cleaned = EMOJI_RE.sub("", text)
    return " ".join(cleaned.split())


def split_time_and_text(row: str) -> tuple[str, str]:
    if "—" in row:
        left, right = row.split("—", 1)
        return left.strip(), right.strip()
    return "", row.strip()


class HistoryList(tk.Frame):
    def __init__(self, parent: tk.Misc) -> None:
        super().__init__(parent, bg=theme.BG)
        self.card = tk.Frame(
            self,
            bg=theme.PANEL,
            highlightbackground="#3a3a5f",
            highlightthickness=1,
            bd=0,
        )
        self.card.pack(fill="x", padx=2, pady=(0, 0))

        self.title = tk.Label(
            self.card,
            text="Последнее сообщение",
            bg=theme.PANEL,
            fg=theme.MUTED,
            font=("Helvetica", 10, "bold"),
            anchor="w",
        )
        self.title.pack(fill="x", padx=12, pady=(10, 4))

        self.message = tk.Label(
            self.card,
            text="—",
            bg=theme.PANEL,
            fg=theme.TEXT,
            font=("Helvetica", 11),
            justify="left",
            anchor="w",
            wraplength=360,
        )
        self.message.pack(fill="x", padx=12, pady=(0, 12))

    def update(self, items: list[str]) -> None:
        if not items:
            self.message.configure(text="—")
            return

        raw = items[0]
        _timestamp, text = split_time_and_text(raw)
        text = sanitize_text(text)
        if not text:
            self.message.configure(text="—")
            return

        self.message.configure(text=text)
