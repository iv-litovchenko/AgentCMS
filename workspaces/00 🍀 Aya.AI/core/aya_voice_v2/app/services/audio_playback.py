"""Воспроизведение MP3 через afplay; стоп по файлу из бара. Во время ответа — только сброс буфера микрофона, без «прослушивания»."""

from __future__ import annotations

import atexit
import os
import signal
import subprocess
import threading
import time
from pathlib import Path
from typing import Any, Optional

from app.config import VoiceConfig, assistant_settings_json_path, core_integration_dir
from app.services.voice_input_settings import voice_input_disabled

_active_lock = threading.Lock()
_active_afplay: Optional[subprocess.Popen] = None


def default_stop_signal_path() -> Path:
    return core_integration_dir() / "voice_stop_tts"


def consume_stop_signal(stop_signal: Path) -> bool:
    """Если бар создал файл — удалить и вернуть True (один запрос = один стоп)."""
    if not stop_signal.is_file():
        return False
    try:
        stop_signal.unlink(missing_ok=True)
    except OSError:
        return True
    return True


def stop_active_playback() -> bool:
    """Немедленно остановить текущий afplay (если идёт). Можно вызвать с горячей клавиши / сигнала."""
    global _active_afplay
    with _active_lock:
        proc = _active_afplay
        _active_afplay = None
    if proc is None or proc.poll() is not None:
        return False
    pid = proc.pid
    try:
        if pid is not None and pid > 0 and hasattr(os, "killpg"):
            try:
                os.killpg(pid, signal.SIGTERM)
            except ProcessLookupError:
                return False
            except PermissionError:
                proc.terminate()
        else:
            proc.terminate()
        try:
            proc.wait(timeout=0.6)
        except subprocess.TimeoutExpired:
            if pid is not None and pid > 0 and hasattr(os, "killpg"):
                try:
                    os.killpg(pid, signal.SIGKILL)
                except OSError:
                    proc.kill()
            else:
                proc.kill()
        return True
    except Exception:
        return False


def register_bar_stop_tts_signal() -> None:
    """Бар шлёт `kill -USR1 <pid>` (PID из scripts/run.sh). Обрабатывается даже при долгой блокировке в PyAudio."""

    if not hasattr(signal, "SIGUSR1"):
        return

    def _on_sigusr1(_signum: int, _frame: object) -> None:
        if stop_active_playback():
            print("🔇 Озвучка остановлена (сигнал от бара)")

    signal.signal(signal.SIGUSR1, _on_sigusr1)


def _register_proc(proc: subprocess.Popen) -> None:
    global _active_afplay
    with _active_lock:
        _active_afplay = proc


def _clear_proc(proc: subprocess.Popen) -> None:
    global _active_afplay
    with _active_lock:
        if _active_afplay is proc:
            _active_afplay = None


@atexit.register
def _atexit_stop_playback() -> None:
    stop_active_playback()


def _terminate_proc(proc: subprocess.Popen, msg: str) -> None:
    proc.terminate()
    try:
        proc.wait(timeout=0.8)
    except subprocess.TimeoutExpired:
        proc.kill()
    print(msg)


def _spawn_stop_file_watcher(stop_signal: Path, proc: subprocess.Popen, stopped_by_user: threading.Event) -> threading.Thread:
    """
    Отдельный поток: пока идёт afplay, каждые ~40 ms проверяет voice_stop_tts.
    Иначе пока основной поток блокируется в stream.read(), нажатие кнопки не обрабатывается.
    """

    def _run() -> None:
        while proc.poll() is None:
            time.sleep(0.04)
            if consume_stop_signal(stop_signal):
                stop_active_playback()
                print("🔇 Озвучка остановлена (кнопка в баре)")
                stopped_by_user.set()
                return

    t = threading.Thread(target=_run, name="aya_stop_tts_watcher", daemon=True)
    t.start()
    return t


def play_mp3_blocking(
    path: Path,
    stop_signal: Path | None = None,
    drain_stream: Any | None = None,
    cfg: VoiceConfig | None = None,
    assistant_settings_file: Path | None = None,
) -> bool:
    """
    Воспроизведение до конца; опрос сигнала «стоп» из бара.

    Если заданы drain_stream + cfg: на каждом шаге читаем микрофон и выбрасываем данные
    (антидребезг буфера PyAudio), без анализа речи и без реакции на громкость.

    Returns:
        True если дорожка доигралась, False если остановили по файлу.
    """
    settings_for_policy = assistant_settings_file if assistant_settings_file is not None else assistant_settings_json_path()
    if voice_input_disabled(settings_for_policy):
        print("⏸️ Ввод голосом отключён — воспроизведение не запускаю.")
        return False

    sig = stop_signal or default_stop_signal_path()
    proc = subprocess.Popen(
        ["afplay", str(path)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    _register_proc(proc)
    stopped_by_user = threading.Event()
    watcher = _spawn_stop_file_watcher(sig, proc, stopped_by_user)
    completed = True
    try:
        while proc.poll() is None:
            if voice_input_disabled(settings_for_policy):
                stop_active_playback()
                completed = False
                time.sleep(0.04)
                continue
            if drain_stream is not None and cfg is not None:
                try:
                    drain_stream.read(cfg.chunk, exception_on_overflow=False)
                except Exception:
                    pass
            else:
                time.sleep(0.05)
        else:
            proc.wait()
    finally:
        watcher.join(timeout=0.5)
        _clear_proc(proc)
    if stopped_by_user.is_set():
        completed = False
    return completed
