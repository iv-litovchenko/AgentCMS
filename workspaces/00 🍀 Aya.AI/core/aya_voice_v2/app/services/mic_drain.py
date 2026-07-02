"""Сброс входного буфера PyAudio, пока основной поток в STT/LLM/синтезе (без второго читателя во время afplay)."""

from __future__ import annotations

import threading
from collections.abc import Callable
from typing import Any, Optional


class MicDrainThread:
    """Фоновый read+discard; остановить до того, как основной поток снова читает stream (например play_mp3_blocking)."""

    def __init__(
        self,
        stream: Any,
        chunk: int,
        abort_if: Optional[Callable[[], bool]] = None,
    ) -> None:
        self._stream = stream
        self._chunk = chunk
        self._abort_if = abort_if
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None:
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="aya_mic_drain", daemon=True)
        self._thread.start()

    def _run(self) -> None:
        while not self._stop.is_set():
            if self._abort_if is not None and self._abort_if():
                break
            try:
                self._stream.read(self._chunk, exception_on_overflow=False)
            except Exception:
                break

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=3.0)
            self._thread = None
