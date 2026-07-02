"""Programmatic app icon for Tk windows."""

from __future__ import annotations

import tkinter as tk


def build_app_icon(size: int = 64) -> tk.PhotoImage:
    """Create a neon pulse icon without external assets."""
    img = tk.PhotoImage(width=size, height=size)

    # Dark background
    img.put("#17172b", to=(0, 0, size, size))

    c = size // 2

    def draw_circle(radius: int, color: str) -> None:
        rr = radius * radius
        for y in range(size):
            dy = y - c
            for x in range(size):
                dx = x - c
                if dx * dx + dy * dy <= rr:
                    img.put(color, (x, y))

    # Soft halo + core pulse
    draw_circle(22, "#5a2a69")
    draw_circle(17, "#b54895")
    draw_circle(12, "#ff5ca8")
    draw_circle(6, "#ff9bc8")

    # Tiny star sparkle
    sparkle = [(47, 16), (48, 16), (49, 16), (48, 15), (48, 17)]
    for x, y in sparkle:
        if 0 <= x < size and 0 <= y < size:
            img.put("#ffe8f3", (x, y))

    return img
