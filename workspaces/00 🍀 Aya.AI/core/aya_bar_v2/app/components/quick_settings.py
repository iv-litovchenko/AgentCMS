"""Quick settings panel for interaction controls."""

from __future__ import annotations

import tkinter as tk
from pathlib import Path
from tkinter import messagebox
from tkinter import ttk

from app import theme
from app.components.header import touch_stop_tts_signal
from app.services.settings_service import (
    QuickSettings,
    SettingsService,
    VOICE_INPUT_MODE_LABELS,
    VOICE_INPUT_MODES,
    VOICE_INPUT_MODES_UI_DISABLED,
    VOICE_OUTPUT_MODELS,
)


class QuickSettingsPanel(tk.Frame):
    def __init__(
        self,
        parent: tk.Misc,
        settings_service: SettingsService,
        stop_tts_file: Path | None = None,
    ) -> None:
        super().__init__(parent, bg=theme.BG)
        self.settings_service = settings_service
        self._stop_tts_file = stop_tts_file or (
            settings_service.settings_file.parent / "voice_stop_tts"
        )
        self.current = self.settings_service.load()

        self.card = tk.Frame(
            self,
            bg=theme.PANEL,
            highlightbackground="#3a3a5f",
            highlightthickness=1,
            bd=0,
        )
        self.card.pack(fill="x")

        tk.Frame(self.card, bg=theme.ACCENT, height=2).pack(fill="x")

        tk.Label(
            self.card,
            text="Быстрые настройки",
            bg=theme.PANEL,
            fg=theme.TEXT,
            font=("Helvetica", 12, "bold"),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(10, 2))
        tk.Label(
            self.card,
            text="Режим взаимодействия с Aya",
            bg=theme.PANEL,
            fg=theme.MUTED,
            font=("Helvetica", 9),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(0, 8))

        self.voice_input_var = tk.StringVar(value=self.current.voice_input_mode)
        self.voice_response_enabled_var = tk.BooleanVar(value=self.current.voice_response_enabled)
        self.voice_response_model_var = tk.StringVar(value=self.current.voice_response_model)
        self.computer_control_var = tk.BooleanVar(value=self.current.computer_control_enabled)
        self.safe_guard_stub_var = tk.BooleanVar(value=self.current.safe_guard_stub_enabled)
        self.window_topmost_var = tk.BooleanVar(value=self.current.window_topmost)
        self._topwin = self.winfo_toplevel()

        self._build_voice_input_controls()
        self._build_voice_response_controls()
        self._build_computer_control_controls()
        self._build_safe_guard_stub_controls()
        self._build_window_topmost_controls()
        self._build_hint()
        self.voice_input_var.set(self.current.voice_input_mode)
        self._sync_voice_mode_combo()
        self.voice_response_enabled_var.set(self.current.voice_response_enabled)
        self.voice_response_model_var.set(self.current.voice_response_model)
        self.computer_control_var.set(self.current.computer_control_enabled)
        self.safe_guard_stub_var.set(self.current.safe_guard_stub_enabled)
        self.window_topmost_var.set(self.current.window_topmost)
        self._sync_toggle_visuals()
        self._save_now()

    def _build_voice_input_controls(self) -> None:
        row = tk.Frame(self.card, bg=theme.PANEL)
        row.pack(fill="x", padx=12, pady=(4, 2))
        tk.Label(
            row,
            text="Ввод голосом",
            bg=theme.PANEL,
            fg=theme.MUTED,
            font=("Helvetica", 10, "bold"),
            anchor="w",
        ).pack(fill="x")

        combo_row = tk.Frame(row, bg=theme.PANEL)
        combo_row.pack(fill="x", pady=(6, 0))
        labels = [VOICE_INPUT_MODE_LABELS[k] for k in VOICE_INPUT_MODES]
        self.voice_input_combo = ttk.Combobox(
            combo_row,
            values=labels,
            state="readonly",
            font=("Helvetica", 10),
            width=48,
        )
        self.voice_input_combo.pack(fill="x")
        self.voice_input_combo.bind("<<ComboboxSelected>>", self._on_voice_mode_combo)
        # Клавиатура / фокус без события ComboboxSelected на части сборок Tk (macOS).
        self.voice_input_combo.bind("<FocusOut>", self._on_voice_mode_focus_out)

    def _sync_voice_mode_combo(self) -> None:
        key = self.voice_input_var.get()
        if key not in VOICE_INPUT_MODE_LABELS:
            key = "always"
            self.voice_input_var.set(key)
        try:
            idx = VOICE_INPUT_MODES.index(key)
        except ValueError:
            idx = VOICE_INPUT_MODES.index("always")
            self.voice_input_var.set("always")
        # На macOS без current() выбор может остаться с индексом -1 и следующий клик не сохранится.
        self.voice_input_combo.current(idx)
        self.voice_input_combo.set(VOICE_INPUT_MODE_LABELS[self.voice_input_var.get()])

    def _voice_mode_key_from_ui(self) -> str | None:
        """Режим по индексу списка; при сбое current() на macOS — по тексту строки или StringVar."""
        idx = self.voice_input_combo.current()
        if 0 <= idx < len(VOICE_INPUT_MODES):
            return VOICE_INPUT_MODES[idx]
        displayed = (self.voice_input_combo.get() or "").strip()
        for k, lab in VOICE_INPUT_MODE_LABELS.items():
            if lab == displayed:
                return k
        v = self.voice_input_var.get()
        if v in VOICE_INPUT_MODES:
            return v
        return None

    def _on_voice_mode_combo(self, _event: object | None = None) -> None:
        key = self._voice_mode_key_from_ui()
        if key is None:
            return
        if key in VOICE_INPUT_MODES_UI_DISABLED:
            messagebox.showinfo(
                "Режим недоступен",
                "«Слышу по распознованию твоего голоса» в beta и пока отключён.\n"
                "Выбери другой режим.",
                parent=self.winfo_toplevel(),
            )
            self._sync_voice_mode_combo()
            return
        self.voice_input_var.set(key)
        self._sync_voice_mode_combo()
        self._save_now()

    def _on_voice_mode_focus_out(self, _event: object | None = None) -> None:
        key = self._voice_mode_key_from_ui()
        if key is None or key in VOICE_INPUT_MODES_UI_DISABLED:
            return
        if key != self.voice_input_var.get():
            self.voice_input_var.set(key)
        self._save_now()

    def _build_voice_response_controls(self) -> None:
        row = tk.Frame(self.card, bg=theme.PANEL)
        row.pack(fill="x", padx=12, pady=(10, 2))

        top = tk.Frame(row, bg=theme.PANEL)
        top.pack(fill="x")
        tk.Label(
            top,
            text="Ответ голосом (нейросеть)",
            bg=theme.PANEL,
            fg=theme.TEXT,
            font=("Helvetica", 10, "bold"),
            anchor="w",
        ).pack(side="left")

        self.voice_toggle_btn = tk.Button(
            top,
            text="",
            command=self._toggle_voice_response,
            font=("Helvetica", 9, "bold"),
            relief="flat",
            bd=0,
            padx=10,
            pady=4,
            cursor="hand2",
        )
        self.voice_toggle_btn.pack(side="right")

        model_row = tk.Frame(row, bg=theme.PANEL)
        model_row.pack(fill="x", pady=(5, 0))
        tk.Label(
            model_row,
            text="Модель:",
            bg=theme.PANEL,
            fg=theme.MUTED,
            font=("Helvetica", 10),
        ).pack(side="left")

        option = tk.OptionMenu(model_row, self.voice_response_model_var, *VOICE_OUTPUT_MODELS, command=lambda _v: self._save_now())
        self.voice_model_option = option
        option.configure(
            bg=theme.BG,
            fg=theme.TEXT,
            activebackground=theme.PANEL,
            activeforeground=theme.TEXT,
            highlightthickness=0,
            bd=0,
            font=("Helvetica", 10),
        )
        option["menu"].configure(
            bg=theme.PANEL,
            fg=theme.TEXT,
            activebackground=theme.BG,
            activeforeground=theme.TEXT,
        )
        option.pack(side="left", padx=(8, 0))

        stop_row = tk.Frame(row, bg=theme.PANEL)
        stop_row.pack(fill="x", pady=(10, 0))
        tk.Button(
            stop_row,
            text="Стоп озвучки",
            command=self._request_stop_tts,
            bg="#4a2a2a",
            fg=theme.TEXT,
            activebackground="#6a3a3a",
            activeforeground=theme.TEXT,
            font=("Helvetica", 10, "bold"),
            relief="flat",
            bd=0,
            padx=12,
            pady=6,
            cursor="hand2",
        ).pack(side="left")

        big_audio = tk.Frame(row, bg=theme.PANEL)
        big_audio.pack(fill="x", pady=(12, 0))
        self.voice_audio_big_btn = tk.Button(
            big_audio,
            command=self._toggle_voice_response,
            font=("Helvetica", 11, "bold"),
            relief="flat",
            bd=0,
            padx=12,
            pady=12,
            cursor="hand2",
            wraplength=380,
        )
        self.voice_audio_big_btn.pack(fill="x")

    def _request_stop_tts(self) -> None:
        touch_stop_tts_signal(self._stop_tts_file)

    def _build_computer_control_controls(self) -> None:
        row = tk.Frame(self.card, bg=theme.PANEL)
        row.pack(fill="x", padx=12, pady=(10, 6))
        tk.Label(
            row,
            text="Управление компьютером",
            bg=theme.PANEL,
            fg=theme.TEXT,
            font=("Helvetica", 10, "bold"),
            anchor="w",
        ).pack(side="left")
        self.control_toggle_btn = tk.Button(
            row,
            text="",
            command=self._toggle_computer_control,
            font=("Helvetica", 9, "bold"),
            relief="flat",
            bd=0,
            padx=10,
            pady=4,
            cursor="hand2",
        )
        self.control_toggle_btn.pack(side="right")

    def _build_safe_guard_stub_controls(self) -> None:
        row = tk.Frame(self.card, bg=theme.PANEL)
        row.pack(fill="x", padx=12, pady=(4, 6))
        tk.Label(
            row,
            text="Автовставка текста в активное поле",
            bg=theme.PANEL,
            fg=theme.TEXT,
            font=("Helvetica", 10, "bold"),
            anchor="w",
        ).pack(side="left")
        self.safe_guard_toggle_btn = tk.Button(
            row,
            text="",
            command=self._toggle_safe_guard_stub,
            font=("Helvetica", 9, "bold"),
            relief="flat",
            bd=0,
            padx=10,
            pady=4,
            cursor="hand2",
        )
        self.safe_guard_toggle_btn.pack(side="right")

    def _build_window_topmost_controls(self) -> None:
        row = tk.Frame(self.card, bg=theme.PANEL)
        row.pack(fill="x", padx=12, pady=(10, 6))
        tk.Label(
            row,
            text="Окно поверх других",
            bg=theme.PANEL,
            fg=theme.TEXT,
            font=("Helvetica", 10, "bold"),
            anchor="w",
        ).pack(side="left")
        self.topmost_toggle_btn = tk.Button(
            row,
            text="",
            command=self._toggle_window_topmost,
            font=("Helvetica", 9, "bold"),
            relief="flat",
            bd=0,
            padx=10,
            pady=4,
            cursor="hand2",
        )
        self.topmost_toggle_btn.pack(side="right")

    def _build_hint(self) -> None:
        tk.Label(
            self.card,
            text="Настройки сохраняются автоматически. Режим ввода голосом подхватывает Aya Voice за ~2 с без перезапуска.",
            bg=theme.PANEL,
            fg=theme.MUTED,
            font=("Helvetica", 9),
            anchor="w",
            wraplength=400,
            justify="left",
        ).pack(fill="x", padx=12, pady=(4, 10))

    def _toggle_voice_response(self) -> None:
        self.voice_response_enabled_var.set(not self.voice_response_enabled_var.get())
        self._sync_toggle_visuals()
        self._save_now()

    def _toggle_computer_control(self) -> None:
        self.computer_control_var.set(not self.computer_control_var.get())
        self._sync_toggle_visuals()
        self._save_now()

    def _toggle_safe_guard_stub(self) -> None:
        self.safe_guard_stub_var.set(not self.safe_guard_stub_var.get())
        self._sync_toggle_visuals()
        self._save_now()

    def _toggle_window_topmost(self) -> None:
        self.window_topmost_var.set(not self.window_topmost_var.get())
        try:
            self._topwin.attributes("-topmost", self.window_topmost_var.get())
        except tk.TclError:
            pass
        self._sync_toggle_visuals()
        self._save_now()

    def _sync_toggle_visuals(self) -> None:
        voice_on = self.voice_response_enabled_var.get()
        control_on = self.computer_control_var.get()
        self.voice_toggle_btn.configure(
            text="ВКЛ" if voice_on else "ВЫКЛ",
            bg=theme.GOOD if voice_on else "#3a3a5f",
            fg="#0f1f15" if voice_on else theme.TEXT,
            activebackground=theme.GOOD if voice_on else "#4a4a66",
            activeforeground="#0f1f15" if voice_on else theme.TEXT,
        )
        if hasattr(self, "voice_audio_big_btn"):
            if voice_on:
                self.voice_audio_big_btn.configure(
                    text="🔊 Озвучка ответа: ВКЛ — нажми, чтобы выключить звук",
                    bg=theme.GOOD,
                    fg="#0f1f15",
                    activebackground="#5fd68a",
                    activeforeground="#0f1f15",
                )
            else:
                self.voice_audio_big_btn.configure(
                    text="🔇 Озвучка ответа: ВЫКЛ — ответ в консоли без голоса. Нажми, чтобы включить",
                    bg="#3a3a5f",
                    fg=theme.TEXT,
                    activebackground="#4a4a66",
                    activeforeground=theme.TEXT,
                )
        self.control_toggle_btn.configure(
            text="ВКЛ" if control_on else "ВЫКЛ",
            bg=theme.GOOD if control_on else "#3a3a5f",
            fg="#0f1f15" if control_on else theme.TEXT,
            activebackground=theme.GOOD if control_on else "#4a4a66",
            activeforeground="#0f1f15" if control_on else theme.TEXT,
        )
        safe_guard_on = self.safe_guard_stub_var.get()
        self.safe_guard_toggle_btn.configure(
            text="ВКЛ" if safe_guard_on else "ВЫКЛ",
            bg=theme.WARN if safe_guard_on else "#3a3a5f",
            fg="#2d220a" if safe_guard_on else theme.TEXT,
            activebackground=theme.WARN if safe_guard_on else "#4a4a66",
            activeforeground="#2d220a" if safe_guard_on else theme.TEXT,
        )
        self.voice_model_option.configure(state=("normal" if voice_on else "disabled"))
        top_on = self.window_topmost_var.get()
        self.topmost_toggle_btn.configure(
            text="ВКЛ" if top_on else "ВЫКЛ",
            bg=theme.GOOD if top_on else "#3a3a5f",
            fg="#0f1f15" if top_on else theme.TEXT,
            activebackground=theme.GOOD if top_on else "#4a4a66",
            activeforeground="#0f1f15" if top_on else theme.TEXT,
        )

    def _save_now(self) -> None:
        self._sync_voice_mode_combo()
        self._sync_toggle_visuals()
        settings = QuickSettings(
            voice_input_mode=self.voice_input_var.get(),
            voice_response_enabled=self.voice_response_enabled_var.get(),
            voice_response_model=self.voice_response_model_var.get(),
            computer_control_enabled=self.computer_control_var.get(),
            safe_guard_stub_enabled=self.safe_guard_stub_var.get(),
            window_topmost=self.window_topmost_var.get(),
        )
        self.settings_service.save(settings)
