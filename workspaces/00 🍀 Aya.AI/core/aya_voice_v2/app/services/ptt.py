"""Push-to-talk: удержание клавиши (на macOS часто Fn → F18 через Karabiner)."""

from __future__ import annotations

import os


def _key_from_env_name(name: str):
    from pynput.keyboard import Key

    raw = (name or "f18").strip().lower()
    if raw.startswith("f") and raw[1:].isdigit():
        attr = f"f{int(raw[1:])}"
        return getattr(Key, attr, None)
    aliases = {
        "space": Key.space,
        "shift": Key.shift,
        "ctrl": Key.ctrl,
        "alt": Key.alt,
        "cmd": Key.cmd,
        "esc": Key.esc,
    }
    return aliases.get(raw)


class PttGate:
    """Событие «клавиша удерживается» для режима fn_button."""

    def __init__(self) -> None:
        self._held = threading.Event()
        self._listener = None

    def is_held(self) -> bool:
        return self._held.is_set()

    def start(self) -> bool:
        key = _key_from_env_name(os.environ.get("VOICE_PTT_KEY", "f18"))
        if key is None:
            print("⚠️ VOICE_PTT_KEY: неизвестная клавиша, задай f18, f19, space …")
            return False

        try:
            from pynput import keyboard
        except ImportError:
            print("⚠️ Режим «по кнопке»: установи пакет pynput (pip install pynput)")
            return False

        gate = self

        def on_press(k: object) -> None:
            if k == key:
                gate._held.set()

        def on_release(k: object) -> None:
            if k == key:
                gate._held.clear()

        self._listener = keyboard.Listener(on_press=on_press, on_release=on_release)
        self._listener.start()
        print(f"⌨️ Push-to-talk: удерживай клавишу {os.environ.get('VOICE_PTT_KEY', 'f18')} (VOICE_PTT_KEY)")
        return True

    def stop(self) -> None:
        if self._listener is not None:
            try:
                self._listener.stop()
            except Exception:
                pass
            self._listener = None
        self._held.clear()
