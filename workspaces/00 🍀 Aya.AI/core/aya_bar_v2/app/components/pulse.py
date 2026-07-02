"""Pulse animation component with multiple style presets."""

import tkinter as tk
import math
import os

from app import theme


class Pulse(tk.Canvas):
    # 10 heart-like styles
    HEART_MODES = [
        "heart_dualwave",
        "heart_breath",
        "heart_softbeat",
        "heart_orbit",
        "heart_bloom",
        "heart_deep",
        "heart_quick",
        "heart_glow",
        "heart_lotus",
        "heart_minimal",
    ]
    # 5 JARVIS-like styles
    JARVIS_MODES = [
        "jarvis_arc",
        "jarvis_core",
        "jarvis_scan",
        "jarvis_hud",
        "jarvis_quantum",
    ]
    ALL_MODES = HEART_MODES + JARVIS_MODES

    def __init__(self, parent: tk.Misc, size: int = 96, mode: str | None = None) -> None:
        super().__init__(parent, width=size, height=size, bg=theme.BG, highlightthickness=0)
        self.size = size
        self.t = 0.0
        self.mode = mode or os.environ.get("AYA_PULSE_MODE", "heart_dualwave")
        if self.mode not in self.ALL_MODES:
            self.mode = "heart_dualwave"
        self.after(40, self._tick)

    def set_mode(self, mode: str) -> None:
        """Switch pulse style at runtime."""
        if mode in self.ALL_MODES:
            self.mode = mode

    def _draw_ring(self, c: int, radius: int, color: str, width: int = 1) -> None:
        self.create_oval(c - radius, c - radius, c + radius, c + radius, outline=color, width=width)

    def _draw_core(self, c: int, radius: int, fill: str, outline: str = "", width: int = 1) -> None:
        self.create_oval(c - radius, c - radius, c + radius, c + radius, fill=fill, outline=outline, width=width)

    def _wave(self, speed: float, a: float, b: float, phase: float = 0.0) -> float:
        val = 0.55 + a * math.sin(self.t * speed + phase) + b * math.sin(self.t * speed * 2.2 + phase)
        return max(0.0, min(1.0, val))

    def _render_heart_mode(self, c: int) -> None:
        beat = self._wave(1.0, 0.30, 0.12)
        speed = 0.14
        if self.mode == "heart_breath":
            beat = self._wave(0.7, 0.22, 0.08)
            speed = 0.10
        elif self.mode == "heart_softbeat":
            beat = self._wave(0.9, 0.24, 0.06)
            speed = 0.11
        elif self.mode == "heart_orbit":
            beat = self._wave(1.1, 0.34, 0.10)
            speed = 0.16
        elif self.mode == "heart_bloom":
            beat = self._wave(1.0, 0.32, 0.16, 0.5)
            speed = 0.15
        elif self.mode == "heart_deep":
            beat = self._wave(0.8, 0.40, 0.10)
            speed = 0.12
        elif self.mode == "heart_quick":
            beat = self._wave(1.6, 0.26, 0.12)
            speed = 0.22
        elif self.mode == "heart_glow":
            beat = self._wave(1.0, 0.28, 0.10)
            speed = 0.15
        elif self.mode == "heart_lotus":
            beat = self._wave(1.0, 0.30, 0.12, 1.0)
            speed = 0.14
        elif self.mode == "heart_minimal":
            beat = self._wave(0.8, 0.18, 0.05)
            speed = 0.09

        self.t += speed
        outer = 31 + int(beat * 10)
        mid = 24 + int(beat * 7)
        core = 17 + int(beat * 6)
        self._draw_ring(c, outer + 2, "#3f2148", 1)
        self._draw_ring(c, outer, "#6b3875", 1)
        self._draw_ring(c, mid, "#a44f90", 2)
        self._draw_core(c, core, fill=theme.ACCENT, outline="#ff2f93", width=2)
        self._draw_core(c, max(6, core - 6), fill="#ff86c0")

        # Optional orbit sparkle in selected styles
        if self.mode in {"heart_dualwave", "heart_orbit", "heart_bloom", "heart_glow"}:
            angle = self.t * 1.3
            r = mid + 4
            sx = c + int(r * math.cos(angle))
            sy = c + int(r * math.sin(angle))
            self._draw_core(sx, 2, fill="#ffd7eb")

    def _render_jarvis_mode(self, c: int) -> None:
        beat = self._wave(1.2, 0.22, 0.08)
        speed = 0.18
        if self.mode == "jarvis_core":
            beat = self._wave(1.0, 0.18, 0.06)
            speed = 0.14
        elif self.mode == "jarvis_scan":
            beat = self._wave(1.4, 0.20, 0.10)
            speed = 0.20
        elif self.mode == "jarvis_hud":
            beat = self._wave(0.9, 0.16, 0.05)
            speed = 0.12
        elif self.mode == "jarvis_quantum":
            beat = self._wave(1.5, 0.24, 0.12, 0.4)
            speed = 0.22

        self.t += speed
        base = 20 + int(beat * 6)
        self._draw_ring(c, base + 14, "#1e4f6a", 1)
        self._draw_ring(c, base + 8, "#2e7ea3", 2)
        self._draw_ring(c, base + 2, "#49b5de", 1)
        self._draw_core(c, base - 5, fill="#0f2330", outline="#4dd1ff", width=2)
        self._draw_core(c, max(4, base - 11), fill="#73e1ff")

        # rotating hud marker
        angle = self.t * 1.8
        r = base + 10
        sx = c + int(r * math.cos(angle))
        sy = c + int(r * math.sin(angle))
        self._draw_core(sx, 2, fill="#9feeff")

    def _tick(self) -> None:
        c = self.size // 2
        self.delete("all")
        if self.mode.startswith("jarvis_"):
            self._render_jarvis_mode(c)
        else:
            self._render_heart_mode(c)

        self.after(40, self._tick)
