"""Type recognized text into currently focused macOS input."""

from __future__ import annotations

import subprocess
import time


class FocusedInputTyper:
    """Paste via clipboard + Cmd+V (universal for macOS GUI apps)."""

    # Electron / web views often read the pasteboard after a short delay; restoring
    # the clipboard too early causes empty/wrong paste or odd selection behavior.
    _CLIPBOARD_SETTLE_SEC = 0.12
    _AFTER_PASTE_SEC = 0.2
    _RESTORE_CLIPBOARD_SEC = 2.0

    def __init__(self) -> None:
        self.last_error = ""
        self.last_front_app = ""

    def type_text(self, text: str) -> bool:
        payload = (text or "").strip()
        if not payload:
            self.last_error = "empty payload"
            return False
        self.last_front_app = self._frontmost_app()
        try:
            old_clip = subprocess.run(
                ["pbpaste"],
                capture_output=True,
                check=False,
                timeout=2,
            ).stdout

            subprocess.run(
                ["pbcopy"],
                input=payload.encode("utf-8"),
                check=True,
                timeout=2,
            )
            time.sleep(self._CLIPBOARD_SETTLE_SEC)

            # key code 9 = physical V on US layout; Cmd+V is paste regardless of IME.
            paste_script = (
                "tell application \"System Events\"\n"
                "key code 9 using {command down}\n"
                "end tell"
            )
            ok, _, err = self._run_script(paste_script)
            if not ok:
                raise RuntimeError(err or "paste failed (Accessibility / Automation?)")

            time.sleep(self._AFTER_PASTE_SEC)
            time.sleep(self._RESTORE_CLIPBOARD_SEC)
            subprocess.run(
                ["pbcopy"],
                input=old_clip,
                check=False,
                timeout=2,
            )
            self.last_error = ""
            return True
        except Exception as exc:
            self.last_error = str(exc)
            return False

    def _run_script(self, script: str, *args: str) -> tuple[bool, str, str]:
        try:
            result = subprocess.run(
                ["osascript", "-e", script, *args],
                check=True,
                capture_output=True,
                text=True,
                timeout=5,
            )
            return True, result.stdout.strip(), result.stderr.strip()
        except subprocess.CalledProcessError as exc:
            err = (exc.stderr or "").strip() or str(exc)
            return False, "", err
        except Exception as exc:
            return False, "", str(exc)

    def _frontmost_app(self) -> str:
        script = (
            "tell application \"System Events\"\n"
            "set frontProc to first process whose frontmost is true\n"
            "return name of frontProc\n"
            "end tell"
        )
        try:
            result = subprocess.run(
                ["osascript", "-e", script],
                check=True,
                capture_output=True,
                text=True,
                timeout=2,
            )
            return result.stdout.strip()
        except Exception:
            return ""
