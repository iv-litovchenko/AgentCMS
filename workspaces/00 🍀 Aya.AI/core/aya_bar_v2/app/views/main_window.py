"""Main window composition."""

from __future__ import annotations

import os
import tkinter as tk
import traceback

from app import theme
from app.components.app_icon import build_app_icon
from app.components.header import Header
from app.components.nebula_bg import nebula_background_available, render_nebula_photo
from app.components.pulse import Pulse
from app.components.quick_settings import QuickSettingsPanel
from app.components.status_card import StatusCard
from app.config import AppConfig
from app.services.settings_service import SettingsService
from app.services.status_service import StatusService


def _env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes", "on")


class MainWindow:
    def __init__(
        self,
        config: AppConfig,
        status_service: StatusService,
        settings_service: SettingsService,
    ) -> None:
        self.config = config
        self.status_service = status_service
        self.settings_service = settings_service

        self.root = tk.Tk()
        self.root.title(config.title)
        self.root.geometry(config.window_size)
        self.root.attributes("-topmost", self.settings_service.load().window_topmost)
        self.root.attributes("-alpha", config.window_alpha)
        self._place_bottom_center()

        # Keep a reference so Tk does not garbage-collect the icon.
        self._app_icon = build_app_icon()
        self.root.iconphoto(True, self._app_icon)

        self._nebula_photo: object | None = None
        self._nebula_size: tuple[int, int] | None = None
        self._nebula_resize_after: str | None = None
        self._bg_label: tk.Label | None = None
        self._layer: tk.Frame | None = None

        # Фон Nebula — только по явному AYA_BAR_NEBULA=1 (иначе macOS Tk + Pillow часто ломают окно).
        use_nebula = _env_flag("AYA_BAR_NEBULA") and nebula_background_available() and not _env_flag(
            "AYA_BAR_NO_NEBULA"
        )

        if use_nebula:
            self.root.configure(bg=theme.BG)
            self._layer = tk.Frame(self.root, bg=theme.BG, highlightthickness=0)
            self._layer.pack(fill="both", expand=True)
            self._bg_label = tk.Label(self._layer, bd=0, highlightthickness=0, bg=theme.BG)
            self._bg_label.place(x=0, y=0, relwidth=1, relheight=1)
            self._layer.bind("<Configure>", self._on_layer_configure, add="+")
            pad = 12
            self.container = tk.Frame(self._layer, bg=theme.BG, highlightthickness=0)
            self.container.pack(fill="both", expand=True, padx=pad, pady=pad)
        else:
            self.root.configure(bg=theme.BG)
            self.container = tk.Frame(self.root, bg=theme.BG)
            self.container.pack(fill="both", expand=True)

        try:
            Header(self.container, stop_tts_file=self.config.stop_tts_signal_file).pack(
                fill="x", padx=16, pady=(12, 0)
            )
            self.pulse_widget = Pulse(self.container)
            self.pulse_widget.pack(pady=10)

            self.status_card = StatusCard(self.container)
            self.status_card.pack(padx=16, pady=(2, 12), anchor="n")

            self.settings_panel = QuickSettingsPanel(
                self.container,
                self.settings_service,
                stop_tts_file=self.config.stop_tts_signal_file,
            )
            self.settings_panel.pack(fill="x", padx=16, pady=(0, 14), side="bottom")

            self._tick()
            if self._bg_label is not None and self._layer is not None:
                self._bg_label.lower()
                self.container.lift()
                self.root.after(100, self._refresh_nebula_bg)
        except Exception as err:
            self._log_error("UI init error", err)
            self._show_fallback(err)

    def _on_layer_configure(self, event: tk.Event) -> None:
        if self._layer is None or self._bg_label is None:
            return
        if getattr(event, "widget", None) is not self._layer:
            return
        if self._nebula_resize_after is not None:
            try:
                self.root.after_cancel(self._nebula_resize_after)
            except (tk.TclError, ValueError):
                pass
        self._nebula_resize_after = self.root.after(150, self._refresh_nebula_bg)

    def _refresh_nebula_bg(self) -> None:
        self._nebula_resize_after = None
        if self._bg_label is None or self._layer is None:
            return
        try:
            self.root.update_idletasks()
            w = max(self._layer.winfo_width(), 4)
            h = max(self._layer.winfo_height(), 4)
            if w < 120 or h < 120:
                return
            if self._nebula_size == (w, h) and self._nebula_photo is not None:
                return
            self._nebula_size = (w, h)
            photo = render_nebula_photo(w, h)
            if photo is None:
                return
            self._nebula_photo = photo
            self._bg_label.configure(image=self._nebula_photo)
            self._bg_label.lower()
            self.container.lift()
        except Exception as err:
            self._log_error("Nebula background error", err)

    def _tick(self) -> None:
        try:
            status = self.status_service.read_status()
            self.status_card.update(
                status.state,
                status.phrase,
                status.updated_at,
                status.battery,
                status.current_time,
            )
        except Exception as err:
            self._log_error("Tick update error", err)
        finally:
            self.root.after(self.config.update_ms, self._tick)

    def _show_fallback(self, err: Exception) -> None:
        for child in self.container.winfo_children():
            child.destroy()
        tk.Label(
            self.container,
            text="Aya Bar v2 failed to render.\nCheck runtime.log",
            bg=theme.BG,
            fg=theme.TEXT,
            font=("Helvetica", 14, "bold"),
            justify="center",
        ).pack(pady=30)
        tk.Label(
            self.container,
            text=str(err),
            bg=theme.BG,
            fg=theme.WARN,
            font=("Helvetica", 11),
            wraplength=360,
            justify="left",
        ).pack(padx=20)

    def _log_error(self, prefix: str, err: Exception) -> None:
        self.config.log_file.parent.mkdir(parents=True, exist_ok=True)
        payload = f"{prefix}: {err}\n{traceback.format_exc()}\n"
        self.config.log_file.write_text(payload, encoding="utf-8")

    def _place_bottom_center(self, bottom_margin: int = 28) -> None:
        """Place window centered horizontally and near bottom edge."""
        width = 430
        height = 700
        geometry_head = self.config.window_size.split("+", 1)[0]
        if "x" in geometry_head:
            raw_w, raw_h = geometry_head.split("x", 1)
            if raw_w.isdigit():
                width = int(raw_w)
            if raw_h.isdigit():
                height = int(raw_h)

        self.root.update_idletasks()
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()

        x = max(0, (screen_w - width) // 2)
        y = max(0, screen_h - height - bottom_margin)
        self.root.geometry(f"{width}x{height}+{x}+{y}")

    def run(self) -> None:
        self.root.mainloop()
